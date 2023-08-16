import { RequestType } from './enums'

export type State = {
	loading: boolean
	data: Promise<any>
	error?: string
}

export type MessageSentRecord = {
	state?: State
	resolve?: (value: any) => void
	reject?: (reason?: any) => void
}

export type Context = {
	target: Window
	model: Record<string, any>
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

type ModelFunction = (...args: ModelProperty[]) => ModelItem

export type ModelItem = ModelProperty | ModelFunction
