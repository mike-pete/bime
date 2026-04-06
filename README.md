# Bime

A typesafe, promise-based RPC library for message passing between JavaScript contexts.

Define your API once, then call remote functions as if they were local — with full TypeScript inference on both sides.

## Install

```bash
bun add @mike.pete/bime
```

## Quick Start

Bime has two sides: **listen** (exposes functions) and **invoke** (calls them remotely). Both communicate over any string-based message channel.

```ts
import { listen, invoke } from "@mike.pete/bime";

// 1. Define your API as a plain object
const model = {
  greet: (name: string) => `Hello, ${name}!`,
  sum: (a: number, b: number) => a + b,
};

// 2. Listen for incoming calls
listen({ model, listener, sender });

// 3. Invoke from the other side — fully typed
const api = invoke<typeof model>({ listener, sender });

await api.greet("World"); // "Hello, World!"
await api.sum(1, 2);      // 3
```

Every call returns a `Promise`, even if the original function is synchronous. Async functions are not double-wrapped.

## Transport

Bime is transport-agnostic. You provide two functions:

- **`listener`** — subscribes to incoming messages and returns a cleanup function
- **`sender`** — sends a message string to the other side

```ts
type MessageListenerWithCleanup = (
  handler: (message: string) => void,
) => () => void;

type MessageSender = (message: string) => void;
```

### Example: BroadcastChannel

```ts
const channel = new BroadcastChannel("my-channel");

const listener = (handler: (message: string) => void) => {
  const cb = (e: MessageEvent) => handler(e.data);
  channel.addEventListener("message", cb);
  return () => channel.removeEventListener("message", cb);
};

const sender = (message: string) => channel.postMessage(message);
```

### Example: Window postMessage

```ts
const listener = (handler: (message: string) => void) => {
  const cb = (e: MessageEvent) => handler(e.data);
  window.addEventListener("message", cb);
  return () => window.removeEventListener("message", cb);
};

const sender = (message: string) =>
  targetWindow.postMessage(message, "*");
```

## Error Handling

Errors thrown in model functions are forwarded to the invoke side:

```ts
const model = {
  divide: (a: number, b: number) => {
    if (b === 0) throw new Error("Cannot divide by zero");
    return a / b;
  },
};

listen({ model, listener, sender });

const api = invoke<typeof model>({ listener, sender });

await api.divide(10, 0); // rejects with Error("Cannot divide by zero")
```

This works the same way for async functions — rejected promises on the listen side become rejected promises on the invoke side.

## Cleanup

Both `listen` and `invoke` return a `cleanup` function that tears down the message listener and rejects any in-flight promises:

```ts
const api = invoke<typeof model>({ listener, sender });
const server = listen({ model, listener, sender });

// Later, when done:
api.cleanup();
server.cleanup();
```

After cleanup, any further calls on `invoke` will throw:

```ts
api.cleanup();
await api.greet("World"); // throws Error("The response listener has been cleaned up.")
```

## Type Safety

Bime preserves full type information across the boundary. Argument types, return types, and argument counts are all enforced at compile time:

```ts
const model = {
  greet: (name: string) => `Hello, ${name}!`,
  sum: (a: number, b: number) => a + b,
  fetchData: async (id: string) => ({ id, value: 42 }),
};

const api = invoke<typeof model>({ listener, sender });

api.greet("World");    // Promise<string>
api.sum(1, 2);         // Promise<number>
api.fetchData("abc");  // Promise<{ id: string; value: number }>

api.greet(123);        // type error: expected string
api.sum(1);            // type error: expected 2 arguments
```

## License

ISC
