import { expect, jest, test } from "bun:test"
import { EventEmitter } from "node:events"
import bime from "./bime"

function createEvent() {
  const id = crypto.randomUUID()
  const cleanupMock = jest.fn()
  const event = new EventEmitter()
  const listener = (handler: (message: string) => void) => {
    event.on(id, handler)

    return () => {
      event.off(id, handler)
      cleanupMock()
    }
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
test("example test", async () => {
  const { listener, sender, cleanupMock } = createEvent()

  const model = {
    sayHello: (name: string) => `Hello ${name}`,
    print: (message: string) => {
      console.log(message)
    },
  }

  const listen = bime.listen({ model, listener, sender })
  const invoke = bime.invoke<typeof model>({ listener, sender })

  expect(await invoke.sayHello("Bime")).toEqual("Hello Bime")

  // @ts-expect-error: This is necessary because the method 'notDefined' does not exist in the model.
  expect(() => invoke.notDefined()).toThrow()
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
