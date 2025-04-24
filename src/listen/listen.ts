import {
  type AckMessage,
  type ErrorMessage,
  type MessageListenerWithCleanup,
  type MessageSender,
  type ModelType,
  type ResponseMessage,
} from "../types"

import { z } from "zod"

export const invocationMessageSchema = z.object({
  id: z.string(),
  type: z.enum(["invocation"]),
  procedure: z.string().min(1),
  args: z.array(z.any()),
})

export default function listen<Model extends ModelType>({
  model,
  listener,
  sender,
}: {
  model: Model
  listener: MessageListenerWithCleanup
  sender: MessageSender
}) {
  let cleanedUp = false

  if ("cleanup" in model) {
    console.warn(
      '"cleanup" is a reserved name and cannot be used on the model.',
    )
  }

  const handler = callHandler(model, sender)
  const cleanup = listener(handler)

  return {
    cleanup: () => {
      if (cleanedUp) {
        throw new Error("The listener has been cleaned up.")
      }
      cleanedUp = true
      cleanup()
    },
  }
}

const callHandler =
  <Model extends ModelType>(model: Model, sender: MessageSender) =>
  (messageString: string) => {
    const message = JSON.parse(messageString)

    const { success, data } = invocationMessageSchema.safeParse(message)

    if (!success) return
    const { id, procedure, args } = data

    const sendResponse = <Model extends ModelType>(
      message: AckMessage | ResponseMessage<Model> | ErrorMessage,
    ) => {
      sender(JSON.stringify(message))
    }

    sendResponse({ id, type: "ack" })

    if (typeof model[procedure] !== "function") {
      const error = new ReferenceError(
        `"${String(procedure)}" is not a procedure on the model`,
      )
      sendResponse({ id, type: "error", error })
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const invocationResult = model[procedure](...args)

      if (invocationResult instanceof Promise) {
        invocationResult
          .then((data) => {
            sendResponse({ id, type: "response", data })
          })
          .catch((error) => {
            sendResponse({ id, type: "error", error })
          })
      } else {
        sendResponse({
          id,
          type: "response",
          data: invocationResult,
        })
      }
    } catch (error) {
      sendResponse({ id, type: "error", error: error as Error })
    }
  }
