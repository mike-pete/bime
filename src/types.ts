import { RequestType } from './enums'

export type State = {
	loading: boolean
	data: Promise<ModelProperty>
	error?: string
}

export type MessageSentRecord = {
	state?: State
	acknowledged: boolean
	message: RequestMessage | ResponseMessage
	resolve?: (value: ModelProperty) => void
	reject?: (reason?: string) => void
}

export type Model = Record<string, ModelItem>

export type Context = {
	target: Window
	model: Model
	lastMessageSent?: number
	lastAckReceived: number
	lastAckSent: number
	messagesSent: Record<number, MessageSentRecord>
	targetOrigin: string
	devMode: boolean
}

export type MessageIdentifier = {
	id: number
	requestType: RequestType
}

export type RequestMessage = MessageIdentifier & {
	requestType: RequestType.function | RequestType.property
	property: string
	args?: ModelProperty[]
}

export type ResponseMessage = MessageIdentifier & {
	requestType: RequestType.response
	requestId: number
	data?: ModelProperty
	error?: string
}

export type ValidMessageData =
	| MessageIdentifier
	| RequestMessage
	| ResponseMessage

type BaseTypes = string | number | boolean | null | undefined


// TODO: rename this
export type ModelProperty =
	| BaseTypes
	| BaseTypes[]
	| Record<string | number, BaseTypes>

export type ModelFunction = (
	...args: ModelProperty[]
) => ModelProperty | Promise<ModelProperty>

export type ModelItem = ModelProperty | ModelFunction
