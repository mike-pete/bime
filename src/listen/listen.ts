import {
  type AckMessage,
  type ErrorMessage,
  type InvocationMessage,
  type MessageListenerWithCleanup,
  type MessageSender,
  type ModelType,
  type ResponseMessage,
} from "../types"

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
    console.log("messageString", messageString)
    const message = JSON.parse(messageString)

    const sendResponse = <Model extends ModelType>(
      message: AckMessage | ResponseMessage<Model> | ErrorMessage,
    ) => {
      sender(JSON.stringify(message))
    }

    if (typeof message.id !== "string" || message.id === "") return
    if (message.type !== "invocation") return
    if (typeof message.procedure !== "string" || message.procedure === "")
      return

    const { id, procedure, args }: InvocationMessage<Model> = {
      ...message,
      args: message?.args ?? [],
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
