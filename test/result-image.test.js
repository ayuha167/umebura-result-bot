import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  formatOrdinal,
  formatPlayerName,
  generateResultImage,
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
