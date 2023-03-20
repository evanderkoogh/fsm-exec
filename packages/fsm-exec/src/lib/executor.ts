import { State, Input, Timer, ActionInvocation, FiniteStateMachine } from '@microlabs/fsm'

interface StateUpdatedMessage<S extends State, I extends Input> {
	input: I
	oldState: S
	newState: S
}

export type StateUpdateListener<S extends State, I extends Input> = (msg: StateUpdatedMessage<S, I>) => void

export interface Effects<I extends Input> {
	timer?: Timer<I>
	invocations?: ActionInvocation[]
}

export interface EffectsScheduler<S extends State, I extends Input> {
	setExecutor(executor: Executor<S, I>): void
	schedule(effects: Effects<I>): Promise<void>
}

interface ExecutorOptions<S extends State, I extends Input> {
	listener?: StateUpdateListener<S, I>
	state?: S
}

export class Executor<S extends State = State, I extends Input = Input> {
	readonly fsm: FiniteStateMachine<S, I>
	private state_: S
	private scheduler: EffectsScheduler<S, I>
	private listener?: StateUpdateListener<S, I>
	constructor(fsm: FiniteStateMachine<S, I>, scheduler: EffectsScheduler<S, I>, opts?: ExecutorOptions<S, I>) {
		this.fsm = fsm
		this.scheduler = scheduler
		this.scheduler.setExecutor(this)
		this.listener = opts?.listener
		this.state_ = opts?.state ? opts.state : fsm.initialState
	}

	get state(): S {
		return this.state_
	}

	private notifyUpdate(input: I, oldState: S, newState: S) {
		if (this.listener) {
			//TODO: do deep compare
			const update = {
				input,
				oldState,
				newState,
			}
			this.listener(update)
		}
	}

	private async _execute(input: I): Promise<void> {
		const { state, invocations, timer } = this.fsm.fn(this.state, input)
		const oldState = this.state_
		this.state_ = state
		this.notifyUpdate(input, oldState, state)
		await this.scheduler.schedule({ invocations, timer })
	}

	public async execute(input: I): Promise<S> {
		try {
			await this._execute(input)
		} catch (err) {
			const log = this.fsm.onError || console.log
			await log(err)
		}
		return this.state
	}
}
