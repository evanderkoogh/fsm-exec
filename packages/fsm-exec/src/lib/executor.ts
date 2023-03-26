import { State, Input, Output, Timer, ActionInvocation, FiniteStateMachine } from '@microlabs/fsm'

type OrPromise<T> = T | Promise<T>

interface StateUpdatedMessage<S extends State, I extends Input> {
	input: I
	oldState: S
	newState: S
}

export type StateUpdateListener<S extends State, I extends Input> = (msg: StateUpdatedMessage<S, I>) => OrPromise<void>

export type OutputListener<O extends Output> = (msg: O) => OrPromise<void>

export interface Effects<I extends Input> {
	timer?: Timer<I>
	invocations?: ActionInvocation[]
}

export interface EffectsScheduler<S extends State, I extends Input> {
	setExecutor(executor: Executor<S, I, any>): void
	schedule(effects: Effects<I>): Promise<void>
}

interface ExecutorOptions<S extends State, I extends Input, O extends Output> {
	updateListener?: StateUpdateListener<S, I>
	outputListener?: OutputListener<O>
	state?: S
}

export interface ExecuteSuccessResult<S extends State, O extends Output> {
	state: S
	output?: O
}

export interface ExecuteFailedResult<S extends State, I extends Input> {
	error: any
	state: S
	input: I
}

export interface _ExecuteResult<S extends State, O extends Output> {
	state: S
	output?: O
	promise: Promise<unknown>
}

export type ExecuteResult<S extends State, I extends Input, O extends Output> =
	| ExecuteSuccessResult<S, O>
	| ExecuteFailedResult<S, I>

export interface ExecuteOptions {
	wait?: boolean
}

export class Executor<S extends State = State, I extends Input = Input, O extends Output = Output> {
	readonly fsm: FiniteStateMachine<S, I, O>
	private state_: S
	private scheduler: EffectsScheduler<S, I>
	private outputListener?: OutputListener<O>
	private updateListener?: StateUpdateListener<S, I>
	constructor(fsm: FiniteStateMachine<S, I, O>, scheduler: EffectsScheduler<S, I>, opts?: ExecutorOptions<S, I, O>) {
		this.fsm = fsm
		this.scheduler = scheduler
		this.scheduler.setExecutor(this)
		this.outputListener = opts?.outputListener
		this.updateListener = opts?.updateListener
		this.state_ = opts?.state ? opts.state : fsm.initialState
	}

	get state(): S {
		return this.state_
	}

	private notifyUpdate(input: I, oldState: S, newState: S) {
		if (this.updateListener) {
			//TODO: do deep compare
			const update = {
				input,
				oldState,
				newState,
			}
			this.updateListener(update)
		}
	}

	private _execute(input: I): _ExecuteResult<S, O> {
		const { state, invocations, output, timer } = this.fsm.fn(this.state, input)
		const oldState = this.state_
		this.state_ = state
		this.notifyUpdate(input, oldState, state)
		if (output && this.outputListener) {
			this.outputListener(output)
		}
		const promise = this.scheduler.schedule({ invocations, timer })
		return { state, output, promise }
	}

	public async execute(input: I, opts?: ExecuteOptions): Promise<ExecuteResult<S, I, O>> {
		const old_state = this.state
		try {
			const { state, output, promise } = this._execute(input)
			if (opts && opts.wait) {
				await promise
				return { state: this.state }
			} else {
				return { state, output }
			}
		} catch (err) {
			const log = this.fsm.onExecutionError || console.log
			await log(old_state, input, err)
			return { error: err, state: old_state, input }
		}
	}
}
