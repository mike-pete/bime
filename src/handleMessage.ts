import { RequestType } from './enums'
import { sendAck, sendResponse, sendSynAck } from './sendMessage'
import type {
	Context,
	MessageIdentifier,
	ModelFunction,
	ModelProperty,
	RequestMessage,
	ResponseMessage,
} from './types'
import { bimeLogError, bimeLogWarning, bimeThrowError } from './utils'

function handleMessage(context: Context, event: MessageEvent) {
	const { targetOrigin, devMode } = context
	const { origin, data } = event

	if (targetOrigin != '*' && origin !== targetOrigin) {
		if (devMode) {
			bimeLogWarning(`Message received from unknown origin [ ${origin} ].`)
		}
		return
	}

	let messageData

	try {
		messageData = JSON.parse(data)
	} catch {
		// ignore messages that aren't JSON, they're not relevant to bime
		return
	}

	if (!messageData?.requestType) {
		// ignore messages that don't have a requestType, they're not relevant to bime
		return
	}

	switch (messageData.requestType) {
		case RequestType.response:
			return handleResponse(context, messageData)
		case RequestType.property:
		case RequestType.function:
			return handleRequest(context, messageData)
		case RequestType.syn:
			return handleSyn(context)
		case RequestType.synAck:
			return handleSynAck(context)
		case RequestType.ack:
			return handleAck(context, messageData)
	}
}

function handleResponse(context: Context, messageData: ResponseMessage) {
	const { messagesSent, devMode } = context
	const { id, data, error } = messageData
	const { reject, resolve, state } = messagesSent[id]

	if (!(id in messagesSent)) {
		devMode &&
			bimeLogWarning(
				`Response received for unknown message. This response may be for another instance of bime.`
			)
		return
	}

	if (error) {
		if (reject && typeof reject === 'function') {
			reject(error)
		} else {
			devMode &&
				bimeLogError(`attempted to reject promise but reject was [${reject}]`)
		}
	} else {
		if (resolve && typeof resolve === 'function') {
			resolve(data)
		} else {
			devMode &&
				bimeLogError(
					`attempted to resolve promise but resolve was [${resolve}]`
				)
		}
	}

	if (state) {
		state.loading = false
		state.error = error
	}

	// it should be safe to remove the message from the messagesSent store
	// because the application should be maintaining a reference to the state object
	delete messagesSent[id]
}

async function handleRequest(context: Context, messageData: RequestMessage) {
	const { model } = context
	const { requestType, property, args, id } = messageData

	if (!property) {
		const label = requestType === RequestType.function ? 'function' : 'property'
		bimeThrowError(`The ${label} name is required, but was not provided.`)
	}

	if (!(property in model)) {
		bimeThrowError(`[ ${property} ] does not exist in the target's model.`)
	}

	// TODO: simplify this
	switch (requestType) {
		case RequestType.property:
			if (typeof model[property] === 'function') {
				bimeThrowError(
					`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`
				)
			}
			break
		case RequestType.function:
			if (typeof model[property] !== 'function') {
				bimeThrowError(
					`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`
				)
			}
			break
	}

	let response: ModelProperty

	if (typeof model[property] !== 'function') {
		response = model[property] as ModelProperty
	} else {
		const functionToInvoke = model[property] as ModelFunction
		response = await functionToInvoke(...(args ?? []))
	}

	// TODO
	let error

	sendResponse(context, id, response, error)
}

function handleSyn(context: Context) {
	console.log('handleSyn')
	sendSynAck(context)
}

function handleSynAck(context: Context) {
	console.log('handle syn ack')
	context.lastAckReceived = 0
	sendAck(context, 0) // TODO: replace 0 with real id
}

function handleAck(context: Context, messageData: MessageIdentifier) {
	const { id } = messageData
	console.log('handle ack', id)
	context.lastAckReceived = id
}

export default handleMessage
