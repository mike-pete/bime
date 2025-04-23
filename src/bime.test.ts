import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import bime from "./bime"

function createEvent() {
  const id = crypto.randomUUID()
  const event = new EventEmitter()
  const listener = (handler: (message: string) => void) => {
    event.on(id, handler)

    return () => {
      event.off(id, handler)
    }
  }

  const sender = (message: string) => {
    event.emit(id, message)
  }

  return {
    listener,
    sender,
  }
}
test("example test", async () => {
  const { listener, sender } = createEvent()

  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }

  const listen = bime.listen({ model, listener, sender })
  const invoke = bime.invoke<typeof model>({ listener, sender })

  expect(await invoke.sayHello("Bime")).toEqual("Hello Bime")

  // @ts-expect-error: This is necessary because the method 'notDefined' does not exist in the model.
  expect(() => invoke.notDefined()).toThrow()

  expect(listen.cleanup).toBeDefined()
  expect(invoke.cleanup).toBeDefined()

  listen.cleanup()
  invoke.cleanup()
})
