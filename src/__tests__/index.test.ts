import { compose } from '../index'

type NextFn<T = never> = (...data: T[]) => void | Promise<void>

function run2<T extends unknown[], K = NextFn>(
  fn: ((...data: [...T, K]) => void)[]
) {
  console.log(fn)

  return undefined as unknown as (
    data: T,
    next?: NextFn<[...T]>
  ) => Promise<void>
}

const mm = (_a: string, _b: string, _c: NextFn) => void {}
const cb = (_a: string, _b: string, _c: NextFn) => void {}

run2<[a: string, b: string]>([mm])(['a', 'a'], cb)

describe('Test', () => {
  test('Demo Test', () => {
    const m1 = (_a: string, _b: string, _c: string, _next: NextFn) => {}

    const composeRunner = compose<[a: string, b: string, c: string]>([m1])
    composeRunner(['1', 'b', 'c'])

    expect(true).toBe(true)
  })
})
