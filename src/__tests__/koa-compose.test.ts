/* eslint-env jest */

// const { nest, compose } = require('..')
import { nest, compose, NextFn } from '../index'
// const assert = require('assert')
import assert from 'node:assert'
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms || 1))
}

function isPromise(x) {
  return x && typeof x.then === 'function'
}

describe('Koa Compose', function () {
  it('should work', async () => {
    const arr: number[] = []
    const stack: NextFn<[ctx: string]>[] = []

    const test: NextFn<[a: string, b: number]> = (_a: string, _b: number) => {}
    const test2: NextFn<[a: string, b: number]> = (_a: string, _b: number) => {}

    await compose<[a: string, b: number]>([test2, test])(['a', 2])

    void stack.push(async (_context: string, next) => {
      arr.push(1)
      await wait(1)
      await next()
      await wait(1)
      arr.push(6)
    })

    // stack.push(async (context, next) => {
    //   arr.push(2)
    //   await wait(1)
    //   await next()
    //   await wait(1)
    //   arr.push(5)
    // })

    // stack.push(async (context, next) => {
    //   arr.push(3)
    //   await wait(1)
    //   await next()
    //   await wait(1)
    //   arr.push(4)
    // })

    await compose<[ctx: unknown]>(stack)([{}])
    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
  })

  it('should be able to be called twice', () => {
    const stack = []

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
        assert.deepEqual(out, ctx1.arr)

        return fn([ctx2])
      })
      .then(() => {
        assert.deepEqual(out, ctx2.arr)
      })
  })

  it('should only accept an array', () => {
    expect(() => compose()).toThrow(TypeError)
  })

  it('should create next functions that return a Promise', function () {
    const stack = []
    const arr = []
    for (let i = 0; i < 5; i++) {
      stack.push((context, next) => {
        arr.push(next())
      })
    }

    compose(stack)([{}])

    for (const next of arr) {
      assert(isPromise(next), 'one of the functions next is not a Promise')
    }
  })

  it('should work with 0 middleware', function () {
    return compose([])([{}])
  })

  it('should only accept middleware as functions', () => {
    expect(() => compose([{}])).toThrow(TypeError)
  })

  it('should work when yielding at the end of the stack', async () => {
    const stack = []
    let called = false

    stack.push(async (ctx, next) => {
      await next()
      called = true
    })

    await compose(stack)([{}])
    assert(called)
  })

  it('should reject on errors in middleware', () => {
    const stack = []

    stack.push(() => {
      throw new Error()
    })

    return compose(stack)([{}]).then(
      () => {
        throw new Error('promise was not rejected')
      },
      (e) => {
        expect(e).toBeInstanceOf(Error)
      }
    )
  })

  it('should keep the context', () => {
    const ctx = {}

    const stack = []

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    return compose(stack)([ctx])
  })

  it('should catch downstream errors', async () => {
    const arr = []
    const stack = []

    stack.push(async (ctx, next) => {
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

    stack.push(async (ctx, next) => {
      arr.push(4)
      throw new Error()
    })

    await compose(stack)([{}])
    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', () => {
    let called = false

    return compose([])([{}], async () => {
      called = true
    }).then(function () {
      assert(called)
    })
  })

  it('should handle errors in wrapped non-async functions', () => {
    const stack = []

    stack.push(function () {
      throw new Error()
    })

    return compose(stack)({}).then(
      () => {
        throw new Error('promise was not rejected')
      },
      (e) => {
        expect(e).toBeInstanceOf(Error)
      }
    )
  })

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  it('should compose w/ other compositions', () => {
    const called = []

    return compose([
      nest(
        compose([
          (a, b, c, next) => {
            called.push(1)

            return next()
          },
          (a, b, c, next) => {
            called.push(2)

            return next()
          }
        ])
      ),
      (a, b, c, next) => {
        called.push(3)

        return next()
      }
    ])([1, 2, 3]).then(() => assert.deepEqual(called, [1, 2, 3]))
  })

  it('compose no args nested', () => {
    const called = []

    return compose([
      nest(
        compose([
          async (next) => {
            called.push(1)
            await next()
          },
          async (next) => {
            called.push(2)
            await next()
          }
        ])
      ),
      async (next) => {
        called.push(3)
        await next()
      }
    ])([]).then(() => assert.deepEqual(called, [1, 2, 3]))
  })

  it('compose no args - not nested', () => {
    const called = []

    return compose([
      async (next) => {
        called.push(1)
        await next()
        called.push(6)
      },
      async (next) => {
        called.push(2)
        await next()
        called.push(5)
      },
      async (next) => {
        called.push(3)
        await next()
        called.push(4)
      }
    ])([]).then(() => assert.deepEqual(called, [1, 2, 3, 4, 5, 6]))
  })

  it('double nested', async () => {
    const called = []
    //1,2,3,4,
    const nestedCompose2 = compose([
      async (ctx, next) => {
        called.push(1)
        await next()
        called.push(4)
      },
      async (ctx, next) => {
        called.push(2)
        await next()
        called.push(3)
      }
    ])

    const nestedCompose = compose([
      nest(nestedCompose2),
      async (ctx, next) => {
        called.push(5)
        await next()
        called.push(8)
      },
      async (ctx, next) => {
        called.push(6)
        await next()
        called.push(7)
      }
    ])

    const result = await compose([
      nest(nestedCompose),
      async (ctx, next) => {
        called.push(9)
        await next()
        called.push(10)
      }
    ])([{}], (ctx, next, a, b, c) => {
      const aaa = 'a'

      return 'later'
    })
    // then(() => ))
    assert.deepEqual(called, [1, 2, 5, 6, 9, 10, 7, 8, 3, 4])
  })

  it('should throw if next() is called multiple times', () => {
    return compose([
      async (ctx, next) => {
        await next()
        await next()
      }
    ])([{}]).then(
      () => {
        throw new Error('boom')
      },
      (err) => {
        assert(/multiple times/.test(err.message))
      }
    )
  })

  it('should return a valid middleware', () => {
    let val = 0

    return compose([
      nest(
        compose([
          (ctx, next) => {
            val++

            return next()
          },
          (ctx, next) => {
            val++

            return next()
          }
        ])
      ),
      (ctx, next) => {
        val++

        return next()
      }
    ])([{}]).then(function () {
      expect(val).toEqual(3)
    })
  })

  it('should return last return value', () => {
    const stack = []

    stack.push(async (context, next) => {
      const val = await next()
      expect(val).toEqual(2)

      return 1
    })

    stack.push(async (context, next) => {
      const val = await next()
      expect(val).toEqual(0)

      return 2
    })

    const next = () => 0

    return compose(stack)([{}], next).then(function (val) {
      expect(val).toEqual(1)
    })
  })

  it('should not affect the original middleware array', () => {
    const middleware = []
    const fn1 = (ctx, next) => {
      return next()
    }
    middleware.push(fn1)

    for (const fn of middleware) {
      assert.equal(fn, fn1)
    }

    compose(middleware)

    for (const fn of middleware) {
      assert.equal(fn, fn1)
    }
  })

  it('should not get stuck on the passed in next', () => {
    const middleware = [
      (ctx, next) => {
        ctx.middleware++

        return next()
      }
    ]
    const ctx = {
      middleware: 0,
      next: 0
    }

    return compose(middleware)([ctx], (ctx, next) => {
      ctx.next++

      return next()
    }).then(() => {
      expect(ctx).toEqual({ middleware: 1, next: 1 })
    })
  })
})
