import { RequestType } from "./enums"

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

export type MessageData = {
	id: string
	data: ModelProperty
	error?: string
	requestType: RequestType
	property: string
	args?: any
}

export type ModelProperty = string | number | boolean | null | undefined

type ModelFunction = (...args: ModelProperty[]) => ModelItem

export type ModelItem = ModelProperty | ModelFunction
