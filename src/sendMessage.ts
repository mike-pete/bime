import type {
	Context,
	MessageIdentifier,
	RequestMessage,
	ResponseMessage,
} from './types'

export function sendMessage(
	context: Context,
	message: MessageIdentifier | RequestMessage | ResponseMessage
) {
	// TODO: if message id is > lastMessageSent + 1, add to queue
	const { target, targetOrigin } = context
	target.postMessage(JSON.stringify(message), targetOrigin)
	if (message.requestType !== 'ack'){
		context.lastMessageSent = message.id
	}
}
