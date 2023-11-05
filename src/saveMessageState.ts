import {
	Context,
	ModelProperty,
	RequestMessage,
	ResponseMessage,
} from './types'
import { messageIsRequest } from './utils'

export default function saveMessageSent(
	context: Context,
	message: RequestMessage | ResponseMessage
) {
	const { id } = message
	const { messagesSent } = context

	messagesSent[id] = {
		acknowledged: false,
		message,
	}

	if (messageIsRequest(message)) {
		return saveRequestState(context, id)
	}
}

function saveRequestState(context: Context, id: string) {
	const { messagesSent } = context

	const state: Promise<ModelProperty> = new Promise((resolve, reject) => {
		messagesSent[id].resolve = resolve
		messagesSent[id].reject = reject
	})

	messagesSent[id].state = state

	return state
}
