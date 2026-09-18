// Zips the built `dist/` folder into web/public/downloads/mushy-extension.zip
// so it's downloadable from the deployed site (linked from the help
// center). Run via `npm run package` (builds first, then zips).
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(extensionDir, "dist");
const outDir = join(extensionDir, "..", "web", "public", "downloads");
const outFile = join(outDir, "mushy-extension.zip");

if (!existsSync(distDir)) {
  console.error(`dist/ not found at ${distDir} -- run \`npm run build\` first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
rmSync(outFile, { force: true });

execSync(`zip -r -X "${outFile}" . -x ".*"`, { cwd: distDir, stdio: "inherit" });
console.log(`Packaged extension to ${outFile}`);
