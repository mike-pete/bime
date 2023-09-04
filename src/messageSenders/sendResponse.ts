import { RequestType } from '../enums'
import saveMessageSent from '../saveMessageState'
import { sendMessage } from '../sendMessage'
import { Context, ModelProperty, ResponseMessage } from '../types'
import { getNextMessageId } from '../utils'

export default function sendResponse(
	context: Context,
	requestId: number,
	data: ModelProperty,
	error?: string
) {
	const response: ResponseMessage = {
		id: getNextMessageId(context),
		requestId,
		requestType: RequestType.response,
		data,
		error,
	}

	saveMessageSent(context, response)
	sendMessage(context, response)
}
