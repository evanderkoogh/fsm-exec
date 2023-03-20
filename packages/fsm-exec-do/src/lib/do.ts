import { match } from 'path-to-regexp'

import { FiniteStateMachine, Input, State } from '@microlabs/fsm'
import { Executor, StateUpdateListener } from '@microlabs/fsm-exec'
import { DO_Scheduler } from './scheduler'

type DO_Env = Record<string, any>

export abstract class FSM_DO_Base<S extends State, I extends Input, E extends DO_Env> implements DurableObject {
	protected env: E
	private executor?: Executor<S, I>
	protected fsm: FiniteStateMachine<S, I>
	private scheduler?: DO_Scheduler
	protected storage: DurableObjectStorage
	constructor(state: DurableObjectState, env: E, fsm: FiniteStateMachine<S, I>) {
		this.env = env
		this.fsm = fsm
		this.storage = state.storage
		const listener: StateUpdateListener<S, I> = async (msg) => {
			console.log({ msg })
			this.storage.put('root::state', msg.newState)
		}
		state.blockConcurrencyWhile(async () => {
			let state = await this.storage.get<S | undefined>('root::state')
			const scheduler = await DO_Scheduler.getInstance(this.storage, fsm)
			this.scheduler = scheduler
			this.executor = new Executor(this.fsm, scheduler, { listener, state })
		})
	}

	get state(): S {
		if (this.executor) {
			return this.executor.state
		} else {
			throw new Error('Could not instantiate the executor.')
		}
	}

	async execute(input: I): Promise<S> {
		if (this.executor) {
			return this.executor.execute(input)
		} else {
			throw new Error('Could not instantiate the executor.')
		}
	}

	abstract fetch(request: Request<unknown>): Response | Promise<Response>

	alarm(): void | Promise<void> {
		this.scheduler?.timer()
	}
}

export type DO_class = {
	new (state: DurableObjectState, env: any, ...args: any[]): DurableObject
}

interface ExecutePayload<I extends Input> {
	input: I
}

export function createFSM_DO<S extends State, I extends Input, Env extends DO_Env = any>(
	fsm: FiniteStateMachine<S, I>
): DO_class {
	return class FSMDurableObject extends FSM_DO_Base<S, I, Env> {
		constructor(state: DurableObjectState, env: Env) {
			super(state, env, fsm)
		}

		async fetch(request: Request<unknown>): Promise<Response> {
			const pathname = new URL(request.url).pathname
			if (pathname === '/state') {
				return Response.json(this.state)
			} else if (pathname === '/execute') {
				const body = await request.json<ExecutePayload<I>>()
				const result = await this.execute(body.input)
				return Response.json(result)
			} else {
				return new Response('Not Found.', { status: 404 })
			}
		}
	}
}

type DefaultEnv = {
	FSM_DO: DurableObjectNamespace
}

interface IdParams {
	id: string
	operation?: string
}
const idPath = match<IdParams>('/fsm/:id/:operation(state|execute)?', {
	decode: decodeURIComponent,
})

const fetchHandler: ExportedHandlerFetchHandler<DefaultEnv> = async (req, env, ctx) => {
	const pathname = new URL(req.url).pathname
	const results = idPath(pathname)
	if (results) {
		const { id, operation } = results.params
		console.log({ id, operation })
		const doId = env.FSM_DO.idFromName(id)
		const stub = env.FSM_DO.get(doId)
		const doRequest = new Request(`https://non-existant/${operation}`, req)
		return await stub.fetch(doRequest)
	} else {
		return new Response('Not Found.', { status: 404 })
	}
}

export { fetchHandler }
