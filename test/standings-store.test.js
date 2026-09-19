import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ensureStandingsFile,
  loadStandingsFile,
  refreshStandingsFile,
} from '../src/standings-store.js';

function startggResponse(eventName, placement = 1) {
  return {
    ok: true,
    async json() {
      return {
        data: {
          event: {
            name: eventName,
            standings: {
              pageInfo: { total: 1, totalPages: 1 },
              nodes: [
                {
                  placement,
                  entrant: {
                    id: 10,
                    name: 'A選手',
                    participants: [{ gamerTag: 'A選手', user: null }],
                  },
                },
              ],
            },
          },
        },
      };
    },
  };
}

test('全順位をJSONテキストに保存して読み込める', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'standings-store-'));
  const filePath = join(directory, 'data', 'standings.json');

  try {
    await refreshStandingsFile({
      token: 'test-token',
      eventSlug: 'tournament/test/event/singles',
      tournamentLabel: 'テスト大会',
      filePath,
      fetchImpl: async () => startggResponse('Singles', 7),
    });

    const data = await loadStandingsFile(filePath);
    assert.equal(data.eventSlug, 'tournament/test/event/singles');
    assert.equal(data.tournamentLabel, 'テスト大会');
    assert.equal(data.standings[0].placement, 7);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('同じ大会の保存ファイルがあればAPIを呼ばない', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'standings-store-'));
  const filePath = join(directory, 'standings.json');
  let requestCount = 0;
  const options = {
    token: 'test-token',
    eventSlug: 'tournament/test/event/singles',
    tournamentLabel: 'テスト大会',
    filePath,
    fetchImpl: async () => {
      requestCount += 1;
      return startggResponse('Singles');
    },
  };

  try {
    const first = await ensureStandingsFile(options);
    const second = await ensureStandingsFile(options);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(requestCount, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
