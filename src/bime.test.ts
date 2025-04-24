import { expect, jest, test } from "bun:test"
import { EventEmitter } from "node:events"
import bime from "./bime"

function createEvent() {
  const id = crypto.randomUUID()
  const cleanupMock = jest.fn()
  const event = new EventEmitter()
  const listener = (handler: (message: string) => void) => {
    event.on(id, handler)

    const cleanup = () => {
      event.off(id, handler)
      cleanupMock()
    }

    return cleanup
  }

  const sender = (message: string) => {
    event.emit(id, message)
  }

  return {
    listener,
    sender,
    cleanupMock,
  }
}

function createInstance<Model extends Record<string, (...args: any[]) => any>>(
  model: Model,
) {
  const { listener, sender, cleanupMock } = createEvent()
  const listen = bime.listen({ model, listener, sender })
  const invoke = bime.invoke<Model>({ listener, sender })

  return {
    listen,
    invoke,
    cleanupMock,
  }
}

test("happy path message passing works", async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
    print: (message: string) => {
      console.log(message)
    },
    sum: (a: number, b: number) => a + b,
    isEven: (n: number) => n % 2 === 0,
    willThrow: () => {
      throw new Error("This is a test error")
    },
  }
  const { invoke } = createInstance(model)

  expect(await invoke.sayHello("World")).toEqual("Hello World")
  expect(await invoke.sayHello("Bime")).toEqual("Hello Bime")
  expect(async () => {
    await invoke.print("it works!")
  }).not.toThrow()
  expect(await invoke.sum(1, 2)).toEqual(3)
  expect(await invoke.isEven(2)).toEqual(true)
  expect(await invoke.isEven(3)).toEqual(false)
  expect(
    (async () => {
      return invoke.willThrow()
    })(),
  ).rejects.toThrow("This is a test error")
})

test("cannot use 'cleanup' as a model method", async () => {
  const model = {
    cleanup: () => {
      console.log("cleanup")
    },
  }

  expect(() =>
    bime.listen({
      model,
      listener: (handler: (message: string) => void) => () => {},
      sender: () => {},
    }),
  ).toThrow(
    new ReferenceError(
      '"cleanup" is a reserved name and cannot be used on the model.',
    ),
  )
})

test("listen cleanup works", async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { listen, cleanupMock } = createInstance(model)

  expect(listen.cleanup).toBeDefined()

  listen.cleanup()
  expect(cleanupMock).toHaveBeenCalled()
})

test("invoke cleanup works", async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { invoke, cleanupMock } = createInstance(model)

  expect(invoke.cleanup).toBeDefined()

  invoke.cleanup()
  expect(cleanupMock).toHaveBeenCalled()

  const promise = (async () => {
    void invoke.sayHello("Mike")
  })()
  expect(promise).rejects.toThrow()
})
