import { RequestType } from './enums'
import type {
	Context,
	MessageIdentifier,
	ModelProperty,
	RequestMessage,
	ResponseMessage,
	State,
} from './types'

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

function sendMessage(
	context: Context,
	message: MessageIdentifier | RequestMessage | ResponseMessage
) {
	const { target, targetOrigin } = context
	target.postMessage(JSON.stringify(message), targetOrigin)
}

export function sendRequest(
	context: Context,
	requestType: RequestType,
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

export function sendResponse(
	context: Context,
	id: number,
	data: ModelProperty,
	error?: string
) {
	const response: ResponseMessage = {
		id,
		requestType: RequestType.response,
		data,
		error,
	}

	sendMessage(context, response)
}

export function sendSyn(context: Context) {
	context.lastMessageSent = 0
	console.log('sending syn')

	const message = {
		id: 0,
		requestType: RequestType.syn,
	}

	sendMessage(context, message)
}

export function sendSynAck(context: Context) {
	console.log('sending syn ack')

	const message = {
		id: 0,
		requestType: RequestType.synAck,
	}

	sendMessage(context, message)
	context.lastAckSent = 0
}

export function sendAck(context: Context, remoteId: number) {
	console.log('sending ack')

	const message = {
		id: remoteId,
		requestType: RequestType.ack,
	}

	sendMessage(context, message)
	context.lastAckSent = remoteId
}
