import { RequestType } from './enums'

export type State = {
	loading: boolean
	data: Promise<ModelProperty>
	error?: string
}

export type MessageSentRecord = {
	state?: State
	resolve?: (value: ModelProperty) => void
	reject?: (reason?: string) => void
}

export type Context = {
	target: Window
	model: Record<string, ModelItem>
	messagesSent: Record<string, MessageSentRecord>
	targetOrigin: string
	devMode: boolean
}

type MessageIdentifier = {
	id: string
	requestType: RequestType
}

export type RequestMessage = MessageIdentifier & {
	property: string
	args?: any
}

export type ResponseMessage = MessageIdentifier & {
	data?: ModelProperty
	error?: string
}

export type ModelProperty = string | number | boolean | null | undefined

export type ModelFunction = (...args: ModelProperty[]) => (ModelProperty | Promise<ModelProperty>)

export type ModelItem = ModelProperty | ModelFunction
