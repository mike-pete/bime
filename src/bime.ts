import { RequestType } from './enums'
import handleMessage from './handleMessage'
import sendRequest from './messageSenders/sendRequest'
import sendSyn from './messageSenders/sendSyn'
import type { Context, MessageSentRecord, Model, ModelProperty } from './types'

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
		lastMessageSent: undefined, // number of messages sent
		lastAckReceived: undefined, // last message that was acknowledged by remote
		lastAckSent: undefined, // last message that we acknowledged
		messagesSent, // store of sent messages that haven't been resolved
		targetOrigin,
		devMode,
	}

	const interval = setInterval(() => {
		if (context.lastAckReceived !== undefined || context.lastAckSent !== undefined) {
			clearInterval(interval)
		} else {
			sendSyn(context)
		}
	}, 100)

	window.addEventListener('message', handleMessage.bind(null, context), false)

	return {
		get: getProperty.bind(null, context),
		invoke: invokeMethod.bind(null, context),
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

export default bime
