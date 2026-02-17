// app/lib/storage.ts
// Storage unico per tutta l'app (localStorage) — safe per Next/Vercel

export type PalletItem = {
  id: string;
  code: string;
  type?: string;
  altCode?: string;
  notes?: string;

  createdTs?: number;

  // ultimi dati di tracking (da Scan)
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";
};

const KEY_PALLETS = "pallet_tracker_pallets";

// ---- helpers ----
function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid() {
  // id semplice e robusto
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ---- pallets CRUD ----
export function getPallets(): PalletItem[] {
  if (!hasLocalStorage()) return [];
  return safeParse<PalletItem[]>(window.localStorage.getItem(KEY_PALLETS), []);
}

export function setPallets(list: PalletItem[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_PALLETS, JSON.stringify(list || []));
}

export function upsertPallet(input: Partial<PalletItem> & { code: string }) {
  const all = getPallets();
  const code = (input.code || "").trim();
  if (!code) return;

  // match per id (se presente) oppure per code (case-insensitive)
  const idx =
    (input.id ? all.findIndex((x) => x.id === input.id) : -1) >= 0
      ? all.findIndex((x) => x.id === input.id)
      : all.findIndex((x) => (x.code || "").toLowerCase() === code.toLowerCase());

  const now = Date.now();

  if (idx >= 0) {
    const prev = all[idx];

    const updated: PalletItem = {
      ...prev,
      ...input,
      code,
      // non sovrascrivere createdTs se esiste già
      createdTs: prev.createdTs || input.createdTs || now,
    };

    // se arrivano dati "ultimo visto" li manteniamo
    all[idx] = updated;
  } else {
    const created: PalletItem = {
      id: input.id || uid(),
      code,
      type: input.type,
      altCode: input.altCode,
      notes: input.notes,
      createdTs: input.createdTs || now,
      lastSeenTs: input.lastSeenTs,
      lastLat: input.lastLat,
      lastLng: input.lastLng,
      lastSource: input.lastSource,
    };
    all.push(created);
  }

  setPallets(all);
}

export function deletePallet(id: string) {
  const all = getPallets();
  const next = all.filter((x) => x.id !== id);
  setPallets(next);
}
