import { FiniteStateMachine, Results } from '@microlabs/fsm'

export interface State {
	mode: 'STOPPED' | 'PAUSED' | 'RUNNING'
	powerLevel: 'LOW' | 'MEDIUM' | 'HIGH'
	timer: number
}

export interface TimerAdjustment {
	direction: 'UP' | 'DOWN'
	adjustment: 5 | 30
}

const isTimerAdjustment = (input: Input): input is TimerAdjustment => {
	return !!(input as TimerAdjustment).adjustment
}

export type Input = TimerAdjustment | 'powerUp' | 'powerDown' | 'start' | 'stop' | 'tick'

export type Output = 'CHIME' | 'BEEP'

const initialState: State = {
	mode: 'STOPPED',
	powerLevel: 'MEDIUM',
	timer: 0,
}

const handleStart = (state: State, _input: Input): Results<State, Input, Output> => {
	const { powerLevel, timer } = state
	if (timer > 0) {
		return {
			state: { mode: 'RUNNING', powerLevel, timer },
			invocations: [{ actionId: 'start' }],
			timer: { delayInMs: 1000, input: 'tick' },
		}
	} else {
		return { state, output: 'BEEP' }
	}
}

const handleStopped = (state: State, input: Input): Results<State, Input, Output> => {
	let { powerLevel, timer } = state
	if (isTimerAdjustment(input)) {
		if (input.direction === 'UP') {
			timer = Math.min(timer + input.adjustment, 3600)
		} else {
			timer = Math.max(timer - input.adjustment, 0)
		}
		return { state: { ...state, timer } }
	} else if (input === 'powerDown') {
		if (powerLevel === 'HIGH') {
			powerLevel = 'MEDIUM'
		} else {
			powerLevel = 'LOW'
		}
		return { state: { ...state, powerLevel } }
	} else if (input === 'powerUp') {
		if (powerLevel === 'LOW') {
			powerLevel = 'MEDIUM'
		} else {
			powerLevel = 'HIGH'
		}
		return { state: { ...state, powerLevel } }
	} else if (input === 'start') {
		return handleStart(state, input)
	} else if (input === 'stop') {
		return { state: initialState }
	} else {
		return { state, output: 'BEEP' }
	}
}

const handlePaused = (state: State, input: Input): Results<State, Input, Output> => {
	if (input === 'stop') {
		return { state: { ...state, mode: 'STOPPED' } }
	} else if (input === 'start') {
		return handleStart(state, input)
	} else {
		return { state, output: 'BEEP' }
	}
}

const handleRunning = (state: State, input: Input): Results<State, Input, Output> => {
	if (input === 'stop') {
		return { state: { ...state, mode: 'PAUSED' }, invocations: [{ actionId: 'stop' }] }
	} else if (input === 'tick') {
		const timer = state.timer - 1
		if (timer === 0) {
			const newState = { mode: 'STOPPED', timer: 0, powerLevel: state.powerLevel } as const
			return { state: newState, invocations: [{ actionId: 'stop' }], output: 'CHIME' }
		} else {
			return { state: { ...state, timer }, timer: { delayInMs: 1000, input: 'tick' } }
		}
	} else {
		return { state, timer: { delayInMs: 1000, input: 'tick' }, output: 'BEEP' }
	}
}

const microwave: FiniteStateMachine<State, Input, Output> = {
	actions: {
		start: () => {
			console.log('Starting to micro all the waves')
		},
		stop: () => {
			console.log('Stopping to micro all the waves')
		},
	},
	fn: function (state: State, input: Input): Results<State, Input, Output> {
		if (state.mode === 'PAUSED') {
			return handlePaused(state, input)
		} else if (state.mode === 'STOPPED') {
			return handleStopped(state, input)
		} else if (state.mode === 'RUNNING') {
			return handleRunning(state, input)
		} else {
			return { state, output: 'BEEP' }
		}
	},
	initialState,
}

export { microwave }
