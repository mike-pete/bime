import { expect, jest, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { invoke as bimeInvoke, listen as bimeListen } from './bime'

function createTransport() {
  const id = crypto.randomUUID()
  const cleanupMock = jest.fn()
  const event = new EventEmitter()
  const listener = (handler: (message: string) => void) => {
    event.on(id, handler)

    const cleanup = () => {
      event.off(id, handler)
      cleanupMock()
    }

    return cleanup
  }

  const sender = (message: string) => {
    event.emit(id, message)
  }

  return {
    listener,
    sender,
    cleanupMock,
  }
}

function createInstance<Model extends Record<string, (...args: any[]) => any>>(
  model: Model,
) {
  const { listener, sender, cleanupMock } = createTransport()
  const listen = bimeListen({ model, listener, sender })
  const invoke = bimeInvoke<Model>({ listener, sender })

  return {
    listen,
    invoke,
    cleanupMock,
  }
}

test('happy path message passing works', async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
    print: (message: string) => {
      console.log(message)
    },
    sum: (a: number, b: number) => a + b,
    isEven: (n: number) => n % 2 === 0,
    willThrow: () => {
      throw new Error('This is a test error')
    },
    async asyncResolve() {
      return await Promise.resolve('Hello')
    },
    async asyncReject() {
      return await Promise.reject(new Error('This is a test async error'))
    },
  }
  const { invoke } = createInstance(model)

  expect(await invoke.sayHello('World')).toEqual('Hello World')
  expect(await invoke.sayHello('Bime')).toEqual('Hello Bime')
  expect(async () => {
    await invoke.print('it works!')
  }).not.toThrow()
  expect(await invoke.sum(1, 2)).toEqual(3)
  expect(await invoke.isEven(2)).toEqual(true)
  expect(await invoke.isEven(3)).toEqual(false)
  await expect(invoke.willThrow()).rejects.toThrow('This is a test error')
  expect(await invoke.asyncResolve()).toEqual('Hello')
  await expect(invoke.asyncReject()).rejects.toThrow(
    'This is a test async error',
  )
})

test('concurrent invocations resolve to correct values', async () => {
  const model = {
    double: (n: number) => n * 2,
    greet: (name: string) => `Hi ${name}`,
  }
  const { invoke } = createInstance(model)

  const [a, b, c, d] = await Promise.all([
    invoke.double(5),
    invoke.greet('Alice'),
    invoke.double(10),
    invoke.greet('Bob'),
  ])

  expect(a).toEqual(10)
  expect(b).toEqual('Hi Alice')
  expect(c).toEqual(20)
  expect(d).toEqual('Hi Bob')
})

test('invalid JSON throws', () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { listener, sender } = createTransport()
  bimeListen({ model, listener, sender })

  expect(() => sender('not valid json!!!')).toThrow()
})

test('valid JSON with wrong shape is silently ignored', async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { listener, sender } = createTransport()
  bimeListen({ model, listener, sender })

  sender(JSON.stringify({ wrong: 'shape' }))
  sender(JSON.stringify({ id: '1', type: 'unknown' }))

  // Listener still works after bad messages
  const invoke = bimeInvoke<typeof model>({ listener, sender })
  expect(await invoke.sayHello('World')).toEqual('Hello World')
})

test('non-existent model methods throw errors', async () => {
  const model = {}
  const { invoke } = createInstance(model)

  // @ts-expect-error - This should throw an error
  expect(() => invoke.doesNotExist()).toThrow(
    new ReferenceError('"doesNotExist" is not a procedure on the model'),
  )
})

test("cannot use 'cleanup' as a model method", async () => {
  const model = {
    cleanup: () => {
      console.log('cleanup')
    },
  }

  expect(() =>
    bimeListen({
      model,
      listener: (_handler: (message: string) => void) => () => undefined,
      sender: () => undefined,
    }),
  ).toThrow(
    new ReferenceError(
      '"cleanup" is a reserved name and cannot be used on the model.',
    ),
  )
})

test('listen cleanup works', async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { listen, cleanupMock } = createInstance(model)

  expect(listen.cleanup).toBeDefined()

  listen.cleanup()
  expect(cleanupMock).toHaveBeenCalled()
})

test('invoke cleanup works', async () => {
  const model = {
    sayHello: (name: string) => `Hello ${name}`,
  }
  const { invoke, cleanupMock } = createInstance(model)

  expect(invoke.cleanup).toBeDefined()

  invoke.cleanup()
  expect(cleanupMock).toHaveBeenCalled()

  await expect(invoke.sayHello('Mike')).rejects.toThrow(
    'The response listener has been cleaned up.',
  )
})
