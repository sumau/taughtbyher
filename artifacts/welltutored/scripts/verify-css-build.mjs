import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('dist/public/assets');
const cssFiles = (await readdir(outputDir))
  .filter((fileName) => fileName.endsWith('.css'))
  .map((fileName) => path.join(outputDir, fileName));

if (cssFiles.length === 0) {
  throw new Error(`No production CSS files found in ${outputDir}`);
}

const cssStats = await Promise.all(
  cssFiles.map(async (filePath) => {
    const contents = await readFile(filePath, 'utf8');
    return {
      filePath,
      rawBytes: Buffer.byteLength(contents),
      gzipBytes: gzipSync(contents).byteLength,
      contents,
    };
  }),
);

const primary = cssStats.reduce((largest, current) =>
  current.rawBytes > largest.rawBytes ? current : largest,
);

const maxRawBytes = 115_200;
const maxGzipBytes = 19_800;

if (primary.rawBytes > maxRawBytes || primary.gzipBytes > maxGzipBytes) {
  throw new Error(
    [
      `Primary stylesheet exceeds the optimized CSS budget: ${path.basename(primary.filePath)}`,
      `raw ${primary.rawBytes} bytes (max ${maxRawBytes})`,
      `gzip ${primary.gzipBytes} bytes (max ${maxGzipBytes})`,
    ].join('; '),
  );
}

if (primary.contents.replace(/\n$/, '').includes('\n')) {
  throw new Error(
    `Primary stylesheet is not minified: ${path.basename(primary.filePath)}`,
  );
}

console.log(
  `CSS budget passed: ${path.basename(primary.filePath)} is ${primary.rawBytes} bytes raw and ${primary.gzipBytes} bytes gzip.`,
);