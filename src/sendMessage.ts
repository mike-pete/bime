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
	const { target, targetOrigin } = context
	target.postMessage(JSON.stringify(message), targetOrigin)
}
