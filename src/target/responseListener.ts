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

    const { id, data, type, error } = event.data
    if (typeof id !== "string" || id === "") return
    if (type !== "response" && type !== "error" && type !== "ack") return

    const sentMessage = sentMessagesStore.get(id)
    if (sentMessage === undefined) return

    if (event.source !== sentMessage.target) return

    switch (type) {
      case "response":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        sentMessage.promise.resolve(data)
        sentMessagesStore.delete(id)
        break

      case "error":
        sentMessage.promise.reject(error)
        sentMessagesStore.delete(id)
        break

      case "ack":
        sentMessagesStore.set(id, {...sentMessage, acknowledged: true})
        break
    }
  }

export default responseListener
