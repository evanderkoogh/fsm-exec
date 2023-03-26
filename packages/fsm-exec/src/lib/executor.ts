import { State, Input, Output, Timer, ActionInvocation, FiniteStateMachine, Results } from '@microlabs/fsm'

type OrPromise<T> = T | Promise<T>

export interface ExecutionSuccessMessage {
	type: 'ExecutionSuccess'
	isError: false
	oldState: State
	input: Input
	newState: State
	output?: Output
	timer?: Timer<Input>
	invocations?: ActionInvocation[]
}

export function isExecutionSuccessMessage(msg: UpdateMessage): msg is ExecutionSuccessMessage {
	return msg.type === 'ExecutionSuccess'
}

export interface ExecutionErrorMessage {
	type: 'ExecutionError'
	isError: true
	error: any
	oldState: State
	input: Input
}

export type UpdateMessage = ExecutionSuccessMessage | ExecutionErrorMessage

export type ErrorMessage = ExecutionErrorMessage

export type UpdateListener = (msg: UpdateMessage) => OrPromise<void>

export type OutputListener<O extends Output = Output> = (msg: O) => OrPromise<void>

export type ErrorListener = (msg: ErrorMessage) => OrPromise<void>

export interface Effects {
	timer?: Timer<Input>
	invocations?: ActionInvocation[]
}

export interface EffectsScheduler {
	setExecutor(executor: Executor<State>): void
	schedule(effects: Effects): Promise<void>
}

interface ExecutorOptions<S extends State> {
	errorListener?: ErrorListener
	updateListener?: UpdateListener
	outputListener?: OutputListener
	state?: S
}

export interface ExecuteSuccessResult {
	state: State
	output?: Output
}

export interface ExecuteFailedResult {
	error: any
	state: State
	input: Input
}

export type ExecuteResult = ExecuteSuccessResult | ExecuteFailedResult

export class Executor<S extends State> {
	readonly fsm: FiniteStateMachine<S>
	private state_: S
	private scheduler: EffectsScheduler
	private errorListener?: ErrorListener
	private outputListener?: OutputListener
	private updateListener?: UpdateListener
	constructor(fsm: FiniteStateMachine<S>, scheduler: EffectsScheduler, opts?: ExecutorOptions<S>) {
		this.fsm = fsm
		this.scheduler = scheduler
		this.scheduler.setExecutor(this)
		this.errorListener = opts?.errorListener
		this.outputListener = opts?.outputListener
		this.updateListener = opts?.updateListener
		this.state_ = opts?.state ? opts.state : fsm.initialState
	}

	get state(): S {
		return this.state_
	}

	private notifySuccess(oldState: S, input: Input, results: Results<State, Input, Output>) {
		if (results.output && this.outputListener) {
			this.outputListener(results.output)
		}

		if (this.updateListener) {
			const msg: ExecutionSuccessMessage = {
				type: 'ExecutionSuccess',
				isError: false,
				oldState,
				input,
				newState: results.state,
				output: results.output,
				timer: results.timer,
				invocations: results.invocations,
			} as const
			this.updateListener(msg)
		}
	}

	private notifyFailure(error: any, oldState: State, input: Input) {
		const msg: ExecutionErrorMessage = {
			type: 'ExecutionError',
			isError: true,
			error,
			oldState,
			input,
		} as const
		if (this.updateListener) {
			this.updateListener(msg)
		}
		if (this.errorListener) {
			this.errorListener(msg)
		}
	}

	public execute(input: Input): ExecuteResult {
		const oldState = this.state
		try {
			const results = this.fsm.fn(this.state, input)
			this.notifySuccess(oldState, input, results)
			const { state, invocations, output, timer } = results
			this.scheduler.schedule({ invocations, timer })
			return { state, output }
		} catch (error) {
			this.notifyFailure(error, oldState, input)
			return { error, state: oldState, input }
		}
	}
}
