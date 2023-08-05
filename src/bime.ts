import handleMessage from './handleMessage'
import { sendRequest } from './sendMessage'
import { Context, MessageSentRecord, RequestType } from './types'

function bime(
	target: Window,
	model: Record<string, any> = {},
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

function invokeMethod(context: Context, property: string, args: any[]) {
	return sendRequest(context, RequestType.function, property, args)
}

export default bime
