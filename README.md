# Finite State Machine Execution Engine

## Introduction to Finite State Machines

Finite State Machines (FSM) are basically a lost art in computer programming these days. Invented halfway through the last century they are both extremely simple and extremely powerful, but mostly forgotten these days.

Finite State Machines is a function that takes both the current state and some input and returns the new state. A light is the canonical example:

```typescript
type BulbState = 'ON' | 'OFF'
type Input = 'TOGGLE' | 'UNPLUG'

const fsm = (state: BulbState, input: Input): BulbState => {
	if (input === 'TOGGLE') {
		return state === 'ON' ? 'OFF' : 'ON'
	} else {
		return 'OFF'
	}
}
```

They are a great way to group all the related logic for a particular entity in one place, they are easy to understand, explain and thus to test as well. And because they are synchronous, they can be used safely in concurrent situations as long as you make sure there is only one state machine running per state.

But this state machine is not able to affect the outside, so we are using slightly more complex state machines. Our state machines can return not just the new state, but also provide output, allows to call custom (async) functions and set a timer with a custom callback. For more information about how to define your Finite State Machines, take a look the [type definition](https://github.com/evanderkoogh/fsm-exec/blob/main/packages/fsm/src/lib/fsm.ts) or our [microwave examples](https://github.com/evanderkoogh/fsm-exec/blob/main/examples/fsm-examples/src/lib/microwave.ts).

## Getting started

### Creating a Finite State Machine

To start with the simplest state machine, we can take the code above for the light and tweak it slightly because we don't just return the state, but we can also return any of the other directives.

```typescript
type BulbState = 'ON' | 'OFF'
type Input = 'TOGGLE' | 'UNPLUG'

const fsm = (state: BulbState, input: Input): BulbState => {
	if (input === 'TOGGLE') {
		const state === 'ON' ? 'OFF' : 'ON'
		return { state }
	} else {
		return {state: 'OFF' }
	}
}
```

### Create an Executor

To create an executor, we first need to create a `Scheduler` to handle all the asynchronous stuff. A simple in-memory scheduler is provided in the `fsm-exec` package. It is not recommended to use this in production if you need your asynchronous operations to automatically retry after crashes or shutdowns. Look at the Cloudflare Durable Object scheduler explained below.

Once we have a `Scheduler`, we can create an `Executor`

```typescript
const scheduler = new InMemoryScheduler(fsm)
const executor = new Executor(fsm, scheduler)
```

If you want to pass in a state that is not the Finite State Machine's initial state, you can pass that as one of the `ExecutorOptions` as the third argument.

### Subscribing to Updates and Output

When you create an Executor, you can register two callbacks, one for updates and one for any output of the state machine. The `UpdateListener` is notified of any execution of the state machine with the input, old state and the new state. Its primary usage is for system level supporting functions such as saving the latest state to durable storage, logging, auditing and debugging for example.

The `OutputListener` is meant for entities interested in the output of the state machine. You could use it for example to pass events to a queue or messages between child and parent state machines.

```typescript
import { Input, microwave, Output, State } from '@microlabs/fsm-examples'
import { Executor, InMemoryScheduler, OutputListener, StateUpdateListener } from '@microlabs/fsm-exec'

const scheduler = new InMemoryScheduler(microwave)
const updateListener: StateUpdateListener<State, Input> = (msg) => {
	console.log('Update:', { msg })
}
const outputListener: OutputListener<Output> = (msg) => {
	console.log('Output:', { msg })
}
const executor = new Executor(microwave, scheduler, { outputListener, updateListener })
executor.execute({ direction: 'UP', adjustment: 5 })
executor.execute('start')
```

### Deploying to production

The biggest challenge with hosting state machines in production is that you while a state machine itself is safe to be called concurrently, it does mean that there can only ever be one state machine running at any given time for every unique state.

Fortunately Cloudflare's Durable Objects are a perfect match for this, because they guarantee that for every unique ID, there will only ever be one Javascript event loop running. Exactly what you need for a Finite State Machine execution engine.

So the `@microlabs/fsm-exec-do` package has a bunch of helper methods to make it easy to deploy to the Cloudflare Developer platform.

The Durable Object that is created by the library will automatically save any changes to the state.
And as long as the arguments to your `ActionInvocations` are able to be represented in JSON, the invocations will be automatically timed out and retried, even in the face of crashes or shutdowns.

And finally, because the timer is durable as well, you can set a timer for hours, days, months or even years into the future and still get a callback at the correct time.

To get you started, this is all the code you need:

```typescript
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
```

And your `wrangler.toml` should be something like:

```
name = "fsm-exec-do-examples"
main = "src/index.ts"
compatibility_date = "2023-03-20"

[durable_objects]
bindings = [
  { name = "FSM_DO", class_name = "TestFsmDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["TestFsmDO"]
```

The `fetchHandler` from the `@microlabs/fsm-exec-do` package is just a simple pass-through. If you want to make any changes to your external API, you can easily take that code and adapt it.

## TODOs

- Lots more documentation, at least a README.md for every package.
- Expose both the UpdateListener and OutputListener via Websockets in the Durable Object package & example.
