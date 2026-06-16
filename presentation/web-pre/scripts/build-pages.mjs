import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../../..");
const output = path.join(root, "pages-dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "dist"), output, { recursive: true });
await cp(path.join(root, "presentation/web-pre/dist"), path.join(output, "pre"), {
  recursive: true,
});

console.log(`GitHub Pages bundle created at ${output}`);
