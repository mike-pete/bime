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

test("example test", async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
    print: (message: string) => {
      console.log(message)
    },
  }
  const { listen, invoke, cleanupMock } = createInstance(model)

  expect(await invoke.sayHello("Bime")).toEqual("Hello Bime")

  // @ts-expect-error: This is necessary because the method 'notDefined' does not exist in the model.
  expect(() => invoke.notDefined()).toThrow()
  
  // @ts-expect-error: This is necessary because the method 'notDefined' does not exist in the model.
  expect(() => invoke.notDefined()).toThrow(
    new Error('"notDefined" is not a procedure on the model'),
  )

  expect(async () => {
    await invoke.print("it works!")
  }).not.toThrow()

  expect(listen.cleanup).toBeDefined()
  expect(invoke.cleanup).toBeDefined()

  listen.cleanup()
  expect(cleanupMock).toHaveBeenCalled()
  invoke.cleanup()
  expect(cleanupMock).toHaveBeenCalled()

  const promise = (async () => {
    void invoke.sayHello("Mike")
  })()
  expect(promise).rejects.toThrow()
})
