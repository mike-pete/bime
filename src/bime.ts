import listen from "./listen/listen"
import remote from "./remote/remote"

export type Model = Record<string, (...args: any[]) => any>

const bime = { listen, remote }

export default bime
