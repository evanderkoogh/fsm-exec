export type Input = string | number | object
export type Output = string | number | object
export type State = string | number | object

type IntervalFunction = (attempt: number) => number
type RetryIntervalOption = number | 'exponential' | IntervalFunction

export interface RetryOptions {
	interval: RetryIntervalOption
	maxRetries?: number
}

type PromiseOr<T> = T | Promise<T>
export type ActionFn<I> = (arg: any) => PromiseOr<I | void>
export interface ActionDefinition<I> {
	action: ActionFn<I>
	timeout?: number
	retries?: RetryOptions
}
export type Action<I> = ActionFn<I> | ActionDefinition<I>

export interface ActionInvocation {
	actionId: string
	argument?: any
	timeout?: number
	retries?: RetryOptions
}

export interface Timer<I> {
	delay: number
	input: I
}

export interface Results<S extends State, I extends Input, O extends Output> {
	state: S
	invocations?: ActionInvocation[]
	output?: O
	timer?: Timer<I>
}

export interface FiniteStateMachine<S extends State = State, I extends Input = Input, O extends Output = Output> {
	actions?: Record<string, Action<I>>
	fn(state: S, input: I): Results<S, I, O>
	initialState: S
}

const TEN_MINUTES = 10 * 60 * 1000
const EXPONENTIAL_BACKOFF: IntervalFunction = (attempt) => {
	return Math.max(1000 * Math.pow(2, attempt), TEN_MINUTES)
}

export function getInterval(opts: RetryIntervalOption, attempt: number): number {
	if (typeof opts === 'number') {
		return opts
	} else if (typeof opts === 'function') {
		return opts(attempt)
	} else if (typeof opts === 'string' && opts === 'exponential') {
		return EXPONENTIAL_BACKOFF(attempt)
	} else {
		throw new TypeError('Unknown interval option.')
	}
}
