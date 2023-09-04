import { RequestType } from './enums'
import handleAck from './messageHandlers/handleAck'
import handleRequest from './messageHandlers/handleRequest'
import handleResponse from './messageHandlers/handleResponse'
import sendAck from './messageSenders/sendAck'
import type {
	Context,
	MessageIdentifier,
	RequestMessage,
	ResponseMessage,
	ValidMessageData,
} from './types'
import { bimeLogWarning, messageIsRequest } from './utils'

export default function handleMessage(context: Context, event: MessageEvent) {
	const messageData = getMessageDataFromEvent(event)
	if (!messageData) return

	const { requestType, id } = messageData
	const { lastAckSent } = context

	if (requestType !== RequestType.ack) {
		// ignore messages that have already been acknowledged
		// this cleans up the handshake process a bit
		if (id === lastAckSent) {
			return
		}

		const expectedId = typeof lastAckSent !== 'number' ? 0 : lastAckSent + 1
		if (id !== expectedId) {
			return sendAck(context, lastAckSent ?? 0)
		}
		sendAck(context, id)
	}

	switch (requestType) {
		case RequestType.ack:
			return handleAck(context, messageData as MessageIdentifier)
		case RequestType.response:
			return handleResponse(context, messageData as ResponseMessage)
		case RequestType.property:
		case RequestType.function:
			return handleRequest(context, messageData as RequestMessage)
	}
}

function getMessageDataFromEvent(
	event: MessageEvent
): ValidMessageData | undefined {
	const { data } = event

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

	if (!('id' in messageData)) {
		// ignore messages that don't have an id, they're not relevant to bime
		return
	}

	if (messageIsRequest(messageData) && !('property' in messageData)) {
		bimeLogWarning(
			`A request was made, but no property or function was provided.`
		)
		return
	}

	return messageData
}
