import { simpleFsm as fsm } from '@microlabs/fsm-examples'
import { createFSM_DO, fetchHandler } from '@microlabs/fsm-exec-do'

export interface Env {
	FSM_DO: DurableObjectNamespace
}

export default {
	fetch: fetchHandler,
}

const TestFsmDO = createFSM_DO(fsm)
export { TestFsmDO }
