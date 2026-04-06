/**
 * Type-level tests for bime's end-to-end type safety.
 * This file is never executed — it's validated by `bun run typecheck`.
 * A @ts-expect-error that doesn't fire is a failing test (tsc will error).
 * Variables are intentionally unused — they exist to assert return types.
 */

import { invoke, listen } from "./bime"
import type { MessageListenerWithCleanup, MessageSender } from "./types"

const listener: MessageListenerWithCleanup = (handler) => () => {}
const sender: MessageSender = () => {}

// --- Model definition ---

const model = {
  greet: (name: string) => `Hello ${name}`,
  sum: (a: number, b: number) => a + b,
  isEven: (n: number) => n % 2 === 0,
  fetchData: async (id: string) => ({ id, value: 42 }),
  noArgs: () => "ok",
  noReturn: (msg: string) => {
    console.log(msg)
  },
}

// --- listen() should accept concrete models ---

const l = listen({ model, listener, sender })

// --- invoke() should preserve full type information ---

const i = invoke<typeof model>({ listener, sender })

// --- Correct usage should type-check ---

const a: Promise<string> = i.greet("World")
const b: Promise<number> = i.sum(1, 2)
const c: Promise<boolean> = i.isEven(4)
const d: Promise<{ id: string; value: number }> = i.fetchData("abc")
const e: Promise<string> = i.noArgs()
const f: Promise<void> = i.noReturn("hi")

// --- Wrong argument types ---

// @ts-expect-error - greet expects string, not number
i.greet(123)

// @ts-expect-error - sum expects numbers, not strings
i.sum("a", "b")

// @ts-expect-error - isEven expects number, not boolean
i.isEven(true)

// @ts-expect-error - fetchData expects string, not number
i.fetchData(42)

// --- Wrong number of arguments ---

// @ts-expect-error - sum requires 2 args
i.sum(1)

// @ts-expect-error - greet requires 1 arg
i.greet()

// @ts-expect-error - noArgs takes no args
i.noArgs("unexpected")

// --- Wrong return types ---

// @ts-expect-error - greet returns Promise<string>, not Promise<number>
const g: Promise<number> = i.greet("hi")

// @ts-expect-error - sum returns Promise<number>, not Promise<string>
const h: Promise<string> = i.sum(1, 2)

// @ts-expect-error - isEven returns Promise<boolean>, not Promise<string>
const j: Promise<string> = i.isEven(4)

// --- Async functions should stay Promise, not double-wrap ---

// fetchData is already async, should be Promise<{...}> not Promise<Promise<{...}>>
const k: Promise<{ id: string; value: number }> = i.fetchData("x")
// @ts-expect-error - should not be double-wrapped
const m: Promise<Promise<{ id: string; value: number }>> = i.fetchData("x")

// --- cleanup is available ---

const _invokeCleanup: () => void = i.cleanup
const _listenCleanup: () => void = l.cleanup
