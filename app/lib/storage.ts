// app/lib/storage.ts
// Storage unico (localStorage) — allineato con tutte le pagine dell'app

export type StockLocationKind = "shop" | "depot" | "driver";

export type PalletType = "EUR/EPAL" | "CHEP" | "LPR" | "IFCO" | "ALTRO";

export type PalletItem = {
  id: string;
  code: string;
  type?: PalletType | string;
  altCode?: string;
  notes?: string;

  createdTs?: number;

  // tracking
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  createdTs?: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  createdTs?: number;
};

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  plate?: string;
  createdTs?: number;
};

export type StockEntry = {
  id: string;
  palletCode: string;
  palletType?: string;
  qty: number;

  locationKind: StockLocationKind;
  locationId: string;

  updatedTs: number;
  note?: string;
};

export type ScanHistoryItem = {
  id: string;
  ts: number;

  code: string;
  source: "qr" | "manual";

  lat?: number;
  lng?: number;

  palletType?: string;
  qty?: number;

  locationKind?: StockLocationKind;
  locationId?: string;

  note?: string;
};

const KEY_PALLETS = "pallet_tracker_pallets";
const KEY_SHOPS = "pallet_tracker_shops";
const KEY_DEPOTS = "pallet_tracker_depots";
const KEY_DRIVERS = "pallet_tracker_drivers";
const KEY_STOCK = "pallet_tracker_stock";
const KEY_HISTORY = "pallet_tracker_history";
const KEY_LAST_SCAN = "pallet_tracker_last_scan";

// ---------------- helpers ----------------
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

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampInt(n: any, fallback = 0) {
  const x = Number.parseInt(String(n), 10);
  return Number.isFinite(x) ? x : fallback;
}

// ---------------- pallets ----------------
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
      createdTs: prev.createdTs || input.createdTs || now,
    };
    all[idx] = updated;
  } else {
    const created: PalletItem = {
      id: input.id || uid("p"),
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
  setPallets(all.filter((x) => x.id !== id));
}

// ---------------- shops ----------------
export function getShops(): ShopItem[] {
  if (!hasLocalStorage()) return [];
  return safeParse<ShopItem[]>(window.localStorage.getItem(KEY_SHOPS), []);
}

export function setShops(list: ShopItem[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_SHOPS, JSON.stringify(list || []));
}

export function addShop(name: string) {
  const n = (name || "").trim();
  if (!n) return;
  const all = getShops();
  all.push({ id: uid("shop"), name: n, createdTs: Date.now() });
  setShops(all);
}

export function updateShop(id: string, patch: Partial<ShopItem>) {
  const all = getShops();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  setShops(all);
}

export function removeShop(id: string) {
  setShops(getShops().filter((x) => x.id !== id));
}

export function getDefaultShop(): string {
  return getShops()[0]?.id || "";
}

// ---------------- depots ----------------
export function getDepots(): DepotItem[] {
  if (!hasLocalStorage()) return [];
  return safeParse<DepotItem[]>(window.localStorage.getItem(KEY_DEPOTS), []);
}

export function setDepots(list: DepotItem[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_DEPOTS, JSON.stringify(list || []));
}

export function addDepot(name: string) {
  const n = (name || "").trim();
  if (!n) return;
  const all = getDepots();
  all.push({ id: uid("depot"), name: n, createdTs: Date.now() });
  setDepots(all);
}

export function updateDepot(id: string, patch: Partial<DepotItem>) {
  const all = getDepots();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  setDepots(all);
}

export function removeDepot(id: string) {
  setDepots(getDepots().filter((x) => x.id !== id));
}

export function getDefaultDepot(): string {
  return getDepots()[0]?.id || "";
}

// ---------------- drivers ----------------
export function getDrivers(): DriverItem[] {
  if (!hasLocalStorage()) return [];
  return safeParse<DriverItem[]>(window.localStorage.getItem(KEY_DRIVERS), []);
}

export function setDrivers(list: DriverItem[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_DRIVERS, JSON.stringify(list || []));
}

export function addDriver(name: string) {
  const n = (name || "").trim();
  if (!n) return;
  const all = getDrivers();
  all.push({ id: uid("drv"), name: n, createdTs: Date.now() });
  setDrivers(all);
}

export function updateDriver(id: string, patch: Partial<DriverItem>) {
  const all = getDrivers();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  setDrivers(all);
}

export function removeDriver(id: string) {
  setDrivers(getDrivers().filter((x) => x.id !== id));
}

// ---------------- scan history ----------------
export function getScanHistory(): ScanHistoryItem[] {
  if (!hasLocalStorage()) return [];
  return safeParse<ScanHistoryItem[]>(window.localStorage.getItem(KEY_HISTORY), []);
}

// compat: alcune pagine lo chiamavano addHistory
export function addHistory(item: Omit<ScanHistoryItem, "id" | "ts"> & { ts?: number }) {
  addScanHistory(item);
}

export function addScanHistory(item: Omit<ScanHistoryItem, "id" | "ts"> & { ts?: number }) {
  const all = getScanHistory();
  all.unshift({
    id: uid("h"),
    ts: item.ts || Date.now(),
    code: item.code,
    source: item.source,
    lat: item.lat,
    lng: item.lng,
    palletType: item.palletType,
    qty: item.qty,
    locationKind: item.locationKind,
    locationId: item.locationId,
    note: item.note,
  });
  window.localStorage.setItem(KEY_HISTORY, JSON.stringify(all.slice(0, 5000))); // limite
}

export function clearHistory() {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_HISTORY, JSON.stringify([]));
}

export function setLastScan(code: string) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_LAST_SCAN, (code || "").trim());
}

export function getLastScan(): string {
  if (!hasLocalStorage()) return "";
  return (window.localStorage.getItem(KEY_LAST_SCAN) || "").trim();
}

// ---------------- stock ----------------
export function getStock(): StockEntry[] {
  if (!hasLocalStorage()) return [];
  return safeParse<StockEntry[]>(window.localStorage.getItem(KEY_STOCK), []);
}

export function setStock(list: StockEntry[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KEY_STOCK, JSON.stringify(list || []));
}

function stockKey(e: Pick<StockEntry, "palletCode" | "locationKind" | "locationId">) {
  return `${e.palletCode.toLowerCase()}|${e.locationKind}|${e.locationId}`;
}

export function upsertStockEntry(input: Omit<StockEntry, "id" | "updatedTs"> & { id?: string; updatedTs?: number }) {
  const all = getStock();
  const code = (input.palletCode || "").trim();
  if (!code) return;

  const k = stockKey({ palletCode: code, locationKind: input.locationKind, locationId: input.locationId });
  const idx = all.findIndex((x) => stockKey(x) === k);

  const now = input.updatedTs || Date.now();
  const qty = clampInt(input.qty, 0);

  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      palletCode: code,
      palletType: input.palletType,
      qty,
      note: input.note,
      updatedTs: now,
    };
  } else {
    all.push({
      id: input.id || uid("stk"),
      palletCode: code,
      palletType: input.palletType,
      qty,
      locationKind: input.locationKind,
      locationId: input.locationId,
      note: input.note,
      updatedTs: now,
    });
  }

  setStock(all);
}

export function removeStockEntry(id: string) {
  setStock(getStock().filter((x) => x.id !== id));
}

export function getShopOptions() {
  return {
    shops: getShops(),
    depots: getDepots(),
    drivers: getDrivers(),
  };
}

// “movePalletViaScan” usato dalla scan page: aggiorna pallet + stock + history
export function movePalletViaScan(args: {
  code: string;
  source: "qr" | "manual";
  lat?: number;
  lng?: number;

  palletType?: string;
  qty?: number;

  locationKind?: StockLocationKind;
  locationId?: string;

  note?: string;
  altCode?: string;
}) {
  const code = (args.code || "").trim();
  if (!code) return;

  // 1) aggiorna pallet
  upsertPallet({
    code,
    type: args.palletType,
    altCode: args.altCode,
    notes: args.note,
    lastSeenTs: Date.now(),
    lastLat: args.lat,
    lastLng: args.lng,
    lastSource: args.source,
  });

  // 2) aggiorna stock se location presente
  if (args.locationKind && args.locationId) {
    upsertStockEntry({
      palletCode: code,
      palletType: args.palletType,
      qty: clampInt(args.qty, 1),
      locationKind: args.locationKind,
      locationId: args.locationId,
      note: args.note,
    });
  }

  // 3) storico
  addScanHistory({
    code,
    source: args.source,
    lat: args.lat,
    lng: args.lng,
    palletType: args.palletType,
    qty: args.qty,
    locationKind: args.locationKind,
    locationId: args.locationId,
    note: args.note,
  });

  // 4) ultimo scan
  setLastScan(code);
}
