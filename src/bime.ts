import { RequestType } from './enums'
import handleMessage from './handleMessage'
import sendRequest from './messageSenders/sendRequest'
import sendSyn from './messageSenders/sendSyn'
import type { Context, MessageSentRecord, Model, ModelProperty } from './types'
import { bimeLogWarning } from './utils'

function bime(
	target: Window,
	model: Model = {},
	targetOrigin: string,
	devMode = false
) {
	const messagesSent: Record<string, MessageSentRecord> = {}
	const context: Context = {
		target,
		model,
		// TODO: these should not be directly accessible, they should be accessed through getters and incrementors
		lastMessageSent: -1, // number of messages sent
		lastAckReceived: -1, // last message that was acknowledged by remote
		lastAckSent: -1, // last message that we acknowledged
		messagesSent, // store of sent messages that haven't been resolved
		targetOrigin,
		devMode,
	}

	sendSynMessages(context)
	window.addEventListener('message', messageListener.bind(null, context), false)

	return {
		get: getProperty.bind(null, context),
		invoke: invokeMethod.bind(null, context),
	}
}

function sendSynMessages(context: Context) {
	const interval = setInterval(() => {
		const { lastAckReceived } = context
		const synWasAcknowledged = lastAckReceived === 0
		
		if (synWasAcknowledged) {
			clearInterval(interval)
			return // TODO: send queued messages
		}

		sendSyn(context)
	}, 100)
}

function messageListener(context: Context, event: MessageEvent) {
	if (originIsValid(context, event)) {
		handleMessage(context, event)
	}
}

function getProperty(context: Context, property: string) {
	return sendRequest(context, RequestType.property, property)
}

function invokeMethod(
	context: Context,
	property: string,
	args: ModelProperty[]
) {
	return sendRequest(context, RequestType.function, property, args)
}

function originIsValid(
	{ targetOrigin, devMode }: Context,
	{ origin }: MessageEvent
): boolean {
	const originIsValid = targetOrigin === '*' || origin === targetOrigin

	if (!originIsValid && devMode) {
		bimeLogWarning(`Message received from unknown origin [ ${origin} ].`)
	}

	return originIsValid
}

export default bime
