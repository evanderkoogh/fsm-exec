import { simpleFsm as fsm } from '@microlabs/fsm-examples'
import { Executor, InMemoryScheduler, OutputListener, UpdateListener } from '@microlabs/fsm-exec'

const run = async () => {
	const scheduler = new InMemoryScheduler(fsm)
	const updateListener: UpdateListener = (msg) => {
		console.log('Update:', { msg })
	}
	const outputListener: OutputListener = (msg) => {
		console.log('Output:', { msg })
	}
	const executor = new Executor(fsm, scheduler, { outputListener, updateListener, state: 2 })
	const result = await executor.execute('4')
	console.log({ result })
}

run()
