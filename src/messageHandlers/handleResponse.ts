import { RequestType } from '../enums'
import { Context, ResponseMessage } from '../types'
import {
	bimeLogImpossibility,
	bimeLogWarning,
	cleanupHandledMessage,
} from '../utils'
import handleAck from './handleAck'

export default function handleResponse(
	context: Context,
	response: ResponseMessage
) {
	const { messagesSent, devMode } = context
	const { requestId, data, error } = response

	if (!(requestId in messagesSent)) {
		// ignore responses for messages that we didn't send
		return
	}

	const { resolve, reject, acknowledged } = messagesSent[requestId]

	if (!(requestId in messagesSent)) {
		devMode &&
			bimeLogWarning(
				`Response received for unknown message. This response may be for another instance of bime.`
			)
		return
	}

	if (acknowledged === false) {
		bimeLogImpossibility(`Response received before message was acknowledged.`)

		// pretend there was an ack
		handleAck(context, { id: requestId, requestType: RequestType.ack })
	}

	if (error) {
		if (reject && typeof reject === 'function') {
			reject(error)
		} else {
			bimeLogImpossibility(
				`attempted to reject promise but reject was [${reject}]`
			)
		}
	} else {
		if (resolve && typeof resolve === 'function') {
			resolve(data)
		} else {
			bimeLogImpossibility(
				`attempted to resolve promise but resolve was [${resolve}]`
			)
		}
	}

	cleanupHandledMessage(context, requestId)
}
