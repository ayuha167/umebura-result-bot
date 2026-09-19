const STARTGG_ENDPOINT = 'https://api.start.gg/gql/alpha';
const PAGE_SIZE = 100;

const EVENT_STANDINGS_QUERY = `
  query EventStandings($slug: String!, $page: Int!, $perPage: Int!) {
    event(slug: $slug) {
      id
      name
      standings(query: {page: $page, perPage: $perPage}) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          placement
          entrant {
            id
            name
            participants {
              gamerTag
              user {
                slug
              }
            }
          }
        }
      }
    }
  }
`;

export class StartggError extends Error {}
export class AccountNotFoundError extends Error {}
export class AmbiguousAccountError extends Error {
  constructor(matches) {
    super('同じ選手名に一致する参加者が複数見つかりました。');
    this.matches = matches;
  }
}

export function normalizeAccountName(value) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ja-JP');
}

export function extractUserSlug(value) {
  const normalized = value.trim();
  const match = normalized.match(
    /(?:https?:\/\/(?:www\.)?start\.gg\/)?(user\/[a-z0-9_-]+)/i,
  );
  return match ? match[1].toLowerCase() : null;
}

async function requestStartgg({ token, query, variables, fetchImpl = fetch }) {
  const response = await fetchImpl(STARTGG_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new StartggError(
      `start.gg APIがHTTP ${response.status}を返しました。`,
    );
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new StartggError(
      `start.gg APIエラー: ${payload.errors.map((error) => error.message).join(' / ')}`,
    );
  }

  return payload.data;
}

export async function fetchAllStandings({
  token,
  eventSlug,
  fetchImpl = fetch,
}) {
  const standings = [];
  let eventName = null;
  let page = 1;
  let totalPages = 1;

  do {
    const data = await requestStartgg({
      token,
      query: EVENT_STANDINGS_QUERY,
      variables: { slug: eventSlug, page, perPage: PAGE_SIZE },
      fetchImpl,
    });

    if (!data.event) {
      throw new StartggError(
        `start.ggイベントが見つかりません: ${eventSlug}`,
      );
    }

    eventName = data.event.name;
    const connection = data.event.standings;
    standings.push(...(connection?.nodes || []));
    totalPages = connection?.pageInfo?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return { eventName, standings };
}

function standingDisplayName(standing) {
  return (
    standing.entrant?.participants?.[0]?.gamerTag ||
    standing.entrant?.name ||
    '名前不明'
  );
}

export function findStanding(standings, accountInput) {
  const requestedSlug = extractUserSlug(accountInput);
  const requestedName = normalizeAccountName(accountInput);

  const matches = standings.filter((standing) => {
    const entrant = standing.entrant;
    if (!entrant) return false;

    if (requestedSlug) {
      return entrant.participants?.some(
        (participant) => participant.user?.slug?.toLowerCase() === requestedSlug,
      );
    }

    const participantMatch = entrant.participants?.some(
      (participant) =>
        participant.gamerTag &&
        normalizeAccountName(participant.gamerTag) === requestedName,
    );
    const entrantMatch =
      entrant.name && normalizeAccountName(entrant.name) === requestedName;

    return participantMatch || entrantMatch;
  });

  if (matches.length === 0) {
    const suggestions = standings
      .map(standingDisplayName)
      .filter((name) => normalizeAccountName(name).includes(requestedName))
      .slice(0, 5);
    const suffix = suggestions.length
      ? ` 候補: ${suggestions.join('、')}`
      : '';
    throw new AccountNotFoundError(
      `「${accountInput}」に一致する選手が見つかりませんでした。${suffix}`,
    );
  }

  if (matches.length > 1) {
    throw new AmbiguousAccountError(
      matches.map((standing) => ({
        name: standingDisplayName(standing),
        entrantId: standing.entrant.id,
      })),
    );
  }

  const standing = matches[0];
  return {
    placement: standing.placement,
    playerName: standingDisplayName(standing),
    entrantName: standing.entrant.name,
  };
}

export async function getPlacementForAccount(options) {
  const { eventName, standings } = await fetchAllStandings(options);
  return {
    eventName,
    ...findStanding(standings, options.accountInput),
  };
}
