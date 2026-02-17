// app/lib/storage.ts
"use client";

/**
 * Storage locale (localStorage) per:
 * - pallets (registro pedane)
 * - scans history (storico scansioni)
 * - drivers / shops / depots
 * - stock (giacenze) + movimenti stock
 *
 * Obiettivo: evitare errori di build => esporta TUTTO quello che le pagine importano.
 */

export type StockLocationKind = "NEGOZIO" | "DEPOSITO" | "AUTISTA";

export type PalletItem = {
  id: string;
  code: string;
  type?: string;
  altCode?: string;
  notes?: string;

  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastAccuracy?: number;
  lastSource?: "qr" | "manual";
};

export type ScanHistoryItem = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source?: "qr" | "manual";
  // opzionali per movimenti
  fromKind?: StockLocationKind;
  fromId?: string;
  toKind?: StockLocationKind;
  toId?: string;
  qty?: number;
  palletType?: string;
  note?: string;
};

export type DriverItem = { id: string; name: string; phone?: string; note?: string };
export type ShopItem = { id: string; name: string; address?: string; note?: string };
export type DepotItem = { id: string; name: string; address?: string; note?: string };

export type StockRow = {
  id: string;
  palletType: string;
  kind: StockLocationKind;
  locationId: string;
  locationName: string;
  qty: number;
  updatedAt: number;
};

export type StockMove = {
  id: string;
  ts: number;
  palletCode?: string;
  palletType: string;
  qty: number;
  fromKind: StockLocationKind;
  fromId: string;
  fromName: string;
  toKind: StockLocationKind;
  toId: string;
  toName: string;
  note?: string;
};

// ---------- keys ----------
const K = {
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",
  drivers: "pt_drivers_v1",
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  stockRows: "pt_stock_rows_v1",
  stockMoves: "pt_stock_moves_v1",
  lastScan: "pt_last_scan_v1",
  defaultShop: "pt_default_shop_v1",
  defaultDepot: "pt_default_depot_v1",
};

// ---------- helpers ----------
function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function setLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function formatDT(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Array.from(
    rows.reduce((s, r) => {
      Object.keys(r || {}).forEach((k) => s.add(k));
      return s;
    }, new Set<string>())
  );

  const esc = (v: any) => {
    const str = v === null || v === undefined ? "" : String(v);
    const needs = /[",\n;]/.test(str);
    const out = str.replaceAll('"', '""');
    return needs ? `"${out}"` : out;
  };

  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- defaults ----------
function ensureDefaults() {
  // drivers
  const drivers = getLS<DriverItem[]>(K.drivers, []);
  if (drivers.length === 0) {
    setLS(K.drivers, [
      { id: uid("drv"), name: "Autista 1" },
      { id: uid("drv"), name: "Autista 2" },
    ]);
  }

  // shops
  const shops = getLS<ShopItem[]>(K.shops, []);
  if (shops.length === 0) {
    const s1 = { id: uid("shop"), name: "Negozio 1" };
    const s2 = { id: uid("shop"), name: "Negozio 2" };
    setLS(K.shops, [s1, s2]);
    setLS(K.defaultShop, s1.id);
  } else {
    const def = getLS<string>(K.defaultShop, "");
    if (!def) setLS(K.defaultShop, shops[0].id);
  }

  // depots
  const depots = getLS<DepotItem[]>(K.depots, []);
  if (depots.length === 0) {
    const d1 = { id: uid("dep"), name: "Deposito Principale" };
    setLS(K.depots, [d1]);
    setLS(K.defaultDepot, d1.id);
  } else {
    const def = getLS<string>(K.defaultDepot, "");
    if (!def) setLS(K.defaultDepot, depots[0].id);
  }
}

// ---------- pallets ----------
export function getPallets(): PalletItem[] {
  ensureDefaults();
  return getLS<PalletItem[]>(K.pallets, []);
}

export function setPallets(list: PalletItem[]) {
  setLS(K.pallets, list);
}

export function upsertPallet(p: Partial<PalletItem> & { code: string }): PalletItem {
  const list = getPallets();
  const code = p.code.trim();
  const existingIdx = list.findIndex((x) => x.code === code);

  const now = Date.now();
  if (existingIdx >= 0) {
    const updated: PalletItem = {
      ...list[existingIdx],
      ...p,
      id: list[existingIdx].id,
      code,
      lastSeenTs: p.lastSeenTs ?? list[existingIdx].lastSeenTs ?? now,
    };
    list[existingIdx] = updated;
    setPallets(list);
    return updated;
  }

  const created: PalletItem = {
    id: uid("pal"),
    code,
    type: p.type ?? "",
    altCode: p.altCode ?? "",
    notes: p.notes ?? "",
    lastSeenTs: p.lastSeenTs ?? now,
    lastLat: p.lastLat,
    lastLng: p.lastLng,
    lastAccuracy: p.lastAccuracy,
    lastSource: p.lastSource,
  };
  list.unshift(created);
  setPallets(list);
  return created;
}

export function updatePallet(p: PalletItem) {
  const list = getPallets();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    list[idx] = p;
    setPallets(list);
  }
}

export function removePallet(id: string) {
  const list = getPallets().filter((x) => x.id !== id);
  setPallets(list);
}

// compat export (alcune pagine importano deletePallet)
export const deletePallet = removePallet;

// ---------- history ----------
export function getHistory(): ScanHistoryItem[] {
  return getLS<ScanHistoryItem[]>(K.history, []);
}

export function setHistory(list: ScanHistoryItem[]) {
  setLS(K.history, list);
}

export function addScanHistory(item: Omit<ScanHistoryItem, "id">) {
  const list = getHistory();
  list.unshift({ id: uid("his"), ...item });
  setHistory(list.slice(0, 2000)); // limite
}

// compat export (scan/page.tsx importava addHistory)
export const addHistory = addScanHistory;

export function clearHistory() {
  setHistory([]);
}

export function setLastScan(code: string) {
  setLS(K.lastScan, { code, ts: Date.now() });
}

export function getLastScan(): { code: string; ts: number } | null {
  return getLS<{ code: string; ts: number } | null>(K.lastScan, null);
}

// ---------- drivers ----------
export function getDrivers(): DriverItem[] {
  ensureDefaults();
  return getLS<DriverItem[]>(K.drivers, []);
}

export function addDriver(name: string): DriverItem {
  const list = getDrivers();
  const d = { id: uid("drv"), name: name.trim() || "Autista" };
  list.push(d);
  setLS(K.drivers, list);
  return d;
}

export function removeDriver(id: string) {
  const list = getDrivers().filter((x) => x.id !== id);
  setLS(K.drivers, list);
}

export function updateDriver(d: DriverItem) {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  setLS(K.drivers, list);
}

// ---------- shops ----------
export function getShops(): ShopItem[] {
  ensureDefaults();
  return getLS<ShopItem[]>(K.shops, []);
}

// compat: alcune pagine chiamano getShopOptions()
export function getShopOptions(): ShopItem[] {
  return getShops();
}

export function addShop(name: string): ShopItem {
  const list = getShops();
  const s = { id: uid("shop"), name: name.trim() || "Negozio" };
  list.push(s);
  setLS(K.shops, list);
  // se non c’è default
  const def = getLS<string>(K.defaultShop, "");
  if (!def) setLS(K.defaultShop, s.id);
  return s;
}

export function updateShop(s: ShopItem) {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  setLS(K.shops, list);
}

export function removeShop(id: string) {
  const list = getShops().filter((x) => x.id !== id);
  setLS(K.shops, list);
  const def = getLS<string>(K.defaultShop, "");
  if (def === id) setLS(K.defaultShop, list[0]?.id || "");
}

export function getDefaultShop(): ShopItem {
  const list = getShops();
  const defId = getLS<string>(K.defaultShop, "");
  return list.find((x) => x.id === defId) || list[0] || { id: "shop_none", name: "Nessun negozio" };
}

export function setDefaultShop(id: string) {
  setLS(K.defaultShop, id);
}

// ---------- depots ----------
export function getDepots(): DepotItem[] {
  ensureDefaults();
  return getLS<DepotItem[]>(K.depots, []);
}

// compat: alcune pagine chiamano getDepotOptions()
export function getDepotOptions(): DepotItem[] {
  return getDepots();
}

export function addDepot(name: string): DepotItem {
  const list = getDepots();
  const d = { id: uid("dep"), name: name.trim() || "Deposito" };
  list.push(d);
  setLS(K.depots, list);
  const def = getLS<string>(K.defaultDepot, "");
  if (!def) setLS(K.defaultDepot, d.id);
  return d;
}

export function updateDepot(d: DepotItem) {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  setLS(K.depots, list);
}

export function removeDepot(id: string) {
  const list = getDepots().filter((x) => x.id !== id);
  setLS(K.depots, list);
  const def = getLS<string>(K.defaultDepot, "");
  if (def === id) setLS(K.defaultDepot, list[0]?.id || "");
}

export function getDefaultDepot(): DepotItem {
  const list = getDepots();
  const defId = getLS<string>(K.defaultDepot, "");
  return list.find((x) => x.id === defId) || list[0] || { id: "dep_none", name: "Nessun deposito" };
}

export function setDefaultDepot(id: string) {
  setLS(K.defaultDepot, id);
}

// ---------- stock ----------
export function getStockRows(): StockRow[] {
  return getLS<StockRow[]>(K.stockRows, []);
}

export function setStockRows(rows: StockRow[]) {
  setLS(K.stockRows, rows);
}

export function getStockMoves(): StockMove[] {
  return getLS<StockMove[]>(K.stockMoves, []);
}

export function setStockMoves(moves: StockMove[]) {
  setLS(K.stockMoves, moves);
}

function locationName(kind: StockLocationKind, id: string): string {
  if (kind === "AUTISTA") return getDrivers().find((x) => x.id === id)?.name || "Autista";
  if (kind === "DEPOSITO") return getDepots().find((x) => x.id === id)?.name || "Deposito";
  return getShops().find((x) => x.id === id)?.name || "Negozio";
}

export function adjustStock(palletType: string, kind: StockLocationKind, locationId: string, deltaQty: number) {
  const rows = getStockRows();
  const locName = locationName(kind, locationId);
  const key = `${palletType}__${kind}__${locationId}`;
  const idx = rows.findIndex((r) => r.id === key);
  const now = Date.now();

  if (idx >= 0) {
    rows[idx] = { ...rows[idx], qty: Math.max(0, rows[idx].qty + deltaQty), updatedAt: now };
  } else {
    rows.push({
      id: key,
      palletType,
      kind,
      locationId,
      locationName: locName,
      qty: Math.max(0, deltaQty),
      updatedAt: now,
    });
  }
  setStockRows(rows);
}

export function addStockMove(move: Omit<StockMove, "id">) {
  const moves = getStockMoves();
  moves.unshift({ id: uid("mov"), ...move });
  setStockMoves(moves.slice(0, 4000));
}

// Funzione “alta” usata dalla scan: crea movimento + aggiorna stock + aggiunge storia
export function movePalletViaScan(args: {
  palletCode: string;
  palletType: string;
  qty: number;
  fromKind: StockLocationKind;
  fromId: string;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
}) {
  const ts = Date.now();
  const fromName = locationName(args.fromKind, args.fromId);
  const toName = locationName(args.toKind, args.toId);

  // stock: - da from, + a to
  adjustStock(args.palletType, args.fromKind, args.fromId, -Math.abs(args.qty));
  adjustStock(args.palletType, args.toKind, args.toId, Math.abs(args.qty));

  addStockMove({
    ts,
    palletCode: args.palletCode,
    palletType: args.palletType,
    qty: Math.abs(args.qty),
    fromKind: args.fromKind,
    fromId: args.fromId,
    fromName,
    toKind: args.toKind,
    toId: args.toId,
    toName,
    note: args.note,
  });

  // anche in history
  addScanHistory({
    code: args.palletCode,
    ts,
    palletType: args.palletType,
    qty: Math.abs(args.qty),
    fromKind: args.fromKind,
    fromId: args.fromId,
    toKind: args.toKind,
    toId: args.toId,
    note: args.note,
    source: "manual",
  });
}
