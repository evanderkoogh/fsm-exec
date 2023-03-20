export type Input = string | number | object;
export type State = string | number | object;

type PromiseOr<T> = T | Promise<T>;
export type Action<I> = (arg: any) => PromiseOr<I | void>;

export interface ActionInvocation {
	actionId: string;
	argument: any;
	timeoutInMs?: number;
}

export interface Timer<I> {
	delayInMs: number;
	input: I;
}

export interface Results<S extends State, I extends Input> {
	state: S;
	invocations?: ActionInvocation[];
	timer?: Timer<I>;
}

export interface FiniteStateMachine<S extends State = State, I extends Input = Input> {
	actions?: Record<string, Action<I>>;
	fn(state: S, input: I): Results<S, I>;
	initialState: S;
	onError?(error: any): Promise<void>;
}
