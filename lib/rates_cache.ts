import type { OzonRateTable } from '@/types/ozon';
import { CARRIER_IMPORTERS, ALL_CARRIERS } from '@/lib/ozon_pricing';

type CarrierKey = (typeof ALL_CARRIERS)[number];

const CACHE_NAME = 'ozon-rates-v1';

function getBuildId(): string {
  try {
    const id = (globalThis as any)?.__NEXT_DATA__?.buildId;
    return typeof id === 'string' && id.length ? id : 'dev';
  } catch {
    return 'dev';
  }
}

function lsKey(carrier: string) { return `ozon:rates:${getBuildId()}:${carrier}`; }
function cacheRequestFor(key: string): Request {
  // Use a same-origin pseudo path to store cache entries
  const url = `/__ozon_cache__/${encodeURIComponent(key)}`;
  return new Request(url, { method: 'GET' });
}

export async function getCarrierFromCache(carrier: string): Promise<OzonRateTable[] | null> {
  const key = lsKey(carrier);
  // 1) Cache Storage
  try {
    if ('caches' in globalThis) {
      const cache = await caches.open(CACHE_NAME);
      const resp = await cache.match(cacheRequestFor(key));
      if (resp) {
        const text = await resp.text();
        if (text) return JSON.parse(text) as OzonRateTable[];
      }
    }
  } catch {}
  // 2) localStorage fallback
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as OzonRateTable[];
  } catch {}
  return null;
}

export async function putCarrierToCache(carrier: string, rates: OzonRateTable[]): Promise<void> {
  const key = lsKey(carrier);
  const body = JSON.stringify(rates);
  try {
    if ('caches' in globalThis) {
      const cache = await caches.open(CACHE_NAME);
      const resp = new Response(body, { headers: { 'Content-Type': 'application/json', 'X-Build-Id': getBuildId() } });
      await cache.put(cacheRequestFor(key), resp);
    }
  } catch {}
  try {
    localStorage.setItem(key, body);
  } catch {}
}

function asCarrierKey(id: string): CarrierKey | null {
  const k = String(id || '').toLowerCase();
  return (ALL_CARRIERS as readonly string[]).includes(k) ? (k as CarrierKey) : null;
}

export async function loadCarrierRatesCached(carrier: CarrierKey): Promise<OzonRateTable[]> {
  // Try cache first
  const cached = await getCarrierFromCache(carrier);
  if (cached && Array.isArray(cached) && cached.length) return cached as OzonRateTable[];
  // Dynamic import
  const importer = CARRIER_IMPORTERS[carrier];
  if (!importer) return [];
  const mod: any = await importer();
  const src: any = mod?.default ?? mod;
  const arr: OzonRateTable[] = Array.isArray(src?.rates) ? (src.rates as OzonRateTable[]) : [];
  // Save to cache for next sessions
  await putCarrierToCache(carrier, arr);
  return arr;
}

export async function loadAllCarrierRatesCached(): Promise<OzonRateTable[]> {
  const parts = await Promise.all(ALL_CARRIERS.map((id) => loadCarrierRatesCached(id)));
  return parts.flat();
}

// Helper that accepts arbitrary string and guards it to CarrierKey
export async function loadCarrierRatesCachedStrict(id: string): Promise<OzonRateTable[]> {
  const k = asCarrierKey(id);
  if (!k) return [];
  return loadCarrierRatesCached(k);
}
