import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import bime from "./bime"
test("example test", async () => {
  const event = new EventEmitter()

  //   event.on("message", (message) => {
  //     console.log(`${message}`)
  //   })

  //   event.emit("message", "hello world")

  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }

  const messageListener = (handler: (message: string) => void) => {
    event.on("message", handler)

    return () => {
      event.off("message", handler)
    }
  }

  const messageSender = (message: string) => {
    event.emit("message", message)
  }

  const listen = bime.listen({
    model, 
    listener: messageListener,
    sender: messageSender,
  })

  const invoke = bime.invoke<typeof model>({
    listener: messageListener,
    sender: messageSender,
  })

  const result = await invoke.sayHello("Bime")

  expect(result).toEqual("Hello Bime")

  console.log(result)

  listen.cleanup()
  invoke.cleanup()

  // const result = await remote.sayHello("Bime")z
  // expect(result).toEqual("Hello Bime")

  // listener.cleanup()
})
