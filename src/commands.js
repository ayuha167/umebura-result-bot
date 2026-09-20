import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const resultCommand = new SlashCommandBuilder()
  .setName('result')
  .setNameLocalizations({ ja: 'result' })
  .setDescription('ウメブラSP13の最終順位を調べます')
  .setDescriptionLocalizations({ ja: 'ウメブラSP13の最終順位を調べます' })
  .addStringOption((option) =>
    option
      .setName('account')
      .setNameLocalizations({ ja: 'account' })
      .setDescription('start.ggの選手名またはプロフィールURL')
      .setDescriptionLocalizations({
        ja: 'start.ggの選手名またはプロフィールURL',
      })
      .setRequired(true),
  );

export const askCommand = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('AIに質問します')
  .addStringOption((option) =>
    option
      .setName('question')
      .setDescription('質問内容（1000文字まで）')
      .setMaxLength(1000)
      .setRequired(true),
  );

export const askSettingsCommand = new SlashCommandBuilder()
  .setName('ask-settings')
  .setDescription('ask機能を運営向けに設定します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand.setName('status').setDescription('現在の設定を表示します'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('enabled')
      .setDescription('ask機能の有効・無効を切り替えます')
      .addBooleanOption((option) =>
        option
          .setName('value')
          .setDescription('有効にする場合はon')
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('channel')
      .setDescription('利用チャンネルを限定します（省略すると制限解除）')
      .addChannelOption((option) =>
        option
          .setName('target')
          .setDescription('askを使用できるチャンネル')
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('limit')
      .setDescription('1人あたりの1日の質問回数を設定します')
      .addIntegerOption((option) =>
        option
          .setName('count')
          .setDescription('1〜100回')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true),
      ),
  );

export const commands = [
  resultCommand.toJSON(),
  askCommand.toJSON(),
  askSettingsCommand.toJSON(),
];
