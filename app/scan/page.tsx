// app/lib/storage.ts
// Client-only storage helpers (safe with SSR via guards)

export type IdName = { id: string; name: string };

export type StockLocationKind = "SHOP" | "DEPOT";

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
  city?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  note?: string;
  // optional GPS position (string to match your current UI)
  lat?: string;
  lng?: string;
  createdAt: number;
  updatedAt: number;
};

export type PalletType = "EUR/EPAL" | "CHEP" | "LPR" | "IFCO" | "CP" | "ALTRO";

export type PalletItem = {
  id: string; // QR code / identifier
  type: PalletType;
  note?: string;

  // last known location
  locationKind?: StockLocationKind;
  shopId?: string;
  depotId?: string;

  // gps (optional)
  lat?: number;
  lng?: number;
  accuracy?: number;

  createdAt: number;
  updatedAt: number;
};

export type MissingStatus = "OPEN" | "RESOLVED";

export type MissingItem = {
  id: string;
  palletId: string;
  note?: string;
  status: MissingStatus;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
};

export type ScanHistoryItem = {
  id: string;
  palletId: string;
  action: string; // e.g. "SCAN", "MOVE", "MISSING", ...
  timestamp: number;

  // snapshot info (optional)
  shopId?: string;
  depotId?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

const K = {
  DRIVERS: "pt.drivers.v1",
  DEPOTS: "pt.depots.v1",
  SHOPS: "pt.shops.v1",
  DEFAULT_DEPOT: "pt.default_depot.v1",
  DEFAULT_SHOP: "pt.default_shop.v1",
  PALLETS: "pt.pallets.v1",
  MISSING: "pt.missing.v1",
  HISTORY: "pt.history.v1",
};

// -------------------- DRIVERS --------------------
export function getDrivers(): DriverItem[] {
  return readJSON<DriverItem[]>(K.DRIVERS, []);
}

export function addDriver(input: Omit<DriverItem, "id" | "createdAt" | "updatedAt"> & { id?: string }): DriverItem {
  const list = getDrivers();
  const item: DriverItem = {
    id: input.id ?? uid("drv"),
    name: input.name,
    phone: input.phone ?? "",
    note: input.note ?? "",
    createdAt: now(),
    updatedAt: now(),
  };
  writeJSON(K.DRIVERS, [item, ...list]);
  return item;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "createdAt">>): DriverItem | null {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const updated: DriverItem = { ...list[idx], ...patch, id, updatedAt: now() };
  const next = [...list];
  next[idx] = updated;
  writeJSON(K.DRIVERS, next);
  return updated;
}

export function removeDriver(id: string): boolean {
  const list = getDrivers();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  writeJSON(K.DRIVERS, next);
  return true;
}

// Alias (se qualche pagina usa "deleteDriver")
export const deleteDriver = removeDriver;

// -------------------- DEPOTS --------------------
export function getDepots(): DepotItem[] {
  return readJSON<DepotItem[]>(K.DEPOTS, []);
}

export function addDepot(input: Omit<DepotItem, "id" | "createdAt" | "updatedAt"> & { id?: string }): DepotItem {
  const list = getDepots();
  const item: DepotItem = {
    id: input.id ?? uid("dpt"),
    name: input.name,
    address: input.address ?? "",
    city: input.city ?? "",
    note: input.note ?? "",
    createdAt: now(),
    updatedAt: now(),
  };
  writeJSON(K.DEPOTS, [item, ...list]);
  return item;
}

export function updateDepot(id: string, patch: Partial<Omit<DepotItem, "id" | "createdAt">>): DepotItem | null {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const updated: DepotItem = { ...list[idx], ...patch, id, updatedAt: now() };
  const next = [...list];
  next[idx] = updated;
  writeJSON(K.DEPOTS, next);
  return updated;
}

export function removeDepot(id: string): boolean {
  const list = getDepots();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  writeJSON(K.DEPOTS, next);
  return true;
}

export const deleteDepot = removeDepot;

export function setDefaultDepot(id: string) {
  if (!isBrowser()) return;
  localStorage.setItem(K.DEFAULT_DEPOT, id);
}
export function getDefaultDepot(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(K.DEFAULT_DEPOT) ?? "";
}

// Options helpers requested by your logs
export function getDepotOptions(): IdName[] {
  return getDepots().map((d) => ({ id: d.id, name: d.name }));
}
export const getDepotOptionsList = getDepotOptions; // extra alias

// -------------------- SHOPS --------------------
export function getShops(): ShopItem[] {
  return readJSON<ShopItem[]>(K.SHOPS, []);
}

export function addShop(
  input: Omit<ShopItem, "id" | "createdAt" | "updatedAt"> & { id?: string }
): ShopItem {
  const list = getShops();
  const item: ShopItem = {
    id: input.id ?? uid("shp"),
    name: input.name,
    address: input.address ?? "",
    city: input.city ?? "",
    note: input.note ?? "",
    lat: input.lat ?? "",
    lng: input.lng ?? "",
    createdAt: now(),
    updatedAt: now(),
  };
  writeJSON(K.SHOPS, [item, ...list]);
  return item;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "createdAt">>): ShopItem | null {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const updated: ShopItem = { ...list[idx], ...patch, id, updatedAt: now() };
  const next = [...list];
  next[idx] = updated;
  writeJSON(K.SHOPS, next);
  return updated;
}

export function removeShop(id: string): boolean {
  const list = getShops();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  writeJSON(K.SHOPS, next);
  return true;
}

export const deleteShop = removeShop;

export function setDefaultShop(id: string) {
  if (!isBrowser()) return;
  localStorage.setItem(K.DEFAULT_SHOP, id);
}
export function getDefaultShop(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(K.DEFAULT_SHOP) ?? "";
}

export function getShopOptions(): IdName[] {
  return getShops().map((s) => ({ id: s.id, name: s.name }));
}

// -------------------- PALLETS --------------------
export function getPallets(): PalletItem[] {
  return readJSON<PalletItem[]>(K.PALLETS, []);
}

export function addPallet(
  input: Omit<PalletItem, "createdAt" | "updatedAt"> & { createdAt?: number; updatedAt?: number }
): PalletItem {
  const list = getPallets();
  const exists = list.some((p) => p.id === input.id);
  if (exists) {
    // if already exists, treat as update
    return (updatePallet(input.id, input) ?? input) as PalletItem;
  }

  const item: PalletItem = {
    ...input,
    createdAt: input.createdAt ?? now(),
    updatedAt: input.updatedAt ?? now(),
  };
  writeJSON(K.PALLETS, [item, ...list]);
  return item;
}

export function updatePallet(id: string, patch: Partial<Omit<PalletItem, "id" | "createdAt">>): PalletItem | null {
  const list = getPallets();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const updated: PalletItem = { ...list[idx], ...patch, id, updatedAt: now() };
  const next = [...list];
  next[idx] = updated;
  writeJSON(K.PALLETS, next);
  return updated;
}

export function deletePallet(id: string): boolean {
  const list = getPallets();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  writeJSON(K.PALLETS, next);
  return true;
}

// Move helper (some pages may call this)
export function movePalletViaScan(palletId: string, params: {
  locationKind: StockLocationKind;
  shopId?: string;
  depotId?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
}): PalletItem | null {
  return updatePallet(palletId, {
    locationKind: params.locationKind,
    shopId: params.shopId,
    depotId: params.depotId,
    lat: params.lat,
    lng: params.lng,
    accuracy: params.accuracy,
  });
}

// -------------------- MISSING --------------------
export function getMissing(): MissingItem[] {
  return readJSON<MissingItem[]>(K.MISSING, []);
}

export function addMissing(input: { palletId: string; note?: string; id?: string }): MissingItem {
  const list = getMissing();
  const item: MissingItem = {
    id: input.id ?? uid("mis"),
    palletId: input.palletId,
    note: input.note ?? "",
    status: "OPEN",
    createdAt: now(),
    updatedAt: now(),
  };
  writeJSON(K.MISSING, [item, ...list]);
  // optional: write history
  addHistory({
    palletId: input.palletId,
    action: "MISSING_OPEN",
  });
  return item;
}

export function removeMissing(id: string): boolean {
  const list = getMissing();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  writeJSON(K.MISSING, next);
  return true;
}

export function resolveMissing(id: string): MissingItem | null {
  const list = getMissing();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const updated: MissingItem = {
    ...list[idx],
    status: "RESOLVED",
    resolvedAt: now(),
    updatedAt: now(),
  };
  const next = [...list];
  next[idx] = updated;
  writeJSON(K.MISSING, next);

  addHistory({
    palletId: updated.palletId,
    action: "MISSING_RESOLVED",
  });

  return updated;
}

// alias suggested by your log
export const markMissing = resolveMissing;

// -------------------- HISTORY --------------------
export function getHistory(): ScanHistoryItem[] {
  return readJSON<ScanHistoryItem[]>(K.HISTORY, []);
}

export function addHistory(input: Omit<ScanHistoryItem, "id" | "timestamp"> & { id?: string; timestamp?: number }) {
  const list = getHistory();
  const item: ScanHistoryItem = {
    id: input.id ?? uid("his"),
    palletId: input.palletId,
    action: input.action,
    timestamp: input.timestamp ?? now(),
    shopId: input.shopId,
    depotId: input.depotId,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy,
  };
  writeJSON(K.HISTORY, [item, ...list].slice(0, 5000)); // cap
  return item;
}

export function clearHistory() {
  writeJSON(K.HISTORY, []);
}

// some pages used "clearScanHistory" / "getScanHistory"
export const clearScanHistory = clearHistory;
export const getScanHistory = getHistory;

// CSV Export for history (your log: historyToCsv)
function escapeCsvCell(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function historyToCsv(rows?: ScanHistoryItem[]): string {
  const data = rows ?? getHistory();
  const header = [
    "id",
    "palletId",
    "action",
    "timestamp",
    "shopId",
    "depotId",
    "lat",
    "lng",
    "accuracy",
  ];
  const lines = [header.join(",")];

  for (const r of data) {
    lines.push(
      [
        r.id,
        r.palletId,
        r.action,
        r.timestamp,
        r.shopId ?? "",
        r.depotId ?? "",
        r.lat ?? "",
        r.lng ?? "",
        r.accuracy ?? "",
      ].map(escapeCsvCell).join(",")
    );
  }
  return lines.join("\n");
}

// Some old pages used "downloadCsv" and "formatDT" inside storage imports.
// I keep lightweight helpers here so imports stop breaking.
export function formatDT(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export function downloadCsv(filename: string, csvText: string) {
  if (!isBrowser()) return;
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// alias for older import name in your logs
export const clearHistoryToCsv = historyToCsv;
