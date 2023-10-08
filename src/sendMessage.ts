import type { Context, MessageIdentifier, RequestMessage, ResponseMessage } from './types'
import { messageIsRequest } from './utils'

export function sendMessage(
	context: Context,
	message: MessageIdentifier | RequestMessage | ResponseMessage
) {
	if (messageIsRequest(message)) {
		context.isConnected.promise.then(() => {
			sendPostMessage(context, message)
		})
	} else {
		sendPostMessage(context, message)
	}
}

function sendPostMessage(
	context: Context,
	message: MessageIdentifier | RequestMessage | ResponseMessage
) {
	const { target, targetOrigin } = context
	target.postMessage(JSON.stringify(message), targetOrigin)
}
