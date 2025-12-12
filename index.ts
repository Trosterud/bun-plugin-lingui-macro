import { transformAsync } from "@babel/core";

import linguiMacroPlugin, { LinguiPluginOpts } from "@lingui/babel-plugin-lingui-macro";
import { babelRe, getBabelParserOptions } from "@lingui/cli/api/extractors/babel";
import { LinguiConfigNormalized, getConfig } from "@lingui/conf";

import type { BunPlugin } from "bun";
import fs from "node:fs/promises";
import path from "node:path";

export type Options = {
  linguiConfig?: LinguiConfigNormalized;
  babelPluginOptions?: LinguiPluginOpts;
};

export const pluginLinguiMacro = (options: Options = {}): BunPlugin => ({
  name: "lingui-macro",

  setup(builder) {
    const linguiConfig = options.linguiConfig ?? getConfig({ skipValidation: true });

    builder.onLoad({ filter: babelRe }, async ({ path: filePath }) => {
      const filename = path.relative(process.cwd(), filePath);
      const contents = await fs.readFile(filePath, "utf8");

      const hasMacroRe = /from ["']@lingui(\/.+)?\/macro["']/;

      if (!hasMacroRe.test(contents)) {
        return { contents, loader: "tsx" };
      }

      const result = await transformAsync(contents, {
        babelrc: false,
        configFile: false,
        filename,
        sourceMaps: "inline",
        parserOpts: {
          plugins: getBabelParserOptions(filename, linguiConfig.extractorParserOptions),
        },
        plugins: [
          [
            linguiMacroPlugin,
            {
              ...options.babelPluginOptions,
              linguiConfig,
            } satisfies LinguiPluginOpts,
          ],
        ],
      });

      if (!result?.code) {
        throw new Error(`Lingui macro transform failed: ${filePath}`);
      }

      return {
        contents: result.code as string,
        loader: "tsx",
      };
    });
  },
});
