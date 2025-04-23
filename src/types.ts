export type ModelType = Record<string, (...args: any[]) => any>

export type MessageListenerWithCleanup = (
  handler: (message: string) => void,
) => () => void

export type MessageSender = (message: string) => void

export type InvocationMessage<RemoteModel extends ModelType> = {
  id: string
  type: "invocation"
  procedure: keyof RemoteModel
  args: Parameters<RemoteModel[keyof RemoteModel]>
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

export type AutoRetryOptions = {
  timeout: number
  tries: number
  backoff: number
}
