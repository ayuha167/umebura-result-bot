import 'dotenv/config';
import { resolve } from 'node:path';

const REQUIRED_KEYS = [
  'DISCORD_APPLICATION_ID',
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
  'STARTGG_TOKEN',
];

export function loadConfig(env = process.env) {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `環境変数が不足しています: ${missing.join(', ')}。` +
        ' .env.example をコピーして .env を作成してください。',
    );
  }

  return {
    discordApplicationId: env.DISCORD_APPLICATION_ID.trim(),
    discordBotToken: env.DISCORD_BOT_TOKEN.trim(),
    discordGuildId: env.DISCORD_GUILD_ID.trim(),
    startggToken: env.STARTGG_TOKEN.trim(),
    startggEventSlug:
      env.STARTGG_EVENT_SLUG?.trim() ||
      'tournament/sp12-umeburasp12/event/singles',
    tournamentLabel:
      env.STARTGG_TOURNAMENT_LABEL?.trim() || 'ウメブラSP12 Singles',
    standingsFile: resolve(
      env.STANDINGS_FILE?.trim() || 'data/standings.json',
    ),
    resultBackgroundFile: resolve(
      env.RESULT_BACKGROUND_FILE?.trim() || 'assets/YourResults01.png',
    ),
    resultImagesDirectory: resolve(
      env.RESULT_IMAGES_DIR?.trim() || 'assets/result-images',
    ),
    day2ResultImagesDirectory: resolve(
      env.RESULT_DAY2_IMAGES_DIR?.trim() || 'assets/result-images-sp13-day2',
    ),
    day2MaxPlacement: parsePositiveInteger(
      env.RESULT_DAY2_MAX_PLACEMENT,
      129,
    ),
    resultStaticOverlayFile: resolve(
      env.RESULT_STATIC_OVERLAY_FILE?.trim() ||
        'assets/YourResults01-overlay.png',
    ),
    resultFontFile: resolve(
      env.RESULT_FONT_FILE?.trim() || 'assets/GenEiNuGothic-EB.ttf',
    ),
    botSettingsFile: resolve(
      env.BOT_SETTINGS_FILE?.trim() || 'data/bot-settings.json',
    ),
    openaiApiKey: env.OPENAI_API_KEY?.trim() || null,
    openaiModel: env.OPENAI_MODEL?.trim() || 'gpt-5.6-luna',
    refreshStandingsOnStart:
      env.REFRESH_STANDINGS_ON_START?.trim().toLowerCase() === 'true',
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
