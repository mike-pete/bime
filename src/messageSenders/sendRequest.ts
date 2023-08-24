import { RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context, ModelProperty, RequestMessage, State } from '../types'

function storeMessageState(
	context: Context,
	id: number,
	request: RequestMessage
) {
	const { messagesSent } = context

	messagesSent[id] = {
		acknowledged: false,
		request,
	}

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

export default function sendRequest(
	context: Context,
	requestType: RequestType.function | RequestType.property,
	property: string,
	args: ModelProperty[] = []
) {
	const id = context.lastMessageSent ?? 0 + 1
	const requestData: RequestMessage = {
		id,
		requestType,
		property,
		args,
	}

	const state = storeMessageState(context, id, requestData)
	sendMessage(context, requestData)
	return state
}
