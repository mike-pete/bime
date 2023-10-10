import {
	Context,
	ModelProperty,
	RequestMessage,
	ResponseMessage,
	State,
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

	const data: Promise<ModelProperty> = new Promise((resolve, reject) => {
		messagesSent[id].resolve = resolve
		messagesSent[id].reject = reject
	})

	const state: State = {
		loading: true,
		data,
		error: undefined,
	}

	messagesSent[id].state = state

	return state
}
