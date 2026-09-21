import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const WIDTH = 1920;
const HEIGHT = 1080;
const FONT_FAMILY = 'GenEi Nu Gothic EB';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const PLAYER_NAME_FONT_SIZE = 288;
const LONG_PLAYER_NAME_FONT_SIZE = Number((PLAYER_NAME_FONT_SIZE * 0.6).toFixed(1));
// Keep the long-name detection available for a future layout change, but use
// the same font size for every player name for now.
const REDUCE_LONG_PLAYER_NAME = false;
// The name is right-aligned near x=1826. This threshold leaves the usual
// names at the normal size while catching names that would visibly overflow.
const PLAYER_NAME_WIDTH_THRESHOLD = 7.2;

function estimatedPlayerNameWidth(value) {
  return [...value].reduce((width, character) => {
    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(character)) {
      return width + 1;
    }
    if (/[A-Z]/.test(character)) return width + 0.86;
    if (/[a-z]/.test(character)) return width + 0.7;
    if (/[0-9]/.test(character)) return width + 0.8;
    return width + 0.55;
  }, 0);
}

export function isLongPlayerName(value) {
  const playerName = formatPlayerName(value);
  return estimatedPlayerNameWidth(playerName) > PLAYER_NAME_WIDTH_THRESHOLD;
}

export function getPlayerNameFontSize(value) {
  const isLong = isLongPlayerName(value);
  return isLong && REDUCE_LONG_PLAYER_NAME
    ? LONG_PLAYER_NAME_FONT_SIZE
    : PLAYER_NAME_FONT_SIZE;
}

function renderSvg(svg, fontFile) {
  const font = fontFile
    ? {
        fontFiles: [fontFile],
        loadSystemFonts: false,
        defaultFontFamily: FONT_FAMILY,
      }
    : { loadSystemFonts: true, defaultFontFamily: FONT_FAMILY };

  return Buffer.from(
    new Resvg(svg, { font }).render().asPng(),
  );
}

async function listImageFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()),
      )
      .map((entry) => join(directory, entry.name));
  } catch {
    return [];
  }
}

export async function pickRandomBackground({
  directory,
  fallbackPath,
  placement = null,
  day2Directory = null,
  day2MaxPlacement = 129,
}) {
  const useDay2Background =
    day2Directory &&
    Number.isInteger(placement) &&
    placement >= 1 &&
    placement <= day2MaxPlacement;
  const directories = useDay2Background
    ? [day2Directory, directory]
    : [directory];

  for (const candidateDirectory of directories) {
    const files = await listImageFiles(candidateDirectory);
    if (files.length > 0) {
      return {
        backgroundPath: files[Math.floor(Math.random() * files.length)],
        useStaticOverlay: true,
      };
    }
  }

  // Fall back to the bundled template when the optional image directory is unavailable.
  return { backgroundPath: fallbackPath, useStaticOverlay: false };
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function formatPlayerName(value) {
  const playerName = String(value ?? '').trim();
  if (!playerName) {
    throw new TypeError('選手名を指定してください。');
  }

  return playerName.toUpperCase();
}

export function formatOrdinal(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError('順位は1以上の整数で指定してください。');
  }

  const lastTwoDigits = value % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export async function generateResultImage({
  placement,
  playerName,
  backgroundPath,
  fontFile = null,
  staticOverlayPath = null,
}) {
  const displayName = escapeXml(formatPlayerName(playerName));
  const playerNameFontSize = getPlayerNameFontSize(playerName);
  const resultText = `${formatOrdinal(placement)} place`;
  const playerNameSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
         xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(1826 0) scale(1.05 1)">
        <text x="0" y="378" text-anchor="end"
              font-family="${FONT_FAMILY}" font-size="${playerNameFontSize}"
              fill="#e5e5e5" fill-opacity="0.85">${displayName}</text>
      </g>
    </svg>
  `;
  const placementSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="text-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fff200"/>
          <stop offset="100%" stop-color="#ff8500"/>
        </linearGradient>
      </defs>
      <g transform="translate(1813 0) scale(0.973 1)">
        <text x="0" y="572" text-anchor="end"
              font-family="${FONT_FAMILY}" font-size="182"
              fill="url(#text-gradient)">${resultText}</text>
      </g>
    </svg>
  `;
  const [playerNameOverlay, placementOverlay] = await Promise.all([
    renderSvg(playerNameSvg, fontFile),
    renderSvg(placementSvg, fontFile),
  ]);

  const background = sharp(backgroundPath).rotate().resize(WIDTH, HEIGHT, {
    fit: 'cover',
  });
  const overlays = [
    ...(staticOverlayPath ? [{ input: staticOverlayPath }] : []),
    {
      input: playerNameOverlay,
      top: 0,
      left: 0,
      blend: 'over',
    },
    {
      input: placementOverlay,
      top: 0,
      left: 0,
      blend: 'hard-light',
    },
  ];

  if (staticOverlayPath) {
    background.grayscale();
  }

  return background.composite(overlays).png().toBuffer();
}
