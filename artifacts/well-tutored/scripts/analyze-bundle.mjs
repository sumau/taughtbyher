import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = path.resolve(scriptDir, "..");
const outputDir = path.join(artifactDir, "dist/public");
const report = JSON.parse(
  await readFile(path.join(artifactDir, "dist/bundle-report.json"), "utf8"),
);

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
const formatGzip = (source) => formatBytes(gzipSync(source, { level: 9 }).length);

console.log("Production JavaScript bundle report");
console.log("====================================");
console.log("Chunks:");

for (const chunk of report.chunks) {
  const source = await readFile(path.join(outputDir, chunk.fileName));
  const routeLabel = chunk.isEntry ? "entry" : "lazy";
  console.log(
    `- ${chunk.fileName} (${routeLabel}): ${formatBytes(source.length)} raw, ${formatGzip(source)} gzip`,
  );
}

const sharedModules = new Map();
for (const chunk of report.chunks) {
  if (chunk.isEntry || chunk.imports.length > 1) {
    for (const module of chunk.modules) {
      const current = sharedModules.get(module.id) ?? {
        id: module.id,
        renderedLength: 0,
        chunks: [],
      };
      current.renderedLength += module.renderedLength;
      current.chunks.push(chunk.fileName);
      sharedModules.set(module.id, current);
    }
  }
}

console.log("\nLargest shared module contributors:");
for (const module of [...sharedModules.values()]
  .sort((a, b) => b.renderedLength - a.renderedLength)
  .slice(0, 20)) {
  console.log(
    `- ${formatBytes(module.renderedLength)} ${module.id} (${module.chunks.join(", ")})`,
  );
}