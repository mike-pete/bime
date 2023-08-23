import { RequestType } from '../enums'
import sendResponse from '../messageSenders/sendResponse';
import { Context, ModelFunction, ModelProperty, RequestMessage } from '../types'
import { bimeThrowError } from '../utils'

function validPropertyRequest(
	context: Context,
	messageData: RequestMessage
): { valid: boolean; error: string | undefined } {
	const { model } = context
	const { requestType, property } = messageData

	const propertyError = (error: string) => ({ valid: false, error })

	if (!property) {
		const label = requestType === RequestType.function ? 'function' : 'property'
		return propertyError(`The ${label} name is required, but was not provided.`)
	}

	if (!(property in model)) {
		return propertyError(
			`[ ${property} ] does not exist in the target's model.`
		)
	}

	switch (requestType) {
		case RequestType.property:
			if (typeof model[property] === 'function') {
				return propertyError(
					`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`
				)
			}
			break
		case RequestType.function:
			if (typeof model[property] !== 'function') {
				return propertyError(
					`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`
				)
			}
			break
	}

	return { valid: true, error: '' }
}

export default async function handleRequest(
	context: Context,
	messageData: RequestMessage
) {
	const { model } = context
	const { property, args, id } = messageData

	const { valid, error: propertyError } = validPropertyRequest(
		context,
		messageData
	)

	if (!valid) {
		bimeThrowError(propertyError ?? 'something went wrong')
	}

	let response: ModelProperty

	if (typeof model[property] !== 'function') {
		response = model[property] as ModelProperty
	} else {
		const functionToInvoke = model[property] as ModelFunction
		response = await functionToInvoke(...(args ?? []))
	}

	// TODO
	let error

	sendResponse(context, id, response, error)
}
