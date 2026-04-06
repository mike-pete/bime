export type MessageListenerWithCleanup = (
  handler: (message: string) => void,
) => () => void

export type MessageSender = (message: string) => void
