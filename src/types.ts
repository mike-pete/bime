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

export enum RequestType {
	function = 'function',
	property = 'property',
	response = 'response',
}
