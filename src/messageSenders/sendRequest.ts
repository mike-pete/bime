import { RequestType } from '../enums'
import saveMessageSent from '../saveMessageState'
import { sendMessage } from '../sendMessage'
import { Context, ModelProperty, RequestMessage } from '../types'
import { getNextMessageId } from '../utils'

export default function sendRequest(
	context: Context,
	requestType: RequestType.function | RequestType.property,
	property: string,
	args: ModelProperty[] = []
) {
	// TODO: if handshake not complete, queue message

	const id = getNextMessageId(context)
	const request: RequestMessage = {
		id,
		requestType,
		property,
		args,
	}

	const state = saveMessageSent(context, request)
	sendMessage(context, request)
	return state
}
