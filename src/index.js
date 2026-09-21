import {
  AttachmentBuilder,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { askErrorMessage, createAskService } from './ask.js';
import { AskRateLimiter } from './ask-rate-limit.js';
import {
  ensureBotSettingsFile,
  getGuildAskSettings,
  updateGuildAskSettings,
} from './bot-settings-store.js';
import { loadConfig } from './config.js';
import {
  AccountNotFoundError,
  AmbiguousAccountError,
  findStanding,
} from './startgg.js';
import {
  ensureStandingsFile,
  loadStandingsFile,
} from './standings-store.js';
import {
  generateResultImage,
  pickRandomBackground,
} from './result-image.js';

const config = loadConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const askService = createAskService({
  apiKey: config.openaiApiKey,
  model: config.openaiModel,
  tournamentLabel: config.tournamentLabel,
});
const askRateLimiter = new AskRateLimiter();

const initialStandings = await ensureStandingsFile({
  token: config.startggToken,
  eventSlug: config.startggEventSlug,
  tournamentLabel: config.tournamentLabel,
  filePath: config.standingsFile,
  forceRefresh: config.refreshStandingsOnStart,
});
console.log(
  initialStandings.created
    ? `${initialStandings.data.standings.length}件の順位をローカルに保存しました。`
    : `${initialStandings.data.standings.length}件のローカル順位を読み込みました。`,
);
await ensureBotSettingsFile(config.botSettingsFile);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`${readyClient.user.tag} としてログインしました。`);
});

async function handleResult(interaction) {
  await interaction.deferReply();
  const accountInput = interaction.options.getString('account', true);

  try {
    const localData = await loadStandingsFile(config.standingsFile);
    const result = findStanding(localData.standings, accountInput);

    if (!Number.isInteger(result.placement)) {
      await interaction.editReply(
        `${result.playerName}選手の最終順位はまだ確定していません。`,
      );
      return;
    }

    const background = await pickRandomBackground({
      directory: config.resultImagesDirectory,
      fallbackPath: config.resultBackgroundFile,
      placement: result.placement,
      day2Directory: config.day2ResultImagesDirectory,
      day2MaxPlacement: config.day2MaxPlacement,
    });
    const image = await generateResultImage({
      placement: result.placement,
      playerName: result.playerName,
      backgroundPath: background.backgroundPath,
      fontFile: config.resultFontFile,
      staticOverlayPath: background.useStaticOverlay
        ? config.resultStaticOverlayFile
        : null,
    });
    const attachment = new AttachmentBuilder(image, {
      name: `result-${result.placement}.png`,
    });

    await interaction.editReply({
      content:
        `${result.playerName}選手、あなたは${config.tournamentLabel}で` +
        `**${result.placement}位**でした！`,
      files: [attachment],
    });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      await interaction.editReply(error.message);
      return;
    }

    if (error instanceof AmbiguousAccountError) {
      const names = error.matches.map((match) => match.name).join('、');
      await interaction.editReply(
        `同じ名前の参加者が複数見つかりました（${names}）。` +
          'start.ggプロフィールURLでお試しください。',
      );
      return;
    }

    console.error(error);
    await interaction.editReply(
      '順位の取得中にエラーが発生しました。時間を置いて再度お試しください。',
    );
  }
}

async function handleAsk(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: '/askはDiscordサーバー内で使用してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = await getGuildAskSettings(config.botSettingsFile, guildId);
  if (!settings.enabled) {
    await interaction.reply({
      content: '現在、/askは運営によって停止されています。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (settings.channelId && interaction.channelId !== settings.channelId) {
    await interaction.reply({
      content: `/askは <#${settings.channelId}> で使用してください。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!askService.configured) {
    await interaction.reply({
      content:
        '/askのコマンドは準備済みですが、OpenAI APIキーがまだ設定されていません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const usage = askRateLimiter.consume({
    guildId,
    userId: interaction.user.id,
    limit: settings.dailyLimitPerUser,
  });
  if (!usage.allowed) {
    await interaction.reply({
      content: `本日の/ask利用上限（${settings.dailyLimitPerUser}回）に達しました。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  try {
    const answer = await askService.answer({
      question: interaction.options.getString('question', true),
      guildId,
      userId: interaction.user.id,
    });
    await interaction.editReply({
      content: answer,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    askRateLimiter.refund(usage.key);
    console.error('Ask error:', error);
    await interaction.editReply(askErrorMessage(error));
  }
}

function askSettingsSummary(settings) {
  return [
    `ask機能: **${settings.enabled ? '有効' : '無効'}**`,
    `利用チャンネル: ${settings.channelId ? `<#${settings.channelId}>` : 'すべて'}`,
    `1人あたりの上限: **1日${settings.dailyLimitPerUser}回**`,
  ].join('\n');
}

async function handleAskSettings(interaction) {
  if (
    !interaction.guildId ||
    !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  ) {
    await interaction.reply({
      content: 'このコマンドには「サーバーを管理」権限が必要です。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  let settings;

  if (subcommand === 'enabled') {
    settings = await updateGuildAskSettings(
      config.botSettingsFile,
      interaction.guildId,
      { enabled: interaction.options.getBoolean('value', true) },
    );
  } else if (subcommand === 'channel') {
    settings = await updateGuildAskSettings(
      config.botSettingsFile,
      interaction.guildId,
      { channelId: interaction.options.getChannel('target')?.id || null },
    );
  } else if (subcommand === 'limit') {
    settings = await updateGuildAskSettings(
      config.botSettingsFile,
      interaction.guildId,
      { dailyLimitPerUser: interaction.options.getInteger('count', true) },
    );
  } else {
    settings = await getGuildAskSettings(
      config.botSettingsFile,
      interaction.guildId,
    );
  }

  await interaction.reply({
    content: askSettingsSummary(settings),
    flags: MessageFlags.Ephemeral,
  });
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'result') await handleResult(interaction);
    else if (interaction.commandName === 'ask') await handleAsk(interaction);
    else if (interaction.commandName === 'ask-settings') {
      await handleAskSettings(interaction);
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const message = 'コマンドの処理中にエラーが発生しました。';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction
        .reply({ content: message, flags: MessageFlags.Ephemeral })
        .catch(() => {});
    }
  }
});

client.on(Events.Error, (error) => console.error('Discord client error:', error));

await client.login(config.discordBotToken);
