import test from 'node:test';
import assert from 'node:assert/strict';
import {
  askErrorMessage,
  createAskService,
  createSafetyIdentifier,
  truncateDiscordMessage,
} from '../src/ask.js';

test('API利用枠不足を判別して案内する', () => {
  const message = askErrorMessage({ code: 'insufficient_quota', status: 429 });
  assert.match(message, /利用枠/);
  assert.match(message, /課金/);
});

test('Discordユーザー識別子をハッシュ化する', () => {
  const identifier = createSafetyIdentifier('guild-1', 'user-1');
  assert.match(identifier, /^[a-f0-9]{64}$/);
  assert.equal(identifier, createSafetyIdentifier('guild-1', 'user-1'));
  assert.notEqual(identifier, createSafetyIdentifier('guild-1', 'user-2'));
});

test('Discordの文字数以内に回答を短縮する', () => {
  const result = truncateDiscordMessage('a'.repeat(2100));
  assert.equal(result.length, 1900);
  assert.equal(result.at(-1), '…');
});

test('Responses APIのoutput_textを回答として返す', async () => {
  let request;
  const service = createAskService({
    apiKey: null,
    model: 'test-model',
    tournamentLabel: 'テスト大会',
    client: {
      responses: {
        async create(options) {
          request = options;
          return { output_text: '  回答です。  ' };
        },
      },
    },
  });

  const answer = await service.answer({
    question: '質問ですか？',
    guildId: 'guild-1',
    userId: 'user-1',
  });

  assert.equal(answer, '回答です。');
  assert.equal(request.model, 'test-model');
  assert.equal(request.input, '質問ですか？');
  assert.equal(request.store, false);
  assert.match(request.safety_identifier, /^[a-f0-9]{64}$/);
});
