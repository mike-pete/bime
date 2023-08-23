import { RequestType } from "../enums"
import { sendMessage } from "../sendMessage"
import { Context, ModelProperty, ResponseMessage } from "../types"

export default function sendResponse(
	context: Context,
	id: number,
	data: ModelProperty,
	error?: string
) {
	const response: ResponseMessage = {
		id,
		requestType: RequestType.response,
		data,
		error,
	}

	sendMessage(context, response)
}