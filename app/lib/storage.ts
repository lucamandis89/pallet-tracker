// app/lib/storage.ts
// Client-only storage helpers (localStorage)
// Mantiene: Negozi, Depositi, Autisti, Pedane, Stock, Scansioni, Storico, Mancanti
// NOTE: in SSR window/localStorage non esistono -> tutte le funzioni sono "safe".

export type IdName = { id: string; name: string };

export type StockLocationKind = "shop" | "depot";

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
  id: string; // palletId (codice)
  status?: "IN_STOCK" | "IN_TRANSIT" | "DELIVERED" | "MISSING";
  locationKind?: StockLocationKind;
  locationId?: string; // shopId/depotId
  driverId?: string;
  note?: string;
  updatedAt: number;
  createdAt: number;
};

export type HistoryItem = {
  id: string;
  palletId: string;
  action:
    | "SCAN"
    | "REGISTER"
    | "MOVE"
    | "DELIVERED"
    | "MISSING"
    | "FOUND"
    | "NOTE"
    | "STOCK";
  note?: string;

  // opzionali (se li usi in UI)
  locationKind?: StockLocationKind;
  locationId?: string;
  driverId?: string;

  ts: number;
};

export type ScanHistoryItem = {
  id: string;
  payload: string; // testo QR letto
  ts: number;
};

export type MissingItem = {
  id: string;
  palletId: string;
  note?: string;
  createdAt: number;
  resolvedAt?: number;
  resolved?: boolean;
};

// -------------------------
// Keys
// -------------------------
const KEYS = {
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  drivers: "pt_drivers_v1",
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",
  scanHistory: "pt_scan_history_v1",
  lastScan: "pt_last_scan_v1",
  missing: "pt_missing_v1",
};

// -------------------------
// Safe localStorage helpers
// -------------------------
function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function load<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// -------------------------
// Date formatting
// -------------------------
export function formatDT(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

// -------------------------
// HISTORY (Storico)
// -------------------------
export function getHistory(): HistoryItem[] {
  return load<HistoryItem[]>(KEYS.history, []);
}

export function addHistory(e: Omit<HistoryItem, "id" | "ts"> & { ts?: number }) {
  const list = getHistory();
  const item: HistoryItem = {
    id: uid("hist"),
    ts: e.ts ?? now(),
    palletId: (e.palletId || "").trim(),
    action: e.action,
    note: e.note,
    locationKind: e.locationKind,
    locationId: e.locationId,
    driverId: e.driverId,
  };
  list.unshift(item);
  save(KEYS.history, list);
  return item;
}

export function clearHistory() {
  save(KEYS.history, [] as HistoryItem[]);
}

// Scarica CSV dello storico (se non passi nulla, usa getHistory())
export function downloadCsv(items?: HistoryItem[], filename = "history.csv") {
  if (!hasStorage()) return;

  const rows = (items ?? getHistory()).slice().reverse(); // cronologico
  const header = ["ts", "palletId", "action", "note", "locationKind", "locationId", "driverId"];

  const esc = (v: unknown) => {
    const s = (v ?? "").toString().replaceAll('"', '""');
    return `"${s}"`;
  };

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        esc(formatDT(r.ts)),
        esc(r.palletId),
        esc(r.action),
        esc(r.note ?? ""),
        esc(r.locationKind ?? ""),
        esc(r.locationId ?? ""),
        esc(r.driverId ?? ""),
      ].join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// -------------------------
// SHOPS (Negozi)
// -------------------------
export function getShops(): ShopItem[] {
  return load<ShopItem[]>(KEYS.shops, []);
}

export function addShop(name: string, address?: string, note?: string): ShopItem {
  const n = (name || "").trim();
  const list = getShops();
  const item: ShopItem = {
    id: uid("shop"),
    name: n,
    address,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.shops, list);
  return item;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "createdAt">>) {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.shops, list);
  return list[idx];
}

export function deleteShop(id: string) {
  const list = getShops().filter((x) => x.id !== id);
  save(KEYS.shops, list);
}

// alias (se in qualche pagina importi removeShop)
export const removeShop = deleteShop;

// se ti serve un default shop:
export function getDefaultShop(): ShopItem | null {
  const list = getShops();
  return list.length ? list[0] : null;
}

// -------------------------
// DEPOTS (Depositi)
// -------------------------
export function getDepots(): DepotItem[] {
  return load<DepotItem[]>(KEYS.depots, []);
}

export function addDepot(name: string, address?: string, note?: string): DepotItem {
  const n = (name || "").trim();
  const list = getDepots();
  const item: DepotItem = {
    id: uid("depot"),
    name: n,
    address,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.depots, list);
  return item;
}

export function updateDepot(id: string, patch: Partial<Omit<DepotItem, "id" | "createdAt">>) {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.depots, list);
  return list[idx];
}

export function deleteDepot(id: string) {
  const list = getDepots().filter((x) => x.id !== id);
  save(KEYS.depots, list);
}

// -------------------------
// DRIVERS (Autisti)
// -------------------------
export function getDrivers(): DriverItem[] {
  return load<DriverItem[]>(KEYS.drivers, []);
}

export function addDriver(name: string, phone?: string, note?: string): DriverItem {
  const n = (name || "").trim();
  const list = getDrivers();
  const item: DriverItem = {
    id: uid("drv"),
    name: n,
    phone,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.drivers, list);
  return item;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "createdAt">>) {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.drivers, list);
  return list[idx];
}

export function deleteDriver(id: string) {
  const list = getDrivers().filter((x) => x.id !== id);
  save(KEYS.drivers, list);
}

// -------------------------
// PALLETS (Pedane)
// -------------------------
export function getPallets(): PalletItem[] {
  return load<PalletItem[]>(KEYS.pallets, []);
}

export function upsertPallet(palletId: string, patch: Partial<Omit<PalletItem, "id" | "createdAt">>) {
  const id = (palletId || "").trim();
  if (!id) return null;

  const list = getPallets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, id, updatedAt: now() };
    save(KEYS.pallets, list);
    return list[idx];
  }

  const item: PalletItem = {
    id,
    createdAt: now(),
    updatedAt: now(),
    ...patch,
  };
  list.unshift(item);
  save(KEYS.pallets, list);
  return item;
}

export function removePallet(palletId: string) {
  const id = (palletId || "").trim();
  const list = getPallets().filter((p) => p.id !== id);
  save(KEYS.pallets, list);
}

// -------------------------
// SCAN (QR)
// -------------------------
export function setLastScan(value: string) {
  save(KEYS.lastScan, (value || "").toString());
}

export function getLastScan(): string {
  return load<string>(KEYS.lastScan, "");
}

export function getScanHistory(): ScanHistoryItem[] {
  return load<ScanHistoryItem[]>(KEYS.scanHistory, []);
}

export function addScanHistory(payload: string) {
  const p = (payload || "").toString();
  const list = getScanHistory();
  const item: ScanHistoryItem = { id: uid("scan"), payload: p, ts: now() };
  list.unshift(item);
  save(KEYS.scanHistory, list);
  return item;
}

export function clearScanHistory() {
  save(KEYS.scanHistory, [] as ScanHistoryItem[]);
}

// -------------------------
// MISSING (Pedane Mancanti)
// -------------------------
export function getMissing(): MissingItem[] {
  return load<MissingItem[]>(KEYS.missing, []);
}

export function addMissing(palletId: string, note?: string): MissingItem {
  const pid = (palletId || "").trim();
  const list = getMissing();

  // se esiste già non risolto, aggiorna (no duplicati)
  const idx = list.findIndex((m) => m.palletId === pid && !m.resolved);
  if (idx >= 0) {
    const updated: MissingItem = {
      ...list[idx],
      note: note ?? list[idx].note,
      resolved: false,
      resolvedAt: undefined,
    };
    list[idx] = updated;
    save(KEYS.missing, list);

    if (pid) addHistory({ palletId: pid, action: "MISSING", note: updated.note });
    return updated;
  }

  const item: MissingItem = {
    id: uid("missing"),
    palletId: pid,
    note,
    createdAt: now(),
    resolved: false,
  };

  list.unshift(item);
  save(KEYS.missing, list);

  if (pid) addHistory({ palletId: pid, action: "MISSING", note });
  // opzionale: marca pedana
  if (pid) upsertPallet(pid, { status: "MISSING" });

  return item;
}

export function removeMissing(id: string) {
  const list = getMissing().filter((m) => m.id !== id);
  save(KEYS.missing, list);
}

// ✅ export che ti mancava in build: resolveMissing
export function resolveMissing(id: string) {
  const list = getMissing();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;

  const item = list[idx];
  const resolvedItem: MissingItem = {
    ...item,
    resolved: true,
    resolvedAt: now(),
  };

  list[idx] = resolvedItem;
  save(KEYS.missing, list);

  if (resolvedItem.palletId) {
    addHistory({ palletId: resolvedItem.palletId, action: "FOUND", note: resolvedItem.note });
    upsertPallet(resolvedItem.palletId, { status: "IN_STOCK" });
  }

  return resolvedItem;
}
