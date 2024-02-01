import invokeHandler from './listen/invokeHandler'
import target from './target/target'

export type Model = Record<string, (...args: any[]) => any>

const bime = { listen: invokeHandler, target }

export default bime
