import { simpleFsm as fsm } from '@microlabs/fsm-examples'
import { Executor, InMemoryScheduler, StateUpdateListener } from '@microlabs/fsm-exec'

const run = async () => {
	const scheduler = new InMemoryScheduler(fsm)
	const listener: StateUpdateListener<number, string> = (msg) => {
		console.log({ msg })
	}
	const executor = new Executor(fsm, scheduler, { listener, state: 2 })
	const result = await executor.execute('4')
	console.log({ result })
}

run()
