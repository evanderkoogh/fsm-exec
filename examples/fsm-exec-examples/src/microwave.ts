import { microwave } from '@microlabs/fsm-examples'
import { Executor, InMemoryScheduler, OutputListener, UpdateListener } from '@microlabs/fsm-exec'

const scheduler = new InMemoryScheduler(microwave)
const updateListener: UpdateListener = (msg) => {
	console.log('Update:', { msg })
}
const outputListener: OutputListener = (msg) => {
	console.log('Output:', { msg })
}
const executor = new Executor(microwave, scheduler, { outputListener, updateListener })
executor.execute({ direction: 'UP', adjustment: 30 })
executor.execute('stop')
executor.execute({ direction: 'DOWN', adjustment: 5 })
executor.execute({ direction: 'UP', adjustment: 5 })
executor.execute('powerDown')
executor.execute('powerUp')
executor.execute('start')
