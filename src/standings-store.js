import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchAllStandings } from './startgg.js';

const FILE_VERSION = 1;

function validateStandingsFile(data, filePath) {
  if (
    data?.version !== FILE_VERSION ||
    typeof data.eventSlug !== 'string' ||
    typeof data.eventName !== 'string' ||
    !Array.isArray(data.standings)
  ) {
    throw new Error(`順位ファイルの形式が不正です: ${filePath}`);
  }

  return data;
}

export async function loadStandingsFile(filePath) {
  const contents = await readFile(filePath, 'utf8');
  return validateStandingsFile(JSON.parse(contents), filePath);
}

export async function refreshStandingsFile({
  token,
  eventSlug,
  tournamentLabel,
  filePath,
  fetchImpl = fetch,
}) {
  const { eventName, standings } = await fetchAllStandings({
    token,
    eventSlug,
    fetchImpl,
  });
  const data = {
    version: FILE_VERSION,
    eventSlug,
    eventName,
    tournamentLabel,
    fetchedAt: new Date().toISOString(),
    standings,
  };

  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);

  return data;
}

export async function ensureStandingsFile(options) {
  try {
    const data = await loadStandingsFile(options.filePath);
    if (data.eventSlug === options.eventSlug) {
      return { data, created: false };
    }

    console.log('指定大会が変更されたため、順位ファイルを更新します。');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const data = await refreshStandingsFile(options);
  return { data, created: true };
}
