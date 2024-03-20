import listen from "./listen/listen"
import target from "./target/target"

export type Model = Record<string, (...args: any[]) => any>

const bime = { listen, target }

export default bime
