import { Context, ResponseMessage } from '../types'
import { bimeLogError, bimeLogWarning, cleanupHandledMessage } from '../utils'

export default function handleResponse(
	context: Context,
	messageData: ResponseMessage
) {
	const { messagesSent, devMode } = context
	const { requestId, data, error } = messageData
	const { reject, resolve, state } = messagesSent[requestId]

	if (!(requestId in messagesSent)) {
		devMode &&
			bimeLogWarning(
				`Response received for unknown message. This response may be for another instance of bime.`
			)
		return
	}

	if (error) {
		if (reject && typeof reject === 'function') {
			reject(error)
		} else {
			bimeLogError(`attempted to reject promise but reject was [${reject}]`)
		}
	} else {
		if (resolve && typeof resolve === 'function') {
			resolve(data)
		} else {
			bimeLogError(`attempted to resolve promise but resolve was [${resolve}]`)
		}
	}

	if (state) {
		state.loading = false
		state.error = error
	}

	cleanupHandledMessage(context, requestId)
}
