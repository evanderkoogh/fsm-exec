import { simpleFsm as fsm } from '@microlabs/fsm-examples'
import { Executor, InMemoryScheduler, OutputListener, StateUpdateListener } from '@microlabs/fsm-exec'

const run = async () => {
	const scheduler = new InMemoryScheduler(fsm)
	const updateListener: StateUpdateListener<number, string> = (msg) => {
		console.log('Update:', { msg })
	}
	const outputListener: OutputListener<string> = (msg) => {
		console.log('Update:', { msg })
	}
	const executor = new Executor(fsm, scheduler, { outputListener, updateListener, state: 2 })
	const result = await executor.execute('4')
	console.log({ result })
}

run()
