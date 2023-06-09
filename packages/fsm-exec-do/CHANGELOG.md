# @microlabs/fsm-exec-do

## 0.4.0

### Minor Changes

- Moved error handling from the FSM to the exec package.

### Patch Changes

- Updated dependencies
  - @microlabs/fsm-exec@0.4.0
  - @microlabs/fsm@0.3.0

## 0.3.0

### Minor Changes

- Made small changes in the Finite State Machine definition:

  - timeoutInMs and delayInMs are now timeout and delay respectively. Everything is always in milliseconds.
  - onError(error) has been split into onExecutionError and onInvocationError and now includes all the input that led to the error.
  - Added retry instructions to both Action definitions and Invocations. Invocation instructions will always take priority over the options specified in the ActionDefinition.

### Patch Changes

- Updated dependencies
  - @microlabs/fsm-exec@0.3.0
  - @microlabs/fsm@0.2.0

## 0.2.0

### Minor Changes

- 94b3b84: Fixed the return value of execute

### Patch Changes

- b525455: Move all compilation of Javascript to CommonJS to make things easier.
- Updated dependencies [b525455]
- Updated dependencies [49c93c2]
  - @microlabs/fsm-exec@0.2.1
  - @microlabs/fsm@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [5193478]
  - @microlabs/fsm-exec@0.2.0

## 0.1.0

### Minor Changes

- 5d67a0d: Added the ability to return output from a StateMachine.

### Patch Changes

- Updated dependencies [5d67a0d]
  - @microlabs/fsm-exec@0.1.0
  - @microlabs/fsm@0.1.0
