import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const marpRoot = path.dirname(fileURLToPath(import.meta.url));

function renderMathInHtml(source) {
  return source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) =>
      katex.renderToString(formula.trim(), {
        displayMode: true,
        output: "htmlAndMathml",
        throwOnError: true,
      }),
    )
    .replace(/\$([^$\n]+?)\$/g, (_, formula) =>
      katex.renderToString(formula.trim(), {
        displayMode: false,
        output: "htmlAndMathml",
        throwOnError: true,
      }),
    );
}

function htmlMathPlugin(markdown) {
  const renderHtml = (tokens, index) => renderMathInHtml(tokens[index].content);
  markdown.renderer.rules.html_block = renderHtml;
  markdown.renderer.rules.html_inline = renderHtml;
}

/** @type {import('@marp-team/marp-cli').Config} */
const config = {
  allowLocalFiles: true,
  engine: ({ marp }) => marp.use(htmlMathPlugin),
  html: true,
  lang: "zh-CN",
  themeSet: path.join(marpRoot, "themes"),
  browserPath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  pdfOutlines: {
    pages: true,
    headings: true,
  },
};

export default config;
