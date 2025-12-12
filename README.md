# bun-plugin-lingui-macro

> bun plugin to compile [Lingui](https://lingui.dev) macro

## Description

The plugin will add a babel with `@lingui/babel-plugin-lingui-macro` to your bun setup.

Plugin will process only files where macro import is found.

If you already have babel or SWC in your pipeline consider to use `@lingui/babel-plugin-lingui-macro` or
`@lingui/swc-plugin` directly.

## Installation

```sh
bun add --dev bun-plugin-lingui-macro
# npm install --save-dev bun-plugin-lingui-macro
# yarn add --dev bun-plugin-lingui-macro
```

## Usage

```ts
import { pluginLinguiMacro } from "bun-plugin-lingui-macro";

await Bun.build({
  plugins: [pluginLinguiMacro()],
});
```

## License

This package is licensed under MIT license.
