import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import {
  formatOrdinal,
  formatPlayerName,
  generateResultImage,
  getPlayerNameFontSize,
  isLongPlayerName,
  pickRandomBackground,
} from '../src/result-image.js';

const backgroundPath = fileURLToPath(
  new URL('../assets/YourResults01.png', import.meta.url),
);
const fontFile = fileURLToPath(
  new URL('../assets/GenEiNuGothic-EB.ttf', import.meta.url),
);

test('英語の順序数を正しく作る', () => {
  assert.equal(formatOrdinal(1), '1st');
  assert.equal(formatOrdinal(2), '2nd');
  assert.equal(formatOrdinal(3), '3rd');
  assert.equal(formatOrdinal(4), '4th');
  assert.equal(formatOrdinal(11), '11th');
  assert.equal(formatOrdinal(12), '12th');
  assert.equal(formatOrdinal(13), '13th');
  assert.equal(formatOrdinal(21), '21st');
});

test('選手名を常に大文字で表示する', () => {
  assert.equal(formatPlayerName('Abadango'), 'ABADANGO');
  assert.equal(formatPlayerName('  alice & bob  '), 'ALICE & BOB');
});

test('長い選手名を判定しつつ、現在は全員288pxで描画する', () => {
  assert.equal(getPlayerNameFontSize('ABADANGO'), 288);
  assert.equal(isLongPlayerName('ABADANGO'), false);
  assert.equal(isLongPlayerName('めたら/Metara'), true);
  assert.equal(isLongPlayerName('酷く瘦せ細ったガムート'), true);
  assert.equal(getPlayerNameFontSize('めたら/Metara'), 288);
  assert.equal(getPlayerNameFontSize('酷く瘦せ細ったガムート'), 288);
});

test('背景候補は指定ディレクトリ直下のみでmaterial配下を除外する', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'result-images-'));
  try {
    await mkdir(join(directory, 'material'));
    await writeFile(join(directory, 'allowed.png'), '');
    await writeFile(join(directory, 'material', 'ignored.png'), '');

    const selected = await pickRandomBackground({
      directory,
      fallbackPath: 'fallback.png',
    });

    assert.equal(selected.backgroundPath, join(directory, 'allowed.png'));
    assert.equal(selected.useStaticOverlay, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('1920 x 1080 pxのPNG順位画像を生成する', async () => {
  const image = await generateResultImage({
    placement: 13,
    playerName: 'Abadango',
    backgroundPath,
    fontFile,
  });
  const metadata = await sharp(image).metadata();

  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1080);
});
