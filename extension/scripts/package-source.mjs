// Creates artifacts/lookmenot-<version>-source.zip: the human-readable source that Mozilla
// reviewers use to rebuild the add-on. It never contains dist/, node_modules/ or artifacts/.
import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const artifactsDir = resolve(root, "artifacts");
const target = resolve(artifactsDir, `lookmenot-${pkg.version}-source.zip`);

const files = [
  ".nvmrc",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "README.md",
];
const folders = ["manifests", "public", "scripts", "src", "test-data"];

const zip = new AdmZip();

for (const file of files) {
  if (existsSync(resolve(root, file))) zip.addLocalFile(resolve(root, file));
}
for (const folder of folders) {
  zip.addLocalFolder(resolve(root, folder), folder);
}

const licensePath = resolve(root, "..", "LICENSE");
if (existsSync(licensePath)) zip.addLocalFile(licensePath);

mkdirSync(artifactsDir, { recursive: true });
zip.writeZip(target);
console.log(`Created ${target}`);
