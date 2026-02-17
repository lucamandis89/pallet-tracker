// app/lib/storage.ts
"use client";

export type StockLocationKind = "NEGOZIO" | "DEPOSITO" | "AUTISTA";

export type PalletItem = {
  id: string; // codice pedana (QR)
  type: string; // EUR/EPAL/IFCO...
  altCode?: string; // codice alternativo (opzionale)
  lastSeenTs?: number;
  location?: { kind: StockLocationKind; id: string };
  note?: string;
};

export type ShopItem = { id: string; name: string; address?: string };
export type DepotItem = { id: string; name: string; address?: string };
export type DriverItem = { id: string; name: string; phone?: string };

export type ScanHistoryItem = {
  id: string;
  ts: number;
  qr: string;
  lat?: number;
  lng?: number;
  note?: string;
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
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
  palletId?: string;
};

const K = {
  PALLETS: "pt_pallets",
  SHOPS: "pt_shops",
  DEPOTS: "pt_depots",
  DRIVERS: "pt_drivers",
  HISTORY: "pt_history",
  LAST_SCAN: "pt_last_scan",
  STOCK_ROWS: "pt_stock_rows",
  STOCK_MOVES: "pt_stock_moves",
};

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeJson<T>(localStorage.getItem(key), fallback);
}

function setLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function formatDT(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/** CSV download helper */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* -------------------- SHOPS -------------------- */

export function getShopOptions(): ShopItem[] {
  const list = getLS<ShopItem[]>(K.SHOPS, []);
  if (list.length === 0) {
    const seed: ShopItem[] = [{ id: "shop_1", name: "Negozio 1" }];
    setLS(K.SHOPS, seed);
    return seed;
  }
  return list;
}
export function getShops() {
  return getShopOptions();
}
export function addShop(name: string, address?: string) {
  const list = getShopOptions();
  const it: ShopItem = { id: uid("shop"), name: name.trim() || "Nuovo negozio", address };
  setLS(K.SHOPS, [it, ...list]);
  return it;
}
export function updateShop(item: ShopItem) {
  const list = getShopOptions().map((x) => (x.id === item.id ? item : x));
  setLS(K.SHOPS, list);
}
export function removeShop(id: string) {
  setLS(K.SHOPS, getShopOptions().filter((x) => x.id !== id));
}
export function getDefaultShop(): ShopItem {
  return getShopOptions()[0];
}

/* -------------------- DEPOTS -------------------- */

export function getDepotOptions(): DepotItem[] {
  const list = getLS<DepotItem[]>(K.DEPOTS, []);
  if (list.length === 0) {
    const seed: DepotItem[] = [{ id: "depot_1", name: "Deposito 1" }];
    setLS(K.DEPOTS, seed);
    return seed;
  }
  return list;
}
export function getDepots() {
  return getDepotOptions();
}
export function addDepot(name: string, address?: string) {
  const list = getDepotOptions();
  const it: DepotItem = { id: uid("depot"), name: name.trim() || "Nuovo deposito", address };
  setLS(K.DEPOTS, [it, ...list]);
  return it;
}
export function updateDepot(item: DepotItem) {
  const list = getDepotOptions().map((x) => (x.id === item.id ? item : x));
  setLS(K.DEPOTS, list);
}
export function removeDepot(id: string) {
  setLS(K.DEPOTS, getDepotOptions().filter((x) => x.id !== id));
}
export function getDefaultDepot(): DepotItem {
  return getDepotOptions()[0];
}

/* -------------------- DRIVERS -------------------- */

export function getDrivers(): DriverItem[] {
  const list = getLS<DriverItem[]>(K.DRIVERS, []);
  if (list.length === 0) {
    const seed: DriverItem[] = [{ id: "drv_1", name: "Autista 1" }];
    setLS(K.DRIVERS, seed);
    return seed;
  }
  return list;
}
export function addDriver(name: string, phone?: string) {
  const list = getDrivers();
  const it: DriverItem = { id: uid("drv"), name: name.trim() || "Nuovo autista", phone };
  setLS(K.DRIVERS, [it, ...list]);
  return it;
}
export function updateDriver(item: DriverItem) {
  const list = getDrivers().map((x) => (x.id === item.id ? item : x));
  setLS(K.DRIVERS, list);
}
export function removeDriver(id: string) {
  setLS(K.DRIVERS, getDrivers().filter((x) => x.id !== id));
}

/* -------------------- PALLETS REGISTRY -------------------- */

export function getPallets(): PalletItem[] {
  return getLS<PalletItem[]>(K.PALLETS, []);
}

export function upsertPallet(item: PalletItem) {
  const list = getPallets();
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item };
    setLS(K.PALLETS, list);
    return list[idx];
  }
  setLS(K.PALLETS, [item, ...list]);
  return item;
}

export function deletePallet(id: string) {
  setLS(K.PALLETS, getPallets().filter((x) => x.id !== id));
}

/* -------------------- HISTORY -------------------- */

export function getHistory(): ScanHistoryItem[] {
  return getLS<ScanHistoryItem[]>(K.HISTORY, []);
}
export function addScanHistory(qr: string, lat?: number, lng?: number, note?: string) {
  const list = getHistory();
  const it: ScanHistoryItem = { id: uid("h"), ts: Date.now(), qr, lat, lng, note };
  setLS(K.HISTORY, [it, ...list].slice(0, 5000));
  return it;
}
// alias compatibilità (per i vecchi import)
export const addHistory = addScanHistory;

export function clearHistory() {
  setLS(K.HISTORY, []);
}

/* last scan (comodissimo per report/missing) */
export function setLastScan(qr: string) {
  setLS(K.LAST_SCAN, { qr, ts: Date.now() });
}
export function getLastScan(): { qr: string; ts: number } | null {
  return getLS<{ qr: string; ts: number } | null>(K.LAST_SCAN, null);
}

/* -------------------- STOCK -------------------- */

export function getStockRows(): StockRow[] {
  return getLS<StockRow[]>(K.STOCK_ROWS, []);
}
export function getStockMoves(): StockMove[] {
  return getLS<StockMove[]>(K.STOCK_MOVES, []);
}

function setStockRows(rows: StockRow[]) {
  setLS(K.STOCK_ROWS, rows);
}
function setStockMoves(moves: StockMove[]) {
  setLS(K.STOCK_MOVES, moves);
}

function upsertStockRow(row: StockRow) {
  const rows = getStockRows();
  const idx = rows.findIndex(
    (r) => r.palletType === row.palletType && r.locationKind === row.locationKind && r.locationId === row.locationId
  );
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], qty: row.qty };
  } else {
    rows.push(row);
  }
  setStockRows(rows.filter((r) => r.qty !== 0));
}

function incStock(palletType: string, kind: StockLocationKind, id: string, delta: number) {
  const rows = getStockRows();
  const idx = rows.findIndex((r) => r.palletType === palletType && r.locationKind === kind && r.locationId === id);
  const cur = idx >= 0 ? rows[idx].qty : 0;
  const next = cur + delta;
  if (idx >= 0) rows[idx].qty = next;
  else rows.push({ palletType, qty: next, locationKind: kind, locationId: id });
  setStockRows(rows.filter((r) => r.qty !== 0));
}

/**
 * Move “logico” + aggiornamento giacenze per tipo pedana.
 * - Se la pedana esiste nel registro, usa la sua location precedente come "from"
 * - Altrimenti from = to (nessuna scalata)
 */
export function movePalletViaScan(args: {
  palletId: string; // QR
  palletType: string;
  qty: number;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
}) {
  const qty = Math.max(1, Math.floor(args.qty || 1));
  const palletType = (args.palletType || "EUR / EPAL").trim();

  const pallets = getPallets();
  const p = pallets.find((x) => x.id === args.palletId);

  const fromKind: StockLocationKind = p?.location?.kind || args.toKind;
  const fromId: string = p?.location?.id || args.toId;

  // aggiorna stock: scala dal from SOLO se cambia location
  if (fromKind !== args.toKind || fromId !== args.toId) {
    incStock(palletType, fromKind, fromId, -qty);
  }
  incStock(palletType, args.toKind, args.toId, +qty);

  // registra move
  const moves = getStockMoves();
  const mv: StockMove = {
    id: uid("mv"),
    ts: Date.now(),
    palletType,
    qty,
    from: { kind: fromKind, id: fromId },
    to: { kind: args.toKind, id: args.toId },
    note: args.note,
    palletId: args.palletId,
  };
  setStockMoves([mv, ...moves].slice(0, 5000));

  // aggiorna registro pedane
  upsertPallet({
    id: args.palletId,
    type: palletType,
    lastSeenTs: Date.now(),
    location: { kind: args.toKind, id: args.toId },
    note: args.note,
    altCode: p?.altCode,
  });

  return mv;
}

/* -------------------- HELPERS (nomi usati nelle pagine) -------------------- */

export function formatDTShort(ts: number) {
  return formatDT(ts);
}

/** alias compatibilità: alcuni file chiamavano getStockMoves/getStockRows già ok */

/** utile per etichette UI */
export function locationName(kind: StockLocationKind, id: string) {
  if (kind === "DEPOSITO") return getDepotOptions().find((x) => x.id === id)?.name || "—";
  if (kind === "AUTISTA") return getDrivers().find((x) => x.id === id)?.name || "—";
  return getShopOptions().find((x) => x.id === id)?.name || "—";
}
