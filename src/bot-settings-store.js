import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const FILE_VERSION = 1;
const DEFAULT_ASK_SETTINGS = Object.freeze({
  enabled: true,
  channelId: null,
  dailyLimitPerUser: 5,
});

let updateQueue = Promise.resolve();

function validate(data, filePath) {
  if (data?.version !== FILE_VERSION || typeof data.guilds !== 'object') {
    throw new Error(`Bot設定ファイルの形式が不正です: ${filePath}`);
  }
  return data;
}

async function writeSettings(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

export async function ensureBotSettingsFile(filePath) {
  try {
    return await loadBotSettings(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const data = { version: FILE_VERSION, guilds: {} };
    await writeSettings(filePath, data);
    return data;
  }
}

export async function loadBotSettings(filePath) {
  const contents = await readFile(filePath, 'utf8');
  return validate(JSON.parse(contents), filePath);
}

export async function getGuildAskSettings(filePath, guildId) {
  const data = await ensureBotSettingsFile(filePath);
  return {
    ...DEFAULT_ASK_SETTINGS,
    ...(data.guilds[guildId]?.ask || {}),
  };
}

export function updateGuildAskSettings(filePath, guildId, changes) {
  const operation = updateQueue.then(async () => {
    const data = await ensureBotSettingsFile(filePath);
    const current = {
      ...DEFAULT_ASK_SETTINGS,
      ...(data.guilds[guildId]?.ask || {}),
    };
    const next = { ...current, ...changes };
    data.guilds[guildId] = { ...(data.guilds[guildId] || {}), ask: next };
    await writeSettings(filePath, data);
    return next;
  });

  updateQueue = operation.catch(() => {});
  return operation;
}
