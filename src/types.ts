import type { RejectType, ResolveType } from "./utils/createExposedPromise"

export type ModelType = Record<string, (...args: any[]) => any>

export type MessageListenerWithCleanup = (
  handler: (message: string) => void,
) => () => void

export type MessageSender = (message: string) => void

export type SentMessageStore<RemoteModel extends ModelType> = Map<
  string,
  {
    acknowledged: boolean
    promise: ExposedMessagePromise<ReturnType<RemoteModel[keyof RemoteModel]>>
  }
>

// OLD

export type InvocationMessage<RemoteModel extends ModelType> = {
  id: string
  type: "invocation"
  procedure: keyof RemoteModel
  args: Parameters<RemoteModel[keyof RemoteModel]>
}
type ResolveData<RemoteModel extends ModelType> = ReturnType<
  RemoteModel[keyof RemoteModel]
>

type ExposedMessagePromise<RemoteModel extends ModelType> = {
  promise: Promise<ResolveData<RemoteModel>>
  resolve: ResolveType<ResolveData<RemoteModel>>
  reject: RejectType
}

export type ResponseMessage<T extends ModelType> = {
  id: string
  type: "response"
  data: ReturnType<T[keyof T]> | "acknowledged"
}

export type ErrorMessage = {
  id: string
  type: "error"
  error: Error
}

export type AckMessage = {
  id: string
  type: "ack"
}

export type InvocationListener<RemoteModel extends ModelType> = (
  handler: (
    message: InvocationMessage<RemoteModel> | AckMessage | ErrorMessage,
  ) => void,
) => () => void

export type ResponseListener<RemoteModel extends ModelType> = (
  handler: (message: ResponseMessage<RemoteModel>) => void,
) => () => void

// export type MessageSender<RemoteModel extends ModelType> = (
//   message: InvocationMessage<RemoteModel> | AckMessage | ErrorMessage,
// ) => void

export type AutoRetryOptions = {
  timeout: number
  tries: number
  backoff: number
}
