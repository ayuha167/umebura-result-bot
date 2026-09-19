import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import {
  generateResultImage,
  pickRandomBackground,
} from './result-image.js';

const placement = Number.parseInt(process.argv[2] || '13', 10);
const playerName = process.argv[3] || 'ABADANGO';
const config = loadConfig();
const outputDirectory = resolve('preview');
const outputPath = resolve(outputDirectory, `result-${placement}.png`);

const background = await pickRandomBackground({
  directory: config.resultImagesDirectory,
  fallbackPath: config.resultBackgroundFile,
});
const image = await generateResultImage({
  placement,
  playerName,
  backgroundPath: background.backgroundPath,
  fontFile: config.resultFontFile,
  staticOverlayPath: background.useStaticOverlay
    ? config.resultStaticOverlayFile
    : null,
});
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, image);
console.log(`プレビューを保存しました: ${outputPath}`);
