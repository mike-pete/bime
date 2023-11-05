import { RequestType } from '../enums'
import saveMessageSent from '../saveMessageState'
import { sendMessage } from '../sendMessage'
import { Context, ModelProperty, RequestMessage } from '../types'
import { uid } from '../utils'

export default function sendRequest(
	context: Context,
	requestType: RequestType.function | RequestType.property,
	property: string,
	args: ModelProperty[] = []
) {
	const request: RequestMessage = {
		id: uid(),
		requestType,
		property,
		args,
	}

	sendMessage(context, request)
	return saveMessageSent(context, request)
}
