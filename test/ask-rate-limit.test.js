import test from 'node:test';
import assert from 'node:assert/strict';
import { AskRateLimiter } from '../src/ask-rate-limit.js';

test('1日の利用上限をユーザーごとに制限する', () => {
  const limiter = new AskRateLimiter();
  const options = {
    guildId: 'guild-1',
    userId: 'user-1',
    limit: 2,
    now: new Date('2026-07-15T03:00:00Z'),
  };

  assert.equal(limiter.consume(options).allowed, true);
  const second = limiter.consume(options);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(limiter.consume(options).allowed, false);

  limiter.refund(second.key);
  assert.equal(limiter.consume(options).allowed, true);
});
