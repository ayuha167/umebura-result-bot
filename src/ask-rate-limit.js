function japanDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export class AskRateLimiter {
  #usage = new Map();

  consume({ guildId, userId, limit, now = new Date() }) {
    const key = `${japanDateKey(now)}:${guildId}:${userId}`;
    const used = this.#usage.get(key) || 0;

    if (used >= limit) {
      return { allowed: false, remaining: 0, key };
    }

    this.#usage.set(key, used + 1);
    return { allowed: true, remaining: limit - used - 1, key };
  }

  refund(key) {
    const used = this.#usage.get(key) || 0;
    if (used <= 1) this.#usage.delete(key);
    else this.#usage.set(key, used - 1);
  }
}
