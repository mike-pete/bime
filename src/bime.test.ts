import { test } from "bun:test"
import { EventEmitter } from "node:events"
import bime from "./bime"

test("example test", async () => {
  const event = new EventEmitter()

  event.on("message", (message) => {
    console.log(`${message}`)
  })

  event.emit("message", "hello world")

  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }

  const messageListener = (handler: (message: MessageEvent) => void) => {
    event.on("message", handler)

    return () => {
      event.off("message", handler)
    }
  }

//   const messageSender = (message: string) => {
//     event.emit("message", message)
//   }

  const listener = bime.listen(model, "*", messageListener)
//   const remote = bime.remote<typeof model>(messageSender, "*")



  // const result = await remote.sayHello("Bime")
  // expect(result).toEqual("Hello Bime")

  // listener.cleanup()
})
