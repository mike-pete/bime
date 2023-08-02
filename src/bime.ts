type Context = {
	target: Window
	model: Record<string, any>
	messagesSent: Record<string, MessageSentRecord>
	targetOrigin: string
	devMode: boolean
}

type State = {
	loading: boolean
	data: Promise<any>
	error?: any
}

type MessageSentRecord = {
	state: State
	resolve: (value: any) => void
	reject: (reason?: any) => void
}

enum RequestType {
	function = 'function',
	property = 'property',
	response = 'response',
}

type MessageData = {
	id: string
	data: any
	error: string
	requestType: RequestType, 
	property: string, 
	args: any
}

// TODO: change model any
function bime(
	target: Window,
	model: Record<string, any> = {},
	targetOrigin: string,
	devMode = false
) {
	const messagesSent = {}
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

// TODO: change any
function invokeMethod(context: Context, property: string, args: any[]) {
	return sendRequest(context, RequestType.function, property, args)
}

// TODO: change any

function storeMessageState(context: Context, id: string) {
	const { messagesSent } = context

	let resolve!: (value: unknown) => void
	let reject!: (reason?: any) => void

	const data = new Promise((res, rej) => {
		resolve = res
		reject = rej
	})

	const state: State = {
		loading: true,
		data,
		error: undefined,
	}

	messagesSent[id] = {
		state,
		resolve,
		reject,
	}

	return state
}

function sendRequest(
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

function sendResponse(context: Context, id: string, data: any, error?: string) {
	const { target, targetOrigin } = context
	const response = JSON.stringify({
		id,
		requestType: RequestType.response,
		data,
		error,
	})
	target.postMessage(response, targetOrigin)
}

function handleMessage(context: Context, event: MessageEvent) {
	const { targetOrigin, devMode } = context
	const { origin, data } = event

	if (targetOrigin != '*' && origin !== targetOrigin) {
		if (devMode) {
			warn(`Message received from unknown origin [ ${origin} ].`)
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

	if (messageData.requestType === RequestType.response) {
		handleResponse(context, messageData)
	} else {
		handleRequest(context, messageData)
	}
}

function handleResponse(context: Context, messageData: MessageData) {
	const { messagesSent, devMode } = context
	const { id, data, error } = messageData

	if (!(id in messagesSent)) {
		if (devMode) {
			warn(
				`Response received for unknown message. This response may be for another instance of bime.`
			)
		}
		return
	}

	if (error) {
		messagesSent[id].state.error = error
		messagesSent[id].reject(error)
	} else {
		messagesSent[id].resolve(data)
	}

	messagesSent[id].state.loading = false
	messagesSent[id].state.error = error

	// it should be safe to remove the message from the messagesSent store
	// because the application should be maintaining a reference to the state object
	delete messagesSent[id]
}

async function handleRequest(context: Context, messageData: MessageData) {
	const { model } = context
	const { requestType, property, args, id } = messageData

	if (!property) {
		const label = requestType === RequestType.function ? 'function' : 'property'
		throwError(`The ${label} name is required, but was not provided.`)
	}

	if (!(property in model)) {
		throwError(`[ ${property} ] does not exist in the target's model.`)
	}

	// TODO: simplify this
	switch (requestType) {
		case RequestType.property:
			if (typeof model[property] === 'function') {
				throwError(
					`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`
				)
			}
			break
		case RequestType.function:
			if (typeof model[property] !== 'function') {
				throwError(
					`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`
				)
			}
			break
	}

	let response

	if (typeof model[property] !== 'function') {
		response = model[property]
	} else {
		response = await model[property](...args)
	}

	// TODO
	let error
	
	sendResponse(context, id, response, error)
}

function createUUID() {
	return self.crypto.randomUUID()
}

function throwError(message: string) {
	throw new Error(`bime: ${message}`)
}
throwError.prototype = Error.prototype

function warn(message: string) {
	console.warn(`bime: ${message}`)
}

export default bime
