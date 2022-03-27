# Onion Compose

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/ivandotv/onion-compose/Test)
![Codecov](https://img.shields.io/codecov/c/gh/ivandotv/onion-compose)
[![GitHub license](https://img.shields.io/github/license/ivandotv/onion-compose)](https://github.com/ivandotv/onion-compose/blob/main/LICENSE)

Simple function inspired by [koa compose](https://github.com/koajs/compose) the difference is that this module accepts any number of arguments as opposed to original which accepts only one argument.

## Install

`npm i onion-compose`

## Motivation

Composing functions with `onion` style execution is a very powerful concept, especially in the `HTTP` framework for composing middleware functions, and I wanted the same middleware execution style as `koa.js` but with a middleware signature like `expressjs`, hence this little module has been created.

If you need a refresher on what is `onion style` composition, check this out:

```ts
test('Run order', async () => {
  const original: number[] = []
  const fn1 = async (arr: number[], next: () => void) => {
    arr.push(1)

    await next()

    arr.push(2)

    return 'done'
  }
  const fn2 = async (arr: number[], next: () => void) => {
    arr.push(3)

    await next()

    arr.push(4)
  }

  const result = await compose([fn1, fn2])([original])

  expect(original).toEqual(expect.arrayContaining([1, 3, 4, 2]))
  expect(result).toBe('done')
})
```

## Usage

```ts
import compose from 'compose'

const fn1 = async (a: string, b: number, next: () => void) => {
  await next()
}

const fn2 = async (a: string, b: number, next: () => void) => {
  await next()
}

const fn3 = async (a: string, b: number, next: () => void) => {
  await next()
}

await compose([fn1, fn2, fn3])(['foo', 1])
// or
await compose([fn1, fn2])(['foo', 1], fn3)
```

You can use `compose` with any number of arguments.

```ts
const fn = (
  a: string,
  b: number,
  c: boolean,
  d: string[],
  e: number[],
  _next: () => void
) => undefined

await compose([fn])(['a', 1, true, ['a', 'b'], [1, 2]])
```

One difference with `koa-compose` is that because of the arbitrary number of arguments you cannot nest `compose` inside another `compose` (which koa-compose can do), but it's very easy to achieve that with the help of a simple function.

```ts
//utility function to wrap compose before passing it to another compose
function nest(composeExec) {
  return (...args) => {
    const next = args[args.length - 1]
    args.pop()
    return composeExec(args, next)
  }
}

const fn1 = (a, next) => {
  next()
}

const fn2 = (a, next) => {
  next()
}

const fn3 = (a: string, next: () => void) => {
  next()
}

const nestedCompose = nest(compose([fn1, fn2]))

// run order: fn3, fn, fn2
await compose([fn3, nestedCompose])(['foo'])
```

Keep in mind that Typescript types can stop working when nesting `compose` inside another `compose` if you know how to make the types work, please make a pull request.

All original `koa-compose` tests are passing, except for the nested compose test (you can pass that one with the help of the utility function above).
