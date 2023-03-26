import { State, FiniteStateMachine, Input } from '@microlabs/fsm'
import { Effects, EffectsScheduler, Executor } from './executor'

export class InMemoryScheduler<S extends State, I extends Input> implements EffectsScheduler<S, I> {
	private executor?: Executor<S, I>
	private timeoutId: any

	constructor(private readonly fsm: FiniteStateMachine<S, I>) {}

	setExecutor(executor: Executor<S, I>): void {
		this.executor = executor
	}

	async schedule(effects: Effects<I>) {
		const { timer, invocations } = effects

		clearTimeout(this.timeoutId)
		this.timeoutId = undefined
		if (timer) {
			this.timeoutId = setTimeout(() => {
				this.executor?.execute(timer.input)
			}, timer.delay)
		}

		if (Array.isArray(invocations)) {
			const promises = invocations.map((invocation) => {
				//TODO: Do AbortSignal stuff.
				return new Promise<void>(async (resolve, reject) => {
					const { actionId, argument, timeout } = invocation
					const action = this.fsm.actions?.[actionId]
					if (action) {
						const fn = typeof action === 'function' ? action : action.action
						const result = await fn(argument)
						if (result && this.executor) {
							this.executor.execute(result)
						}
					} else {
						reject(`Function with actionId: "${actionId}" does not exist.`)
					}
					resolve()
				})
			})
			await Promise.all(promises)
		}
	}
}
