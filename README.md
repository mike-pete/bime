# bime

bime simplifies bidirectional communication over [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

## How it works

-todo


## Usage

NPM: `npm i @mike.pete/bime`

CDN: `https://unpkg.com/@mike.pete/bime@latest/dist/bime.js`

-todo

## Examples

Simple count incrementer: [CodeSandbox](https://codesandbox.io/s/bime-example-vlrjcx)

## Considerations

- All responses need to be JSON serializable
- Using bime to talk to a page that contains itself in an iframe will result in unexpected errors and behavior
