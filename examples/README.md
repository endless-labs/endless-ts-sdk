## Examples

These examples show how to build common tasks in Javascript and Typescript.

### Running an example

These examples use a linked version of the `endless` package from the main repository. To run a test, first build the package in the top level directory of this repo.

```bash
  pnpm build
```

At this point, you can run any of the examples in this directory. For example, to run the `transfer_coin` example:

```bash
  cd examples/typescript
  pnpm install
  pnpm run transfer_coin
```

This will then print out the results of the test accordingly.

### Moving an example to use the published package

Simply just replace the line in the associated `package.json` file:

```json
  "endless": "link:../../.."
```

with the appropriate version e.g.:

```json
  "endless": "latest"
```

You should be able then simply run:

```bash
    pnpm install
    pnpm test
```
