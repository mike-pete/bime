import type { Model } from "../bime"
import type { SentMessageStore } from "./types"

const responseListener = <RemoteModel extends Model>(
  sentMessagesStore: SentMessageStore<RemoteModel>,
  origin: string,
) => {
  const handler = messageHandler<RemoteModel>(sentMessagesStore, origin)
  window.addEventListener("message", handler)
  return () => {
    window.removeEventListener("message", handler)
  }
}

const messageHandler =
  <RemoteModel extends Model>(
    sentMessagesStore: SentMessageStore<RemoteModel>,
    origin: string,
  ) =>
  (event: MessageEvent) => {
    if (origin !== "*" && origin !== event.origin) return

    const id = event.data?.id
    if (typeof id !== "string" || id === "") return

    const type = event.data?.type
    if (type !== "response" && type !== "error" && type !== "ack") return

    if (!(id in sentMessagesStore)) return
    const sentMessage = sentMessagesStore[id]

    if (event.source !== sentMessage.target) return

    switch (type) {
      case "response":
        handleResponse<RemoteModel>(event, sentMessagesStore)
        break
      case "error":
        handleError<RemoteModel>(event, sentMessagesStore)
        break
      case "ack":
        handleAck<RemoteModel>(event, sentMessagesStore)
        break
    }
  }

const handleResponse = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id, data } = event.data
  const sentMessage = sentMessagesStore[id]
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  sentMessage.promise.resolve(data)
  delete sentMessagesStore[id]
}

const handleError = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id, error } = event.data
  const sentMessage = sentMessagesStore[id]
  sentMessage.promise.reject(error)
  delete sentMessagesStore[id]
}

const handleAck = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id } = event.data
  const sentMessage = sentMessagesStore[id]
  sentMessage.acknowledged = true
}

export default responseListener
