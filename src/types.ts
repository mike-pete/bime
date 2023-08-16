import { RequestType } from './enums'

export type State = {
	loading: boolean
	data: Promise<ModelProperty>
	error?: string
}

export type MessageSentRecord = {
	state?: State
	acknowledged: boolean
	request: RequestMessage
	resolve?: (value: ModelProperty) => void
	reject?: (reason?: string) => void
}

export type Model = Record<string, ModelItem>

export type Context = {
	target: Window
	model: Model
	lastMessageSent?: number
	lastAckReceived?: number
	lastAckSent?: number
	messagesSent: Record<string, MessageSentRecord>
	targetOrigin: string
	devMode: boolean
}

export type MessageIdentifier = {
	id: number
	requestType: RequestType
}

export type RequestMessage = MessageIdentifier & {
	property: string
	args?: ModelProperty[]
}

export type ResponseMessage = MessageIdentifier & {
	data?: ModelProperty
	error?: string
}

type BaseTypes = string | number | boolean | null | undefined

export type ModelProperty =
	| BaseTypes
	| BaseTypes[]
	| Record<string | number, BaseTypes>

export type ModelFunction = (
	...args: ModelProperty[]
) => ModelProperty | Promise<ModelProperty>

export type ModelItem = ModelProperty | ModelFunction
