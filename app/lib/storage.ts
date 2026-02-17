// app/lib/storage.ts
// Client-only storage helpers (localStorage) con guard SSR
// Include: Negozi, Depositi, Autisti, Pedane, Stock, Mancanti, Scan, History + CSV export

export type IdName = { id: string; name: string };

export type StockLocationKind = "SHOP" | "DEPOT" | "DRIVER" | "UNKNOWN";

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type PalletItem = {
  id: string; // codice pedana / QR
  note?: string;
  createdAt: number;
  updatedAt: number;

  // posizione corrente
  locationKind: StockLocationKind;
  locationId?: string; // id negozio/deposito/autista
  locationName?: string;

  // ultimi dati scansione
  lastScanAt?: number;
  lastLat?: number;
  lastLng?: number;
};

export type HistoryItem = {
  id: string; // uuid evento
  ts: number;
  palletId: string;

  action:
    | "SCAN"
    | "MOVE"
    | "CREATE"
    | "UPDATE"
    | "MISSING"
    | "FOUND"
    | "NOTE";

  fromKind?: StockLocationKind;
  fromId?: string;
  fromName?: string;

  toKind?: StockLocationKind;
  toId?: string;
  toName?: string;

  lat?: number;
  lng?: number;

  note?: string;
};

type ShopOption = { id: string; label: string; kind: StockLocationKind };
export type { ShopOption };

const KEYS = {
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  drivers: "pt_drivers_v1",
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",

  defaultShopId: "pt_default_shop_id_v1",
  defaultDepotId: "pt_default_depot_id_v1",

  lastScan: "pt_last_scan_v1",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function load<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function save<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/* -------------------------
   FORMAT / CSV
------------------------- */

export function formatDT(ts: number) {
  try {
    const d = new Date(ts);
    // formato semplice IT
    return d.toLocaleString("it-IT");
  } catch {
    return String(ts);
  }
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!isBrowser()) return;

  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    const needs = /[",\n;]/.test(s);
    const cleaned = s.replace(/"/g, '""');
    return needs ? `"${cleaned}"` : cleaned;
  };

  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r?.[h])).join(";")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/* -------------------------
   SHOPS (NEGOZI)
------------------------- */

export function getShops(): ShopItem[] {
  return load<ShopItem[]>(KEYS.shops, []);
}

export function addShop(name: string, extra?: Partial<ShopItem>): ShopItem {
  const list = getShops();
  const item: ShopItem = {
    id: uid("shop"),
    name: (name || "").trim(),
    address: extra?.address,
    note: extra?.note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.shops, list);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>): ShopItem | null {
  const list = getShops();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const next: ShopItem = {
    ...list[idx],
    ...patch,
    name: patch.name !== undefined ? String(patch.name).trim() : list[idx].name,
    updatedAt: now(),
  };
  list[idx] = next;
  save(KEYS.shops, list);
  return next;
}

// ✅ questo è uno degli errori che hai: deleteShop non esisteva
export function deleteShop(id: string) {
  const list = getShops().filter((s) => s.id !== id);
  save(KEYS.shops, list);

  // se eliminato il default, pulisci
  const def = getDefaultShop();
  if (def?.id === id) setDefaultShop(null);
}

export function getDefaultShop(): ShopItem | null {
  const id = load<string | null>(KEYS.defaultShopId, null);
  if (!id) return null;
  return getShops().find((s) => s.id === id) ?? null;
}

export function setDefaultShop(shopId: string | null) {
  if (!isBrowser()) return;
  if (!shopId) {
    localStorage.removeItem(KEYS.defaultShopId);
    return;
  }
  localStorage.setItem(KEYS.defaultShopId, JSON.stringify(shopId));
}

export function getShopOptions(): ShopOption[] {
  const shops = getShops().map((s) => ({ id: s.id, label: s.name, kind: "SHOP" as const }));
  const depots = getDepots().map((d) => ({ id: d.id, label: d.name, kind: "DEPOT" as const }));
  const drivers = getDrivers().map((dr) => ({ id: dr.id, label: dr.name, kind: "DRIVER" as const }));
  return [...shops, ...depots, ...drivers];
}

/* -------------------------
   DEPOTS (DEPOSITI)
------------------------- */

export function getDepots(): DepotItem[] {
  return load<DepotItem[]>(KEYS.depots, []);
}

export function addDepot(name: string, extra?: Partial<DepotItem>): DepotItem {
  const list = getDepots();
  const item: DepotItem = {
    id: uid("depot"),
    name: (name || "").trim(),
    address: extra?.address,
    note: extra?.note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.depots, list);
  return item;
}

export function updateDepot(id: string, patch: Partial<DepotItem>): DepotItem | null {
  const list = getDepots();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const next: DepotItem = {
    ...list[idx],
    ...patch,
    name: patch.name !== undefined ? String(patch.name).trim() : list[idx].name,
    updatedAt: now(),
  };
  list[idx] = next;
  save(KEYS.depots, list);
  return next;
}

export function deleteDepot(id: string) {
  const list = getDepots().filter((d) => d.id !== id);
  save(KEYS.depots, list);

  const def = getDefaultDepot();
  if (def?.id === id) setDefaultDepot(null);
}

export function getDefaultDepot(): DepotItem | null {
  const id = load<string | null>(KEYS.defaultDepotId, null);
  if (!id) return null;
  return getDepots().find((d) => d.id === id) ?? null;
}

export function setDefaultDepot(depotId: string | null) {
  if (!isBrowser()) return;
  if (!depotId) {
    localStorage.removeItem(KEYS.defaultDepotId);
    return;
  }
  localStorage.setItem(KEYS.defaultDepotId, JSON.stringify(depotId));
}

/* -------------------------
   DRIVERS (AUTISTI)
------------------------- */

export function getDrivers(): DriverItem[] {
  return load<DriverItem[]>(KEYS.drivers, []);
}

export function addDriver(name: string, extra?: Partial<DriverItem>): DriverItem {
  const list = getDrivers();
  const item: DriverItem = {
    id: uid("driver"),
    name: (name || "").trim(),
    phone: extra?.phone,
    note: extra?.note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.drivers, list);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>): DriverItem | null {
  const list = getDrivers();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const next: DriverItem = {
    ...list[idx],
    ...patch,
    name: patch.name !== undefined ? String(patch.name).trim() : list[idx].name,
    updatedAt: now(),
  };
  list[idx] = next;
  save(KEYS.drivers, list);
  return next;
}

export function deleteDriver(id: string) {
  const list = getDrivers().filter((d) => d.id !== id);
  save(KEYS.drivers, list);
}

/* -------------------------
   PALLETS (PEDANE) + STOCK
------------------------- */

export function getPallets(): PalletItem[] {
  return load<PalletItem[]>(KEYS.pallets, []);
}

export function getPallet(palletId: string): PalletItem | null {
  const id = (palletId || "").trim();
  if (!id) return null;
  return getPallets().find((p) => p.id === id) ?? null;
}

// ✅ usato spesso nelle pagine: upsertPallet
export function upsertPallet(patch: Partial<PalletItem> & { id: string }): PalletItem {
  const id = (patch.id || "").trim();
  const list = getPallets();
  const idx = list.findIndex((p) => p.id === id);
  const base: PalletItem =
    idx >= 0
      ? list[idx]
      : {
          id,
          createdAt: now(),
          updatedAt: now(),
          locationKind: "UNKNOWN",
        };

  const next: PalletItem = {
    ...base,
    ...patch,
    id,
    updatedAt: now(),
  };

  if (idx >= 0) list[idx] = next;
  else list.unshift(next);

  save(KEYS.pallets, list);
  return next;
}

export function setPalletLocation(params: {
  palletId: string;
  toKind: StockLocationKind;
  toId?: string;
  toName?: string;
  lat?: number;
  lng?: number;
  note?: string;
}) {
  const p = upsertPallet({
    id: params.palletId,
    locationKind: params.toKind,
    locationId: params.toId,
    locationName: params.toName,
    lastScanAt: now(),
    lastLat: params.lat,
    lastLng: params.lng,
    note: params.note,
  });

  addHistory({
    palletId: p.id,
    action: "MOVE",
    toKind: params.toKind,
    toId: params.toId,
    toName: params.toName,
    lat: params.lat,
    lng: params.lng,
    note: params.note,
  });

  return p;
}

// ✅ usato nelle pagine scan: movePalletViaScan
export function movePalletViaScan(palletId: string, option: ShopOption, gps?: { lat?: number; lng?: number }) {
  return setPalletLocation({
    palletId,
    toKind: option.kind,
    toId: option.id,
    toName: option.label,
    lat: gps?.lat,
    lng: gps?.lng,
  });
}

export function getStock() {
  // stock = tutte le pedane (filtrabile a livello pagina)
  return getPallets();
}

/* -------------------------
   MISSING (MANCANTI) - semplice flag su history
------------------------- */

export function markMissing(palletId: string, note?: string) {
  const p = upsertPallet({ id: palletId, updatedAt: now() });
  addHistory({ palletId: p.id, action: "MISSING", note });
  return p;
}

export function markFound(palletId: string, note?: string) {
  const p = upsertPallet({ id: palletId, updatedAt: now() });
  addHistory({ palletId: p.id, action: "FOUND", note });
  return p;
}

/* -------------------------
   LAST SCAN (per pagina scan)
------------------------- */

export type LastScan = {
  palletId?: string;
  ts?: number;
  lat?: number;
  lng?: number;
};

export function getLastScan(): LastScan {
  return load<LastScan>(KEYS.lastScan, {});
}

export function setLastScan(data: LastScan) {
  save(KEYS.lastScan, { ...data, ts: data.ts ?? now() });
}

/* -------------------------
   HISTORY (CRONOLOGIA)
------------------------- */

export function getHistory(): HistoryItem[] {
  // ✅ errore: getHistory non esisteva
  return load<HistoryItem[]>(KEYS.history, []);
}

export function addHistory(input: Omit<HistoryItem, "id" | "ts"> & { ts?: number }): HistoryItem {
  const list = getHistory();
  const item: HistoryItem = {
    id: uid("h"),
    ts: input.ts ?? now(),
    ...input,
  };
  list.unshift(item);
  save(KEYS.history, list);
  return item;
}

// ✅ errore: clearHistory non esisteva (ora sì)
export function clearHistory() {
  save(KEYS.history, []);
}

/* Alias utili (se in qualche pagina avevi un nome diverso) */
export function getScanHistory() {
  return getHistory();
}
export function clearScanHistory() {
  return clearHistory();
}
