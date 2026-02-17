/* app/lib/storage.ts
   Storage locale (localStorage) + fallback in-memory (per build/SSR).
   Tutte le funzioni esportate che usano le pagine: scan, pallets, stock, drivers, shops, depots, history, missing.
*/

export type StockLocationKind = "NEGOZIO" | "DEPOSITO" | "AUTISTA";

export type DriverItem = { id: string; name: string; phone?: string; note?: string; createdAt: number; updatedAt: number };
export type ShopItem = { id: string; name: string; address?: string; note?: string; createdAt: number; updatedAt: number };
export type DepotItem = { id: string; name: string; address?: string; note?: string; createdAt: number; updatedAt: number };

export type ScanHistoryItem = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source: "qr" | "manual";
};

export type PalletItem = {
  id: string;
  code: string;

  // info extra (facoltativo)
  palletType?: string;
  altCode?: string;

  // ultimo avvistamento
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastAccuracy?: number;
  lastSource?: "qr" | "manual";

  // ultimo movimento stock
  locationKind?: StockLocationKind;
  locationId?: string;

  notes?: string;

  createdAt: number;
  updatedAt: number;
};

export type StockRow = {
  palletType: string;
  qty: number;
  locationKind: StockLocationKind;
  locationId: string;
};

export type StockMove = {
  id: string;
  ts: number;
  palletCode?: string;
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

type DB = {
  version: number;
  lastScan?: string;

  drivers: DriverItem[];
  shops: ShopItem[];
  depots: DepotItem[];

  history: ScanHistoryItem[];
  pallets: PalletItem[];

  stockRows: StockRow[];
  stockMoves: StockMove[];
};

const KEY = "pallet_tracker_db_v1";

// fallback in-memory (se window non esiste)
let memoryDb: DB | null = null;

function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function defaultDb(): DB {
  const t = now();
  return {
    version: 1,
    lastScan: "",
    drivers: [],
    shops: [],
    depots: [{ id: "DEPOT_DEFAULT", name: "Deposito Principale", createdAt: t, updatedAt: t }],
    history: [],
    pallets: [],
    stockRows: [],
    stockMoves: [],
  };
}

function readDb(): DB {
  if (isBrowser()) {
    const raw = localStorage.getItem(KEY);
    const db = safeParse<DB>(raw, defaultDb());
    // migrazioni semplici (se manca qualcosa)
    db.version ||= 1;
    db.drivers ||= [];
    db.shops ||= [];
    db.depots ||= [{ id: "DEPOT_DEFAULT", name: "Deposito Principale", createdAt: now(), updatedAt: now() }];
    db.history ||= [];
    db.pallets ||= [];
    db.stockRows ||= [];
    db.stockMoves ||= [];
    db.lastScan ||= "";
    return db;
  }

  if (!memoryDb) memoryDb = defaultDb();
  return memoryDb;
}

function writeDb(db: DB) {
  if (isBrowser()) {
    localStorage.setItem(KEY, JSON.stringify(db));
  } else {
    memoryDb = db;
  }
}

/* -------------------- Utils export -------------------- */

export function formatDT(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");

  if (!isBrowser()) return csv;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------- Last scan -------------------- */

export function setLastScan(code: string) {
  const db = readDb();
  db.lastScan = (code || "").trim();
  writeDb(db);
}

export function getLastScan() {
  return readDb().lastScan || "";
}

/* -------------------- History (Scansioni) -------------------- */

export function addHistory(item: Omit<ScanHistoryItem, "id">) {
  const db = readDb();
  const it: ScanHistoryItem = { id: uid("hist"), ...item };
  db.history.unshift(it);
  // limita
  db.history = db.history.slice(0, 2000);
  writeDb(db);
  return it;
}

// alias compatibilità (se alcune pagine importano addScanHistory)
export const addScanHistory = addHistory;

export function getHistory() {
  return readDb().history.slice();
}

export function clearHistory() {
  const db = readDb();
  db.history = [];
  writeDb(db);
}

// alias compatibilità
export const getScanHistory = getHistory;
export const clearScanHistory = clearHistory;

/* -------------------- Drivers -------------------- */

export function getDrivers() {
  return readDb().drivers.slice();
}

export function addDriver(name: string, phone?: string, note?: string) {
  const db = readDb();
  const t = now();
  const it: DriverItem = { id: uid("drv"), name: name.trim(), phone, note, createdAt: t, updatedAt: t };
  db.drivers.push(it);
  writeDb(db);
  return it;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "createdAt">>) {
  const db = readDb();
  const idx = db.drivers.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  db.drivers[idx] = { ...db.drivers[idx], ...patch, updatedAt: now() };
  writeDb(db);
  return db.drivers[idx];
}

export function removeDriver(id: string) {
  const db = readDb();
  db.drivers = db.drivers.filter((d) => d.id !== id);
  writeDb(db);
}

/* -------------------- Shops -------------------- */

export function getShops() {
  return readDb().shops.slice();
}

export function addShop(name: string, address?: string, note?: string) {
  const db = readDb();
  const t = now();
  const it: ShopItem = { id: uid("shop"), name: name.trim(), address, note, createdAt: t, updatedAt: t };
  db.shops.push(it);
  writeDb(db);
  return it;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "createdAt">>) {
  const db = readDb();
  const idx = db.shops.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  db.shops[idx] = { ...db.shops[idx], ...patch, updatedAt: now() };
  writeDb(db);
  return db.shops[idx];
}

export function deleteShop(id: string) {
  const db = readDb();
  db.shops = db.shops.filter((s) => s.id !== id);
  writeDb(db);
}

export function getDefaultShop() {
  const db = readDb();
  if (db.shops.length === 0) {
    // creo un negozio demo per evitare select vuota
    addShop("Negozio 1");
  }
  return readDb().shops[0];
}

export function getShopOptions() {
  return readDb().shops.map((s) => ({ id: s.id, name: s.name }));
}

/* -------------------- Depots -------------------- */

export function getDepots() {
  return readDb().depots.slice();
}

export function addDepot(name: string, address?: string, note?: string) {
  const db = readDb();
  const t = now();
  const it: DepotItem = { id: uid("dep"), name: name.trim(), address, note, createdAt: t, updatedAt: t };
  db.depots.push(it);
  writeDb(db);
  return it;
}

export function updateDepot(id: string, patch: Partial<Omit<DepotItem, "id" | "createdAt">>) {
  const db = readDb();
  const idx = db.depots.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  db.depots[idx] = { ...db.depots[idx], ...patch, updatedAt: now() };
  writeDb(db);
  return db.depots[idx];
}

export function removeDepot(id: string) {
  const db = readDb();
  // non permetto di rimuovere l’ultimo deposito (evita rotture)
  if (db.depots.length <= 1) return;
  db.depots = db.depots.filter((d) => d.id !== id);
  writeDb(db);
}

export function getDefaultDepot() {
  const db = readDb();
  if (db.depots.length === 0) {
    db.depots = [{ id: "DEPOT_DEFAULT", name: "Deposito Principale", createdAt: now(), updatedAt: now() }];
    writeDb(db);
  }
  return readDb().depots[0];
}

export function getDepotOptions() {
  return readDb().depots.map((d) => ({ id: d.id, name: d.name }));
}

/* -------------------- Pallets registry -------------------- */

export function getPallets() {
  return readDb().pallets.slice();
}

export function upsertPallet(p: Partial<PalletItem> & { code: string }) {
  const db = readDb();
  const code = p.code.trim();
  const idx = db.pallets.findIndex((x) => x.code === code);
  const t = now();

  if (idx >= 0) {
    db.pallets[idx] = {
      ...db.pallets[idx],
      ...p,
      code,
      updatedAt: t,
    };
    writeDb(db);
    return db.pallets[idx];
  }

  const it: PalletItem = {
    id: uid("pal"),
    code,
    createdAt: t,
    updatedAt: t,
    palletType: p.palletType,
    altCode: p.altCode,
    lastSeenTs: p.lastSeenTs,
    lastLat: p.lastLat,
    lastLng: p.lastLng,
    lastAccuracy: p.lastAccuracy,
    lastSource: p.lastSource,
    locationKind: p.locationKind,
    locationId: p.locationId,
    notes: p.notes,
  };
  db.pallets.unshift(it);
  writeDb(db);
  return it;
}

export function deletePallet(id: string) {
  const db = readDb();
  db.pallets = db.pallets.filter((p) => p.id !== id);
  writeDb(db);
}

/* -------------------- Stock -------------------- */

function rowKey(palletType: string, kind: StockLocationKind, id: string) {
  return `${palletType}__${kind}__${id}`;
}

export function getStockRows() {
  return readDb().stockRows.slice();
}

export function getStockMoves() {
  return readDb().stockMoves.slice();
}

// crea/aggiorna una riga stock (qty >= 0)
function setStockRow(db: DB, palletType: string, kind: StockLocationKind, id: string, qty: number) {
  const k = rowKey(palletType, kind, id);
  const idx = db.stockRows.findIndex((r) => rowKey(r.palletType, r.locationKind, r.locationId) === k);
  const safeQty = Math.max(0, Math.floor(qty || 0));
  if (idx >= 0) db.stockRows[idx] = { ...db.stockRows[idx], qty: safeQty };
  else db.stockRows.push({ palletType, locationKind: kind, locationId: id, qty: safeQty });
}

// modifica stock (delta può essere negativo)
function bumpStock(db: DB, palletType: string, kind: StockLocationKind, id: string, delta: number) {
  const k = rowKey(palletType, kind, id);
  const idx = db.stockRows.findIndex((r) => rowKey(r.palletType, r.locationKind, r.locationId) === k);
  const curr = idx >= 0 ? db.stockRows[idx].qty : 0;
  const next = Math.max(0, (curr || 0) + Math.floor(delta || 0));
  setStockRow(db, palletType, kind, id, next);
}

export function movePalletViaScan(args: {
  palletCode: string;
  palletType: string;
  qty: number;
  to: { kind: StockLocationKind; id: string };
  note?: string;

  // se non sai da dove viene, puoi lasciare DEPOSITO default
  from?: { kind: StockLocationKind; id: string };
}) {
  const db = readDb();

  const depot = getDefaultDepot();
  const from = args.from ?? { kind: "DEPOSITO" as const, id: depot.id };

  const qty = Math.max(1, Math.floor(args.qty || 1));
  const palletType = (args.palletType || "Altro").trim();

  // aggiorna stock: - dal from, + al to
  bumpStock(db, palletType, from.kind, from.id, -qty);
  bumpStock(db, palletType, args.to.kind, args.to.id, +qty);

  const mv: StockMove = {
    id: uid("mv"),
    ts: now(),
    palletCode: args.palletCode,
    palletType,
    qty,
    from,
    to: args.to,
    note: args.note?.trim() || "",
  };
  db.stockMoves.unshift(mv);
  db.stockMoves = db.stockMoves.slice(0, 5000);

  // aggiorna pallet registry (posizione attuale)
  upsertPallet({
    code: args.palletCode,
    palletType,
    locationKind: args.to.kind,
    locationId: args.to.id,
    notes: args.note?.trim() || undefined,
  });

  writeDb(db);
  return mv;
}

/* -------------------- Helpers UI -------------------- */

export function resetAllData() {
  writeDb(defaultDb());
}
