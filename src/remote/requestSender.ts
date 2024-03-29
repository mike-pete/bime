import type { Model } from "../bime"
import createExposedPromise, { type RejectType } from "./createExposedPromise"
import { type AutoRetryOptions, type SentMessageStore } from "./types"

type RequestMessage<RemoteModel extends Model> = {
  id: string
  type: "request"
  procedure: keyof RemoteModel
  args: Parameters<RemoteModel[keyof RemoteModel]>
}

const requestSender = <RemoteModel extends Model>(
  sentMessagesStore: SentMessageStore<RemoteModel>,
  remote: Window,
  origin: string,
  options?: AutoRetryOptions,
) => {
  const autoRetry = (
    id: string,
    reject: RejectType,
    options: AutoRetryOptions = {
      timeout: 30,
      tries: 3,
      backoff: 3,
    },
    startTime: number = Date.now(),
  ) => {
    const { timeout, tries, backoff } = options

    setTimeout(() => {
      const sentMessage = sentMessagesStore.get(id)
      if (sentMessage === undefined) return
      if (sentMessage.acknowledged) return

      if (tries > 0) {
        autoRetry(
          id,
          reject,
          {
            timeout: timeout * backoff,
            tries: tries - 1,
            backoff,
          },
          startTime,
        )
        sendRequest(sentMessage.message)
      } else {
        const timeElapsed = Date.now() - startTime
        reject(
          new Error(`Message was not acknowledged after ${timeElapsed}ms.`),
        )
      }
    }, timeout)
  }

  const saveMessageToStore = (message: RequestMessage<RemoteModel>) => {
    const exposedPromise =
      createExposedPromise<ReturnType<RemoteModel[keyof RemoteModel]>>()

    sentMessagesStore.set(message.id, {
      message,
      acknowledged: false,
      promise: exposedPromise,
      remote,
    })

    return exposedPromise
  }

  const sendNewRequest = async (
    messageData: Omit<RequestMessage<RemoteModel>, "id">,
  ) => {
    const message = {
      ...messageData,
      id: Math.random().toString(36).substring(7),
    }
    const exposedPromise = saveMessageToStore(
      message as RequestMessage<RemoteModel>,
    )

    if (origin === "*" || origin === remote.origin) {
      sendRequest(message)
      autoRetry(message.id, exposedPromise.reject, options)
    } else {
      exposedPromise.reject(
        new Error(
          `The remote window's origin "${remote.origin}" does not match the specified origin "${origin}". The request was aborted before sending.`,
        ),
      )
    }

    return await exposedPromise.promise
  }

  const sendRequest = (message: RequestMessage<RemoteModel>) => {
    remote.postMessage(message, origin)
  }

  return sendNewRequest
}

export default requestSender
