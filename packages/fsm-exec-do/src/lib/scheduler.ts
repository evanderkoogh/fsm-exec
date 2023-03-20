import { ActionInvocation, Timer, FiniteStateMachine, Input, State } from '@microlabs/fsm'
import { Effects, EffectsScheduler, Executor } from '@microlabs/fsm-exec'

type Effect = Timer<any> | ActionInvocation

const isPromiseLike = <T>(promise: any): promise is Promise<T> => {
	return !!(promise as Promise<T>).then
}

interface EffectInfo {
	invocationId: string
	timeoutEpoch: number
	effect: Effect
}

class EffectCache {
	private storage: DurableObjectStorage
	private effects: Map<string, EffectInfo> = new Map()

	private constructor(storage: DurableObjectStorage) {
		this.storage = storage
	}

	static async init(storage: DurableObjectStorage): Promise<EffectCache> {
		const cache = new EffectCache(storage)
		await cache.init()
		return cache
	}

	private async init() {
		const results = await this.storage.list<EffectInfo>({ prefix: 'timeouts::invocationId::' })
		for (const effect of results.values()) {
			this.effects.set(effect.invocationId, effect)
		}
	}

	async setEffect(info: EffectInfo) {
		this.effects.set(info.invocationId, info)
		this.storage.put(`timeouts::invocationId::${info.invocationId}`, info)
	}

	async confirmEffect(invocationId: string) {
		this.effects.delete(invocationId)
		this.storage.delete(`timeouts::invocationId::${invocationId}`)
	}

	getUnconfirmedEffects() {
		return this.effects
	}
}

export class DO_Scheduler implements EffectsScheduler<State, Input> {
	private currentAlarmTime: number | undefined
	private readonly effects: EffectCache
	private readonly runningPromises: Map<string, AbortController> = new Map()
	private readonly storage: DurableObjectStorage
	private executor?: Executor<State, Input>

	private constructor(storage: DurableObjectStorage, effects: EffectCache) {
		this.storage = storage
		this.effects = effects
	}

	static async getInstance(storage: DurableObjectStorage, fsm: FiniteStateMachine): Promise<DO_Scheduler> {
		const effects = await EffectCache.init(storage)
		const scheduler = new DO_Scheduler(storage, effects)
		scheduler.init()
		return scheduler
	}

	private async init() {
		this.currentAlarmTime = (await this.storage.getAlarm()) || undefined
		// await this.reconcile()
	}

	setExecutor(executor: Executor<any, any>): void {
		this.executor = executor
	}

	private setTimeout() {
		const timeouts = [...this.effects.getUnconfirmedEffects().values()].map((info) => info.timeoutEpoch)
		const nextTimeout = Math.min(...timeouts)
		if (this.currentAlarmTime !== nextTimeout) {
			this.storage.setAlarm(nextTimeout)
		}
	}

	private run(info: EffectInfo) {
		console.log(`Running: ${info.invocationId}`)
		console.log({ info })
		const abortController = new AbortController()
		this.runningPromises.set(info.invocationId, abortController)
		const promise = new Promise<void>((resolve, reject) => {
			abortController.signal.addEventListener('abort', () => {
				reject(abortController.signal.reason)
			})

			const invocation = info.effect as ActionInvocation
			const action = this.executor?.fsm.actions?.[invocation.actionId]
			if (action) {
				const orPromise = action(invocation.argument)
				if (isPromiseLike<Input | void>(orPromise)) {
					orPromise.then((result) => {
						this.effects.confirmEffect(info.invocationId)
						if (result) {
							this.executor?.execute(result)
						}
					})
				} else if (orPromise) {
					this.effects.confirmEffect(info.invocationId)
					this.executor?.execute(orPromise)
				} else {
					this.effects.confirmEffect(info.invocationId)
				}
			}
			resolve()
		})
		promise.finally(() => {
			this.runningPromises.delete(info.invocationId)
		})
	}

	private reconcile() {
		console.log('Reconciling')
		this.setTimeout()

		const desiredIds = [...this.effects.getUnconfirmedEffects().keys()]
		const currentlyRunningIds = [...this.runningPromises.keys()]
		const toStopIds = currentlyRunningIds.filter((runningId) => !desiredIds.includes(runningId))
		const toStartIds = desiredIds.filter((desiredId) => !currentlyRunningIds.includes(desiredId))

		for (const stopId of toStopIds) {
			this.runningPromises.get(stopId)?.abort('Timeout.')
		}

		for (const startId of toStartIds) {
			const info = this.effects.getUnconfirmedEffects().get(startId)
			if (info) {
				if (startId === 'timer') {
					const timer = info.effect as Timer<any>
					this.executor?.execute(timer)
				} else {
					this.run(info)
				}
			}
		}
	}

	schedule(effects: Effects<any>): Promise<void> {
		console.log('scheduling')
		if (effects.timer) {
			const timeoutEpoch = Date.now() + effects.timer.delayInMs
			this.effects.setEffect({ invocationId: 'timer', timeoutEpoch, effect: effects.timer })
		} else {
			this.effects.confirmEffect('timer')
		}

		for (const invocation of effects.invocations || []) {
			console.log({ invocation })
			const timeout = invocation.timeoutInMs || 60000
			const timeoutEpoch = Date.now() + timeout
			const invocationId = crypto.randomUUID()
			this.effects.setEffect({ invocationId, timeoutEpoch, effect: invocation })
		}

		this.reconcile()
		return Promise.resolve()
	}

	timer() {
		console.log('timer')
		const effects = [...this.effects.getUnconfirmedEffects().values()]
		const timedout = effects.filter((info) => info.timeoutEpoch < Date.now())
		timedout.forEach((info) => {
			if (info.invocationId === 'timer') {
				this.effects.confirmEffect('timer')
				this.executor?.execute((info.effect as Timer<any>).input)
			} else {
				const abortController = this.runningPromises.get(info.invocationId)
				abortController?.abort('Timeout.')
				const invocation = info.effect as ActionInvocation
				const timeout = invocation.timeoutInMs || 60000
				const timeoutEpoch = Date.now() + timeout
				info.timeoutEpoch = timeoutEpoch
				this.effects.setEffect(info)
			}
		})
		this.reconcile()
	}
}
