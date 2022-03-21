export type NextFn<
  T extends any[] = any[],
  K extends () => any = () => any,
  U = any
> = (...data: [...T, K]) => U

export default function compose<T extends any[] = any[], U = any>(
  middleware: NextFn<T>[]
) {
  if (!Array.isArray(middleware))
    throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function')
      throw new TypeError('Middleware must be composed of functions!')
  }

  return function (
    data: (data: T) => Promise<void>,
    next?: NextFn<T, () => U, U>
  ) {
    // last called middleware
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
        // @ts-expect-error - problem with types for the spread operator
        return Promise.resolve(fn(...data, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  } as unknown as (data: T, next?: NextFn<T, () => U, U>) => U
}
