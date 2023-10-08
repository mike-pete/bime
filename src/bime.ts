import { RequestType } from './enums'
import handleMessage from './handleMessage'
import sendRequest from './messageSenders/sendRequest'
import sendSyn from './messageSenders/sendSyn'
import type { Context, MessageSentRecord, Model, ModelProperty } from './types'
import { bimeLogWarning, exposedPromiseFactory } from './utils'

function bime(target: Window, model: Model = {}, targetOrigin: string, devMode = false) {
	const messagesSent: Record<string, MessageSentRecord> = {}
	const context: Context = {
		target,
		model,
		messagesSent, // store of sent messages that haven't been resolved
		isConnected: exposedPromiseFactory<void>(),
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
		console.log('send syn')
		sendSyn(context)
	}, 300)
	context.isConnected.promise.then(() => {
		clearInterval(interval)
	})
}

function messageListener(context: Context, event: MessageEvent) {
	if (originIsValid(context, event)) {
		handleMessage(context, event)
	}
}

function getProperty(context: Context, property: string) {
	return sendRequest(context, RequestType.property, property)
}

function invokeMethod(context: Context, property: string, args: ModelProperty[]) {
	return sendRequest(context, RequestType.function, property, args)
}

function originIsValid({ targetOrigin, devMode }: Context, { origin }: MessageEvent): boolean {
	const originIsValid = targetOrigin === '*' || origin === targetOrigin

	if (!originIsValid && devMode) {
		bimeLogWarning(`Message received from unknown origin [ ${origin} ].`)
	}

	return originIsValid
}

export default bime
