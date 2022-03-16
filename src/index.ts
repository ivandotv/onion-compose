// type NextFn = () => void | Promise<void>

export type NextFn<T extends unknown[] = never[], K = () => unknown> = (
  ...data: [...T, K]
) => void | Promise<void>

export function compose<T extends unknown[], K = NextFn>(
  middleware: NextFn<T, K>[]
) {
  if (!Array.isArray(middleware))
    throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function')
      throw new TypeError('Middleware must be composed of functions!')
  }

  return function (context: (data: T) => Promise<void>, next?: NextFn) {
    // last called middleware #
    let index = -1

    return dispatch(0)

    function dispatch(i: number): Promise<void> {
      if (i <= index)
        return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next!
      if (!fn) return Promise.resolve()
      try {
        // @ts-expect-error - not sure whats going on here
        return Promise.resolve(fn(...context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  } as unknown as (data: T, next?: NextFn<T, K>) => Promise<void>
}

export function nest(composeExec: ReturnType<typeof compose>) {
  return (...args: unknown[]) => {
    const next = args[args.length - 1]
    args.pop()

    return composeExec(args, next)
  }
}
