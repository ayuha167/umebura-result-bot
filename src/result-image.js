import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const WIDTH = 1920;
const HEIGHT = 1080;
const FONT_FAMILY = 'GenEi Nu Gothic EB';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export async function pickRandomBackground({ directory, fallbackPath }) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter(
        (entry) =>
          entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()),
      )
      .map((entry) => join(directory, entry.name));

    if (files.length > 0) {
      return {
        backgroundPath: files[Math.floor(Math.random() * files.length)],
        useStaticOverlay: true,
      };
    }
  } catch {
    // Fall back to the bundled template when the optional image directory is unavailable.
  }

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
  staticOverlayPath = null,
}) {
  const displayName = escapeXml(formatPlayerName(playerName));
  const resultText = `${formatOrdinal(placement)} place`;
  const playerNameOverlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
         xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(1826 0) scale(1.05 1)">
        <text x="0" y="378" text-anchor="end"
              font-family="${FONT_FAMILY}" font-size="288"
              fill="#d4d4d4" fill-opacity="0.73">${displayName}</text>
      </g>
    </svg>
  `);
  const placementOverlay = Buffer.from(`
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
  `);

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
