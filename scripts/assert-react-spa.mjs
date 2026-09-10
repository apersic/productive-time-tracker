import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (pkg.name !== "productive-time-tracker") {
  throw new Error(
    `package.json name must be productive-time-tracker, got ${pkg.name}`,
  );
}

const deps = { ...pkg.dependencies, ...pkg.devDependencies };

if ("next" in deps) {
  throw new Error("next must not be a dependency");
}

if (!deps.react) {
  throw new Error("react must be a dependency");
}

if (!deps.vite) {
  throw new Error("vite must be a dependency");
}

console.log("assert-react-spa: ok");
