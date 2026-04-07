export type MessageListenerWithCleanup = (
  handler: (message: string) => void,
) => () => void

export type MessageSender = (message: string) => void

export type Transport = {
  listener: MessageListenerWithCleanup
  sender: MessageSender
  cleanup?: () => void
}
