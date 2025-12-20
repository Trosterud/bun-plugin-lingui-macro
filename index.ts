import { transformAsync } from "@babel/core";

import linguiMacroPlugin, { LinguiPluginOpts } from "@lingui/babel-plugin-lingui-macro";
import { babelRe, getBabelParserOptions } from "@lingui/cli/api/extractors/babel";
import {
  createCompiledCatalog,
  getCatalogs,
  getCatalogForFile,
  createCompilationErrorMessage,
} from "@lingui/cli/api";
import { LinguiConfigNormalized, getConfig } from "@lingui/conf";

import type { BunPlugin } from "bun";
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
      const contents = await Bun.file(filePath).text();

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

    // .po file loader
    builder.onLoad({ filter: /\.po$/ }, async ({ path: filePath }) => {
      const catalogRelativePath = path.relative(linguiConfig.rootDir ?? process.cwd(), filePath);
      const fileCatalog = getCatalogForFile(catalogRelativePath, await getCatalogs(linguiConfig));

      if (!fileCatalog) {
        const catalogPaths = linguiConfig.catalogs?.map((c) => c.path).join("\n") ?? "No catalogs configured";
        throw new Error(`Requested resource ${catalogRelativePath} is not matched to any of your catalogs paths specified in "lingui.config".

Resource: ${filePath}

Your catalogs:
${catalogPaths}

Working dir: 
${process.cwd()}

Please check that \`catalogs.path\` is filled properly.`);
      }

      const { locale, catalog } = fileCatalog;
      const { messages } = await catalog.getTranslations(locale ?? "en", {
        fallbackLocales: linguiConfig.fallbackLocales ?? {},
        sourceLocale: linguiConfig.sourceLocale ?? "en",
      });

      const strict = process.env.NODE_ENV !== "production";
      const { source: code, errors } = createCompiledCatalog(locale ?? "en", messages, {
        strict,
        namespace: "es",
        pseudoLocale: linguiConfig.pseudoLocale ?? "",
      });

      if (errors.length > 0) {
        const message = createCompilationErrorMessage(locale ?? "en", errors);
        console.warn(`Lingui compilation warnings for ${filePath}:\n${message}`);
      }

      return {
        contents: code,
        loader: "js",
      };
    });
  },
});
