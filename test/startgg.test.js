import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AccountNotFoundError,
  extractUserSlug,
  fetchAllStandings,
  findStanding,
  normalizeAccountName,
} from '../src/startgg.js';

const standings = [
  {
    placement: 7,
    entrant: {
      id: 101,
      name: 'TEAM | Ａ選手',
      participants: [
        {
          gamerTag: 'Ａ選手',
          user: { slug: 'user/abc-123' },
        },
      ],
    },
  },
  {
    placement: 13,
    entrant: {
      id: 102,
      name: 'B選手',
      participants: [
        {
          gamerTag: 'B選手',
          user: { slug: 'user/def-456' },
        },
      ],
    },
  },
];

test('選手名をNFKC・大小文字無視で比較する', () => {
  assert.equal(normalizeAccountName('  ＡBC  '), 'abc');
  assert.deepEqual(findStanding(standings, 'a選手'), {
    placement: 7,
    playerName: 'Ａ選手',
    entrantName: 'TEAM | Ａ選手',
  });
});

test('start.ggプロフィールURLからuser slugを抽出する', () => {
  assert.equal(
    extractUserSlug('https://www.start.gg/user/ABC-123'),
    'user/abc-123',
  );
  assert.equal(findStanding(standings, 'https://start.gg/user/def-456').placement, 13);
});

test('一致しない場合は専用エラーを返す', () => {
  assert.throws(
    () => findStanding(standings, '存在しない選手'),
    AccountNotFoundError,
  );
});

test('start.ggの順位を全ページ取得する', async () => {
  const requestedPages = [];
  const fetchImpl = async (_url, options) => {
    const { variables } = JSON.parse(options.body);
    requestedPages.push(variables.page);
    return {
      ok: true,
      async json() {
        return {
          data: {
            event: {
              id: 999,
              name: 'Singles',
              standings: {
                pageInfo: { total: 2, totalPages: 2 },
                nodes: [
                  {
                    placement: variables.page,
                    entrant: {
                      id: variables.page,
                      name: `Player ${variables.page}`,
                      participants: [],
                    },
                  },
                ],
              },
            },
          },
        };
      },
    };
  };

  const result = await fetchAllStandings({
    token: 'test-token',
    eventSlug: 'tournament/test/event/singles',
    fetchImpl,
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.equal(result.eventName, 'Singles');
  assert.equal(result.standings.length, 2);
});
