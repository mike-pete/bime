import { RequestType } from './enums'
import handleAck from './messageHandlers/handleAck'
import handleRequest from './messageHandlers/handleRequest'
import handleResponse from './messageHandlers/handleResponse'
import handleSyn from './messageHandlers/handleSyn'
import handleSynAck from './messageHandlers/handleSynAck'
import type { Context } from './types'
import { bimeLogWarning } from './utils'

export default function handleMessage(context: Context, event: MessageEvent) {
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