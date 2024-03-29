import { type Model } from "../bime"

type ResponseMessage<T extends Model> = {
  id: string
  type: "response"
  data: ReturnType<T[keyof T]> | "acknowledged"
}

type ErrorMessage = {
  id: string
  type: "error"
  error: Error
}

type AckMessage = {
  id: string
  type: "ack"
}

const listen = (model: Model, origin: string | string[]) => {
  let cleanedUp = false

  if ("cleanup" in model) {
    console.warn(
      '"cleanup" is a reserved name and cannot be used on the model.',
    )
  }

  const handler = callHandler(origin, model)
  window.addEventListener("message", handler)

  return {
    cleanup: () => {
      if (cleanedUp) {
        throw new Error("The listener has been cleaned up.")
      }
      cleanedUp = true
      window.removeEventListener("message", handler)
    },
  }
}

const callHandler =
  (origin: string | string[], model: Model) => (event: MessageEvent) => {
    if (origin !== "*") {
      if (typeof origin === "string") {
        if (origin !== event.origin) return
      } else if (Array.isArray(origin)) {
        if (!origin.includes(event.origin)) return
      } else {
        return
      }
    }

    const {
      id,
      procedure,
      args,
      type,
    }: { id: string; procedure: string; args: any[]; type: string } = event.data

    if (typeof id !== "string" || id === "") return
    if (type !== "request") return

    sendResponse(
      { id: event.data.id, type: "ack" },
      event.source as Window,
      event.origin,
    )

    if (typeof model[procedure] !== "function") {
      const error = new ReferenceError(
        `"${procedure}" is not a procedure on the model`,
      )
      sendResponse(
        { id: event.data.id, type: "error", error },
        event.source as Window,
        event.origin,
      )
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const invocationResult = model[procedure](...args)

      if (invocationResult instanceof Promise) {
        invocationResult
          .then((data) => {
            sendResponse(
              { id: event.data.id, type: "response", data },
              event.source as Window,
              event.origin,
            )
          })
          .catch((error) => {
            sendResponse(
              { id: event.data.id, type: "error", error },
              event.source as Window,
              event.origin,
            )
          })
      } else {
        sendResponse(
          { id: event.data.id, type: "response", data: invocationResult },
          event.source as Window,
          event.origin,
        )
      }
    } catch (error) {
      sendResponse(
        { id: event.data.id, type: "error", error: error as Error },
        event.source as Window,
        event.origin,
      )
    }
  }

const sendResponse = <LocalModel extends Model>(
  message: AckMessage | ResponseMessage<LocalModel> | ErrorMessage,
  remote: Window,
  origin: string,
) => {
  remote.postMessage(message, origin)
}

export default listen
