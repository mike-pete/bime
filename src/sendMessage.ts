import { Context, RequestType, State } from './types'
import { createUUID } from './utils'

function storeMessageState(context: Context, id: string) {
	const { messagesSent } = context

	const data = new Promise((resolve, reject) => {
		messagesSent[id].resolve = resolve
		messagesSent[id].reject = reject
	})

	const state: State = {
		loading: true,
		data,
		error: undefined,
	}

	messagesSent[id] = { state }

	return state
}

export function sendRequest(
	context: Context,
	requestType: RequestType,
	property: string,
	args: any[] = []
) {
	const id = createUUID()
	const data = JSON.stringify({ id, requestType, property, args })
	const { target, targetOrigin } = context

	const state = storeMessageState(context, id)

	target.postMessage(data, targetOrigin)

	return state
}

export function sendResponse(context: Context, id: string, data: any, error?: string) {
	const { target, targetOrigin } = context
	const response = JSON.stringify({
		id,
		requestType: RequestType.response,
		data,
		error,
	})
	target.postMessage(response, targetOrigin)
}
