/* eslint-env jest */

/* NOTE: These are original tests from from koa-compose
  updated to use Jest, await syntax and TypeScirpt
*/

import { compose, NextFn } from '../index'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms || 1))
}

function isPromise(x: any) {
  return x && typeof x.then === 'function'
}

describe('Onion compose', function () {
  it('should work', async () => {
    const arr: number[] = []
    const stack: NextFn<[ctx: Record<string, any>]>[] = []

    void stack.push(async (_ctx, next) => {
      arr.push(1)
      await wait(1)
      await next()
      await wait(1)
      arr.push(6)
    })

    stack.push(async (_ctx, next) => {
      arr.push(2)
      await wait(1)
      await next()
      await wait(1)
      arr.push(5)
    })

    stack.push(async (_ctx, next) => {
      arr.push(3)
      await wait(1)
      await next()
      await wait(1)
      arr.push(4)
    })
    await compose(stack)([{}])

    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
  })

  it('should work with synchronous', async () => {
    const arr: number[] = []
    const stack: NextFn<[ctx: Record<string, any>]>[] = []

    void stack.push((_ctx, next) => {
      arr.push(1)
      next()
      arr.push(6)
    })

    stack.push((_ctx, next) => {
      arr.push(2)
      next()
      arr.push(5)
    })

    stack.push((_ctx, next) => {
      arr.push(3)
      next()
      arr.push(4)
    })
    await compose(stack)([{}])

    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
  })

  it('should be able to be called twice', () => {
    const stack: NextFn<[ctx: { arr: number[] }]>[] = []

    stack.push(async (context, next) => {
      context.arr.push(1)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(6)
    })

    stack.push(async (context, next) => {
      context.arr.push(2)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(5)
    })

    stack.push(async (context, next) => {
      context.arr.push(3)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(4)
    })

    const fn = compose(stack)
    const ctx1 = { arr: [] }
    const ctx2 = { arr: [] }
    const out = [1, 2, 3, 4, 5, 6]

    return fn([ctx1])
      .then(() => {
        expect(out).toEqual(ctx1.arr)

        return fn([ctx2])
      })
      .then(() => {
        expect(out).toEqual(ctx2.arr)
      })
  })

  it('should only accept an array', () => {
    // @ts-expect-error - error on purpose
    expect(() => compose()).toThrow(TypeError)
  })

  it('should create next functions that return a Promise', function () {
    const stack: NextFn<[Record<string, any>]>[] = []

    const arr: unknown[] = []

    for (let i = 0; i < 5; i++) {
      stack.push((_context, next) => {
        arr.push(next())
      })
    }

    compose(stack)([{}])

    for (const next of arr) {
      expect(isPromise(next)).toBe(true)
    }
  })

  it('should work with 0 middleware', function () {
    expect(() => compose([])([{}])).not.toThrow()
  })

  it('should only accept middleware as functions', () => {
    // @ts-expect-error type mismatch
    expect(() => compose([{}])).toThrow(TypeError)
  })

  it('should work when yielding at the end of the stack', async () => {
    const stack: NextFn<[ctx: any]>[] = []
    let called = false

    stack.push(async (_ctx, next) => {
      await next()
      called = true
    })

    await compose(stack)([{}])

    expect(called).toBe(true)
  })

  it('should reject on errors in middleware', async () => {
    const stack: NextFn<[Record<string, any>]>[] = []

    stack.push(() => {
      throw new Error()
    })

    await expect(compose(stack)([{}])).rejects.toBeInstanceOf(Error)
  })

  it('should keep the context', () => {
    const ctx = {}

    const stack: NextFn<[Record<string, any>]>[] = []

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })
  })

  it('should keep all the arguments', async () => {
    const arg1 = {}
    const arg2 = {}
    const arg3 = {}

    const stack: NextFn<
      [
        p1: Record<string, any>,
        p2: Record<string, any>,
        p3: Record<string, any>
      ]
    >[] = []

    stack.push(async (p1, p2, p3, next) => {
      await next()
      expect(p1).toEqual(arg1)
      expect(p2).toEqual(arg2)
      expect(p3).toEqual(arg3)

      return [p1, p2, p3]
    })

    stack.push(async (p1, p2, p3, next) => {
      await next()
      expect(p1).toEqual(arg1)
      expect(p2).toEqual(arg2)
      expect(p3).toEqual(arg3)
    })
    stack.push(async (p1, p2, p3, next) => {
      await next()
      expect(p1).toEqual(arg1)
      expect(p2).toEqual(arg2)
      expect(p3).toEqual(arg3)
    })

    const [p1Result, p2Result, p3Result] = await compose(stack)([
      arg1,
      arg2,
      arg3
    ])

    expect(p1Result).toBe(arg1)
    expect(p2Result).toBe(arg2)
    expect(p3Result).toBe(arg3)
  })
  it('should catch downstream errors', async () => {
    const arr: number[] = []
    const stack: NextFn<[ctx: any]>[] = []

    stack.push(async (_ctx, next) => {
      arr.push(1)
      try {
        arr.push(6)
        await next()
        arr.push(7)
      } catch (err) {
        arr.push(2)
      }
      arr.push(3)
    })

    stack.push(async (_ctx) => {
      arr.push(4)
      throw new Error()
    })

    await compose(stack)([{}])

    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', async () => {
    let called = false

    const next = async () => {
      called = true
    }
    const run = compose([])
    await run([1, 3], next)

    expect(called).toBe(true)
  })

  it('should handle errors in wrapped non-async functions', async () => {
    const stack: NextFn<[ctx: Record<string, any>]>[] = []

    stack.push(function () {
      throw new Error()
    })

    await expect(compose(stack)([{}])).rejects.toBeInstanceOf(Error)
  })

  it('should throw if next() is called multiple times', async () => {
    const fn = async (_ctx: any, next: () => Promise<void> | void) => {
      await next()
      await next()
    }

    expect.assertions(1)
    try {
      await compose<[ctx: any]>([fn])([{}])
    } catch (e) {
      /* eslint-disable jest/no-conditional-expect */
      expect((e as Error).message).toMatch(/multiple times/)
    }
  })

  it('should return last return value', async () => {
    const stack: NextFn<
      [ctx: number],
      () => Promise<number>,
      Promise<number>
    >[] = []

    stack.push(async (_ctx, next) => {
      const val = await next()
      expect(val).toEqual(2)

      return 1
    })

    stack.push(async (_ctx, next) => {
      const val = await next()
      expect(val).toEqual(0)

      return 2
    })

    const next: NextFn<
      [ctx: any],
      () => Promise<number>,
      Promise<number>
    > = async (_ctx: any) => 0

    const result = await compose<[ctx: number], Promise<number>>(stack)(
      [2],
      next
    )

    expect(result).toEqual(1)
  })

  it('should not affect the original middleware array', () => {
    const middleware: NextFn<[ctx: string]>[] = []

    const fn1: NextFn<[ctx: string]> = (_ctx, next) => {
      return next()
    }

    middleware.push(fn1)

    for (const fn of middleware) {
      expect(fn).toBe(fn1)
    }

    compose(middleware)

    for (const fn of middleware) {
      expect(fn).toBe(fn1)
    }
  })

  it('should not get stuck on the passed in next', async () => {
    const ctx = {
      middleware: 0,
      next: 0
    }
    const middleware = (ctx: { middleware: number }, next: () => unknown) => {
      ctx.middleware++

      return next()
    }

    await compose<[ctx: { middleware: number; next: number }]>([middleware])(
      [ctx],
      (ctx, next) => {
        ctx.next++

        return next()
      }
    )

    expect(ctx).toEqual({ middleware: 1, next: 1 })
  })
})
