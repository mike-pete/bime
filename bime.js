function bime(target, model = {}, targetOrigin, devmode = false) {
	const messagesSent = {}
	const context = { target, model, messagesSent, targetOrigin, devmode }

	window.addEventListener('message', handleMessage.bind(null, context), false)

	return {
		get: getProperty.bind(null, context),
		invoke: invokeMethod.bind(null, context),
	}
}

function getProperty(context, property) {
	return sendRequest(context, 'property', property)
}

function invokeMethod(context, property, args) {
	return sendRequest(context, 'function', property, args)
}

// requestType can be function, property, or response
function sendRequest(context, requestType, property, args = []) {
	const id = createUUID()
	const data = JSON.stringify({ id, requestType, property, args })
	const { target, messagesSent, targetOrigin } = context

	let resolve, reject

	const state = {
		loading: true,
		data: new Promise((res, rej) => {
			resolve = res
			reject = rej
		}),
		error: undefined,
	}

	messagesSent[id] = {
		state,
		resolve,
		reject,
	}

	target.postMessage(data, targetOrigin)

	return state
}

function sendResponse(context, id, data, error) {
	const { target, targetOrigin } = context
	const response = JSON.stringify({ id, requestType: 'response', data, error })
	target.postMessage(response, targetOrigin)
}

function handleMessage(context, e) {
	const { targetOrigin, devmode } = context
	const { origin, data } = e
	
	let requestType	

	if (targetOrigin != '*' && origin !== targetOrigin) {
		if (devmode) {
			warn(`Message received from unknown origin [ ${origin} ].`)
		}
		return
	}
	
	try {
		requestType = JSON.parse(data).requestType
	} catch {
		// ignore messages that aren't JSON, they're not relevant to bime
		return
	}

	if (!requestType){
		// ignore messages that don't have a requestType, they're not relevant to bime
		return
	}

	if (requestType === 'response') {
		handleResponse(context, e)
	} else {
		handleRequest(context, e)
	}
}

function handleResponse(context, e) {
	const { messagesSent, devmode } = context
	const { id, data, error } = JSON.parse(e.data)

	if (!(id in messagesSent)) {
		if (devmode){
			warn(`Response received for unknown message. This response may be for another instance of bime.`)
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

async function handleRequest(context, e) {
	const { model } = context
	const { requestType, property, args, id } = JSON.parse(e.data)

	if (!property) {
		const label = requestType === 'function' ? 'function' : 'property'
		throwError(`The ${label} name is required, but was not provided.`)
	}

	if (!(property in model)) {
		throwError(`[ ${property} ] does not exist in the target's model.`)
	}

	// TODO: simplify this
	switch (requestType) {
		case 'property':
			if (typeof model[property] === 'function') {
				throwError(
					`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`
				)
			}
			break
		case 'function':
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

	sendResponse(context, id, response)
}

function createUUID() {
	return self.crypto.randomUUID()
}

function throwError(message) {
	throw new Error(`bime: ${message}`)
}
throwError.prototype = Error.prototype

function warn(message) {
	console.warn(`bime: ${message}`)
}

export default bime
