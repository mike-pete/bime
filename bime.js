function bimessage(target, model = {}) {
	const messagesSent = {}
	const context = { target, model, messagesSent }

	window.addEventListener('message', handleMessage.bind(null, context), false)

	return {
		get: getProperty.bind(null, context),
		invoke: invokeMethod.bind(null, context),
		logMessagesSent: () => console.log('sent', messagesSent),
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
	const { target, messagesSent } = context

	let resolve, reject

	let state = {
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

	target.postMessage(data)

	return state
}

function sendResponse(context, id, data, error) {
	const { target } = context
	const response = JSON.stringify({ id, requestType: 'response', data, error })
	target.postMessage(response)
}

function handleMessage(context, e) {
	//TODO: security checks for origin and such

	const { requestType } = JSON.parse(e.data)

	if (requestType === 'response') {
		handleResponse(context, e)
	} else {
		handleRequest(context, e)
	}
}

function handleResponse(context, e) {
	const { messagesSent } = context
	const { id, data, error } = JSON.parse(e.data)

	if (!(id in messagesSent)) {
		throwError(`Response received for unknown message id: ${id}`)
	}

	if (error) {
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
		throwError(`[ ${property} ] does not exist in the model.`)
	}

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
	throw new Error(`bimessage: ${message}`)
}

export default bimessage
