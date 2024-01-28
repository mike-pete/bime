# Bime

A super simple [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) abstraction for communicating between windows.

## Features

- expose functions to be called remotely
- automatic retry
- promises
- typescript support

## Listen for Invocations

Expose a model for other windows to call:

```ts
let count = 0
const increment = () => ++count
const decrement = () => --count
const setCount = (newCount: number) => (count = newCount)

// expose functions
const model = { increment, decrement, setCount }

// listen for invocations
const listener = bime.listen(model)

// stop listening when you're done
listener.cleanup()
```

## Invoke Remote Functions
Remotely invoke functions exposed by another window:
```ts
type RemoteModel = {
	increment: () => number
	decrement: () => number
	setCount: (newCount: number) => void
}

// get a reference to the iframe we want to talk to
const targetWindow = (document.getElementById('iframe') as HTMLIFrameElement).contentWindow as Window

// get ready to invoke remote functions and listen for responses
const target = bime.target<RemoteModel>(targetWindow)

// invoke remote function
target.setCount(5)

// invoke remote function and get a response
const newCount = await target.increment()
console.log(newCount) // 6

// stop listening for responses when you're done
target.cleanup()
```