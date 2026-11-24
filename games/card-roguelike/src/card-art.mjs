// Original starter sheet generated for this project; see public/art/README.md.
// Inline CSS resolves this relative URL against the game's document base.
const atlas = 'art/card-atlas.webp';
const cells = { ember: 0, stone: 1, dew: 2, gust: 3, flare: 4, bastion: 5, spring: 6, firestorm: 7, obsidian: 8, mist: 9 };
const artwork = new Map();
const requested = new Set();
let unavailable = false;

function cellFor(card, key) {
  if (cells[key] !== undefined) return cells[key];
  let hash = 2166136261;
  for (const c of String(key)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return card?.fused ? 4 + ((hash >>> 0) % 12) : (cells[card?.kind] ?? 15);
}

/** CSS values contain only our asset URL or a validated same-origin art route. */
export function cardArtStyle(card, key) {
  const remote = artwork.get(key);
  if (remote) return `background-image:url('${remote}');background-size:cover;background-position:center`;
  const cell = cellFor(card, key);
  return `background-image:url('${atlas}');background-size:400% 400%;background-position:${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 100 / 3}%`;
}

/** Optional enhancement. The local art and game never wait for a model response. */
export async function requestCardDiscovery(card, key, parents = [], onReady = () => {}) {
  if (unavailable || requested.has(key) || !card?.fused) return null;
  requested.add(key);
  try {
    const response = await fetch('/api/fold/discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ recipe: key, name: card.name, kind: card.kind, parents: parents.map(p => typeof p === 'string' ? p : p.name).slice(0, 2) }),
    });
    if ([404, 503].includes(response.status)) { unavailable = true; return null; }
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.artUrl === 'string' && /^\/api\/fold\/art\/[a-f0-9]{64}$/.test(data.artUrl)) artwork.set(key, data.artUrl);
    const metadata = {
      ...(typeof data.name === 'string' && data.name.length <= 48 && !/[<>\u0000-\u001f]/.test(data.name) ? { name: data.name } : {}),
      ...(typeof data.description === 'string' && data.description.length <= 180 && !/[<>\u0000-\u001f]/.test(data.description) ? { description: data.description } : {}),
    };
    onReady(metadata);
    return metadata;
  } catch { return null; }
}
