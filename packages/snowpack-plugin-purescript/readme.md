# snowpack-plugin-purescript

Snowpack Plugin for modern Purescript integration.

> NOTE: Super early in development. Great to experiment with but not ready for production.

## Why?

Snowpack users and developers prefer simple to use tools. Currently the process of Purescript and Snowpack is non existent, so this is a start.

## Features

- [ ] Integrates tightly with Snowpack's **build pipeline**
- [ ] Rebuilds when files change (todo)
- [ ] Optionally bundle with `spago bundle-module` (todo)
- [ ] Optionally expose `spago-project/output` to a bundler within snowpack.

## Installation

### Prerequisites

You should have `spago` on your system, which also means the following software on your system:

- git
- purescript
- spago

### Plugin

> NOTE: This will not work yet, as this package is yet to be published.

Run one of the following, determined by your package manager of choice.

```
pnpm add snowpack-plugin-purescript
```

```
yarn add snowpack-plugin-purescript

```

```
npm install snowpack-plugin-purescript

```

## Usage

### Snowpack Config

1. Mount a folder with files that contain `.purs`.
2. Point to directory containing `spago.dhall`.

We use `spago` under the hood to get information about your Purescript project,
so there's not much configuration.

If you're not using `spago` for you project, I assume you have enough experience to make your project into a spago project.
Supporting non-spago projects is a non-goal of this library.

```js
module.exports = {
  mount: {
    "my-spago-project/src/": "/purescript",
    public: "/",
  },
  plugins: [
    [
      "snowpack-plugin-purescript",
      {
        // defaults to "./"
        spagoDirectory: "my-spago-project/",
      },
    ],
  ],
};
```

### Purescript

```sh
mkdir my-spago-project
cd my-spago-project
spago init
```

`spago init` creates file `src/Main.purs` containing a `main` function that logs to the console.
We will import this into our HTML later.

`my-spago-project/src/Main.purs`

```purescript
-- This plugin resolves the correct folder name
-- regardless of what the module name is.
module Main where

import Prelude

import Effect (Effect)
import Effect.Console (log)

main :: Effect Unit
main = do
  log "🍝"
```

### HTML/JS

Import the generated javscript from the mount point and call the function.

`public/index.html`

```html
<html lang="en">
  <body>
    <script type="module" src="/purescript">
      import { main } from './main/index.js';

      main()
    </script>
  </body>
</html>
```

Run `snowpack dev` and you'll be welcome with a message from within the console!

## How it works

It's magic.

Just kidding, here are some of the details:

- Symlinks the source directory structure and symbolically links it to the correct **module** (ie. `module Control.Monad where ...` module is `Control.Monad`) during build.
- `spago` is called once during plugin initialization, then in batches at minimum every 2 seconds when a purescript file changes (last bit todo)

### During Development

- `spago build --watch` is being used to watch for file changes.
- The `<spago-project>/output` folder is mounted to `/snowpack_plugin_purescript/output`.
- The input file is

### During Building

- `spago bundle-module` is used to create the final bundle.
