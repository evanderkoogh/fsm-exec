# @microlabs/fsm

## 0.2.0

### Minor Changes

- Made small changes in the Finite State Machine definition:

  - timeoutInMs and delayInMs are now timeout and delay respectively. Everything is always in milliseconds.
  - onError(error) has been split into onExecutionError and onInvocationError and now includes all the input that led to the error.
  - Added retry instructions to both Action definitions and Invocations. Invocation instructions will always take priority over the options specified in the ActionDefinition.

## 0.1.1

### Patch Changes

- b525455: Move all compilation of Javascript to CommonJS to make things easier.
- 49c93c2: If your invocation does not have an argument, you don't need to specify an argument in the ActionInvocation anymore

## 0.1.0

### Minor Changes

- 5d67a0d: Added the ability to return output from a StateMachine.
