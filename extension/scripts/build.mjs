// Builds the extension for one browser into dist/<target>/.
//
//   node scripts/build.mjs firefox
//   node scripts/build.mjs chrome
//
// Output is the Vite bundle (assets/content.js), the files in public/, and manifest.json
// taken from manifests/<target>.json with its version set from package.json.
// No post-processing is applied to the bundle.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const TARGETS = ["firefox", "chrome"];
const target = process.argv[2];

if (!TARGETS.includes(target)) {
  console.error(`Usage: node scripts/build.mjs <${TARGETS.join("|")}>`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "dist", target);
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(root, "manifests", `${target}.json`), "utf8"));
manifest.version = pkg.version;

await build({ root, logLevel: "warn", build: { outDir, emptyOutDir: true } });

writeFileSync(resolve(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built LookMeNot ${pkg.version} for ${target}: ${outDir}`);
