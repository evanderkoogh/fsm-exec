import { FiniteStateMachine } from '@microlabs/fsm'

const simpleFsm: FiniteStateMachine<number, string, string> = {
	actions: {
		double: (arg: number) => {
			return arg.toString()
		},
		triple: (arg: number) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve((arg * 2).toString())
				}, 2000)
			})
		},
	},
	initialState: 0,
	fn: function (state, input) {
		const i = parseInt(input)
		state = state + i
		const invocations = state > 10 ? [] : [{ actionId: 'triple', argument: state }]
		return { state, invocations, output: state.toFixed(2) }
	},
	onExecutionError(state, input, error) {
		console.log('ERROR while executing state machine:')
		console.log({ state, input, error })
	},
	onInvocationError(actionId, argument, error) {
		console.log('ERROR while executing state machine:')
		console.log({ actionId, argument, error })
	},
}

export { simpleFsm }
