function bimessage(target, model = {}) {
	window.addEventListener('message', handleMessage.bind(null, model), false)

	return {
		get: getProperty.bind(null, target),
		invoke: invokeMethod.bind(null, target),
	}
}

function getProperty(target, property) {
	sendMessage(target, 'property', property)
}

function invokeMethod(target, property, args) {
	sendMessage(target, 'function', property, args)
}

// expected can be function or property
function sendMessage(target, expected, property, args = []) {
	const data = JSON.stringify({ expected, property, args })
	target.postMessage(data)
}

function handleMessage(model, e) {
	const { expected, property, args } = JSON.parse(e.data)

    if (!property){
        const label = expected === 'function' ? 'function' : 'property'
        throwError(`The ${label} name is required, but was not provided.`)
    }

    if (!(property in model)){
        throwError(`[ ${property} ] does not exist in the model.`)
    }

	switch (expected) {
		case 'property':
			if (typeof model[property] === 'function') {
				throwError(
					`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`
				)
			}
			break
        case 'function':
            if (typeof model[property] !== 'function') {
                throwError(`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`)
            }
            break
	}

	if (typeof model[property] !== 'function') {
		return model[property]
	} else {
		return model[property](...args)
	}
}

function throwError(message) {
	throw new Error(`bimessage: ${message}`)
}

export default bimessage
