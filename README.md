# Bime

A simple promise-based RPC library.

## Features

- Full Typescript support
- Easily expose functions to be called remotely
- Promise-based
- Model-driven

## Listen for Invocations

Expose a model for other windows to call:

```ts
let count = 0
const increment = () => ++count
const decrement = () => --count
const setCount = (newCount: number) => (count = newCount)

// expose functions for other windows to call
const model = { increment, decrement, setCount }

// listen for invocations
const listener = bime.listen(model, "*")

// stop listening when you're done
listener.cleanup()
```

## Call Remote Functions

Call remote functions exposed by another window:

```ts
type RemoteModel = {
  increment: () => number
  decrement: () => number
  setCount: (newCount: number) => void
}

// get a reference to the iframe we want to talk to
const remoteWindow = (document.getElementById("iframe") as HTMLIFrameElement)
  .contentWindow as Window

// get ready to call remote functions and listen for responses
const remote = bime.remote<RemoteModel>(remoteWindow, "*")

// call remote function
remote.setCount(5)

// call remote function and get a response
const newCount = await remote.increment()
console.log(newCount) // 6

// stop listening for responses when you're done
remote.cleanup()
```
