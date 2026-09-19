import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const rest = new REST({ version: '10' }).setToken(config.discordBotToken);

console.log('ウメブラサーバーへBotコマンドを登録しています…');

await rest.put(
  Routes.applicationGuildCommands(
    config.discordApplicationId,
    config.discordGuildId,
  ),
  { body: commands },
);

console.log('/result、/ask、/ask-settings を登録しました。');
