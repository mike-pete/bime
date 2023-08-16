import { RequestType } from './enums'
import handleMessage from './handleMessage'
import { sendRequest } from './sendMessage'
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
		messagesSent,
		targetOrigin,
		devMode,
	}

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
