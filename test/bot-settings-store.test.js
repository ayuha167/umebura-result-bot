import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getGuildAskSettings,
  updateGuildAskSettings,
} from '../src/bot-settings-store.js';

test('サーバーごとのask設定を保存する', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bot-settings-'));
  const filePath = join(directory, 'data', 'settings.json');

  try {
    const defaults = await getGuildAskSettings(filePath, 'guild-1');
    assert.deepEqual(defaults, {
      enabled: true,
      channelId: null,
      dailyLimitPerUser: 5,
    });

    await updateGuildAskSettings(filePath, 'guild-1', {
      channelId: 'channel-1',
      dailyLimitPerUser: 10,
    });
    const saved = await getGuildAskSettings(filePath, 'guild-1');
    assert.equal(saved.channelId, 'channel-1');
    assert.equal(saved.dailyLimitPerUser, 10);
    assert.equal(saved.enabled, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
