import { loadConfig } from './config.js';
import { refreshStandingsFile } from './standings-store.js';

const config = loadConfig();

console.log(`${config.tournamentLabel}の全順位をstart.ggから取得しています…`);
const data = await refreshStandingsFile({
  token: config.startggToken,
  eventSlug: config.startggEventSlug,
  tournamentLabel: config.tournamentLabel,
  filePath: config.standingsFile,
});
console.log(
  `${data.standings.length}件の順位を ${config.standingsFile} へ保存しました。`,
);
