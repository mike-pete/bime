import { RequestType } from './enums'
import type {
	Context,
	ModelProperty,
	RequestMessage,
	ResponseMessage,
	State,
} from './types'
import { createUUID } from './utils'

function storeMessageState(context: Context, id: string) {
	const { messagesSent } = context

	messagesSent[id] = {}

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

export function sendRequest(
	context: Context,
	requestType: RequestType,
	property: string,
	args: ModelProperty[] = []
) {
	const id = createUUID()
	const messageData: RequestMessage = {
		id,
		requestType,
		property,
		args,
	}
	const data = JSON.stringify(messageData)
	const { target, targetOrigin } = context

	const state = storeMessageState(context, id)

	target.postMessage(data, targetOrigin)

	return state
}

export function sendResponse(
	context: Context,
	id: string,
	data: any,
	error?: string
) {
	const { target, targetOrigin } = context

	const responseData: ResponseMessage = {
		id,
		requestType: RequestType.response,
		data,
		error,
	}

	const response = JSON.stringify(responseData)

	target.postMessage(response, targetOrigin)
}
