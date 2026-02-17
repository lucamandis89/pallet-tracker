/* app/lib/storage.ts
   Storage unico (localStorage) per:
   - Pedane (registro)
   - Storico scansioni
   - Autisti / Negozi / Depositi
   - Stock (giacenze) + movimenti
*/

export type StockLocationKind = "NEGOZIO" | "DEPOSITO" | "AUTISTA";

export type PalletItem = {
  id: string;
  code: string; // QR / codice pedana
  createdTs: number;
  updatedTs: number;

  palletType?: string; // EUR/EPAL, CHEP, LPR, IFCO...
  qty?: number; // di default 1

  // ultima posizione GPS letta
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastAccuracy?: number;
  lastSource?: "qr" | "manual";

  // “dove si trova ORA” dichiarato dall’operatore (negozio/deposito/autista)
  locationKind?: StockLocationKind;
  locationId?: string;

  // opzionale: codici alternativi / note
  altCode?: string;
  notes?: string;

  // stato
  isMissing?: boolean;
};

export type DriverItem = { id: string; name: string; phone?: string; createdTs: number; updatedTs: number };
export type ShopItem = { id: string; name: string; address?: string; createdTs: number; updatedTs: number };
export type DepotItem = { id: string; name: string; address?: string; createdTs: number; updatedTs: number };

export type ScanHistoryItem = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source: "qr" | "manual";

  // se in quell’operazione è stato dichiarato uno spostamento/stock
  declaredKind?: StockLocationKind;
  declaredId?: string;
  palletType?: string;
  qty?: number;
  note?: string;
};

export type StockMove = {
  id: string;
  ts: number;
  code: string;
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

export type StockRow = {
  palletType: string;
  qty: number;
  locationKind: StockLocationKind;
  locationId: string;
};

// =========================
// helpers
// =========================

const KEY = {
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",
  drivers: "pt_drivers_v1",
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  lastScan: "pt_lastscan_v1",
  stockRows: "pt_stockrows_v1", // mappa giacenze
  stockMoves: "pt_stockmoves_v1", // movimenti
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function now() {
  return Date.now();
}

function ensureSeed() {
  // deposito di default (se non esiste)
  const depots = getDepots();
  if (depots.length === 0) {
    addDepot({ name: "Deposito Centrale" });
  }
  // negozio di default (se non esiste)
  const shops = getShops();
  if (shops.length === 0) {
    addShop({ name: "Negozio 1" });
  }
}

// =========================
// CSV utils
// =========================

export function formatDT(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds()
  )}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
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

// =========================
// Pallets (Registro pedane)
// =========================

export function getPallets(): PalletItem[] {
  ensureSeed();
  return readJson<PalletItem[]>(KEY.pallets, []);
}

export function setPallets(list: PalletItem[]) {
  writeJson(KEY.pallets, list);
}

export function upsertPallet(partial: Partial<PalletItem> & { code: string }): PalletItem {
  const all = getPallets();
  const code = partial.code.trim();
  const idx = all.findIndex((p) => p.code === code);

  if (idx >= 0) {
    const prev = all[idx];
    const next: PalletItem = {
      ...prev,
      ...partial,
      id: prev.id,
      code,
      updatedTs: now(),
      createdTs: prev.createdTs ?? now(),
    };
    all[idx] = next;
    setPallets(all);
    return next;
  }

  const created: PalletItem = {
    id: uid("p"),
    code,
    createdTs: now(),
    updatedTs: now(),
    qty: partial.qty ?? 1,
    ...partial,
  };
  all.unshift(created);
  setPallets(all);
  return created;
}

export function deletePallet(id: string) {
  const all = getPallets().filter((p) => p.id !== id);
  setPallets(all);
}

export function markMissing(id: string, isMissing: boolean) {
  const all = getPallets();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], isMissing, updatedTs: now() };
  setPallets(all);
}

// =========================
// History (Storico scansioni)
// =========================

export function getScanHistory(): ScanHistoryItem[] {
  return readJson<ScanHistoryItem[]>(KEY.history, []);
}

export function addScanHistory(item: Omit<ScanHistoryItem, "id">) {
  const all = getScanHistory();
  all.unshift({ ...item, id: uid("h") });
  writeJson(KEY.history, all.slice(0, 5000)); // cap
}

export function clearScanHistory() {
  writeJson(KEY.history, []);
}

// compat: alcuni tuoi file importano addHistory
export const addHistory = addScanHistory;

export function setLastScan(code: string) {
  writeJson(KEY.lastScan, { code: code.trim(), ts: now() });
}
export function getLastScan(): { code: string; ts: number } | null {
  return readJson(KEY.lastScan, null as any);
}

// =========================
// Drivers
// =========================

export function getDrivers(): DriverItem[] {
  return readJson<DriverItem[]>(KEY.drivers, []);
}

export function addDriver(input: { name: string; phone?: string }) {
  const all = getDrivers();
  const it: DriverItem = { id: uid("d"), name: input.name.trim(), phone: input.phone?.trim(), createdTs: now(), updatedTs: now() };
  all.unshift(it);
  writeJson(KEY.drivers, all);
  return it;
}

export function updateDriver(id: string, patch: Partial<DriverItem>) {
  const all = getDrivers();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updatedTs: now() };
  writeJson(KEY.drivers, all);
}

export function removeDriver(id: string) {
  writeJson(KEY.drivers, getDrivers().filter((x) => x.id !== id));
}

// =========================
// Shops
// =========================

export function getShops(): ShopItem[] {
  return readJson<ShopItem[]>(KEY.shops, []);
}

export function addShop(input: { name: string; address?: string }) {
  const all = getShops();
  const it: ShopItem = { id: uid("s"), name: input.name.trim(), address: input.address?.trim(), createdTs: now(), updatedTs: now() };
  all.unshift(it);
  writeJson(KEY.shops, all);
  return it;
}

export function updateShop(id: string, patch: Partial<ShopItem>) {
  const all = getShops();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updatedTs: now() };
  writeJson(KEY.shops, all);
}

export function removeShop(id: string) {
  writeJson(KEY.shops, getShops().filter((x) => x.id !== id));
}

export function getDefaultShop(): ShopItem {
  ensureSeed();
  return getShops()[0];
}

// compat: alcuni tuoi file importano getShopOptions
export function getShopOptions(): ShopItem[] {
  ensureSeed();
  return getShops();
}

// =========================
// Depots
// =========================

export function getDepots(): DepotItem[] {
  return readJson<DepotItem[]>(KEY.depots, []);
}

export function addDepot(input: { name: string; address?: string }) {
  const all = getDepots();
  const it: DepotItem = { id: uid("w"), name: input.name.trim(), address: input.address?.trim(), createdTs: now(), updatedTs: now() };
  all.unshift(it);
  writeJson(KEY.depots, all);
  return it;
}

export function updateDepot(id: string, patch: Partial<DepotItem>) {
  const all = getDepots();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updatedTs: now() };
  writeJson(KEY.depots, all);
}

export function removeDepot(id: string) {
  writeJson(KEY.depots, getDepots().filter((x) => x.id !== id));
}

export function getDefaultDepot(): DepotItem {
  ensureSeed();
  return getDepots()[0];
}

export function getDepotOptions(): DepotItem[] {
  ensureSeed();
  return getDepots();
}

// =========================
// Stock (rows + moves)
// =========================

type StockMap = Record<string, number>; // key = `${kind}:${id}:${type}` -> qty

function readStockMap(): StockMap {
  return readJson<StockMap>(KEY.stockRows, {});
}

function writeStockMap(m: StockMap) {
  writeJson(KEY.stockRows, m);
}

export function getStockRows(): StockRow[] {
  const m = readStockMap();
  const rows: StockRow[] = [];
  for (const k of Object.keys(m)) {
    const qty = m[k] || 0;
    if (qty === 0) continue;
    const [kind, id, ...rest] = k.split(":");
    const palletType = rest.join(":");
    if (kind !== "NEGOZIO" && kind !== "DEPOSITO" && kind !== "AUTISTA") continue;
    rows.push({ locationKind: kind, locationId: id, palletType, qty });
  }
  return rows;
}

function stockKey(kind: StockLocationKind, id: string, palletType: string) {
  return `${kind}:${id}:${palletType}`;
}

function addStockDelta(kind: StockLocationKind, id: string, palletType: string, delta: number) {
  const m = readStockMap();
  const k = stockKey(kind, id, palletType);
  const next = (m[k] || 0) + delta;
  m[k] = Math.max(0, next);
  writeStockMap(m);
}

export function getStockMoves(): StockMove[] {
  return readJson<StockMove[]>(KEY.stockMoves, []);
}

function addStockMove(move: Omit<StockMove, "id">) {
  const all = getStockMoves();
  all.unshift({ ...move, id: uid("m") });
  writeJson(KEY.stockMoves, all.slice(0, 10000));
}

// =========================
// Move via Scan (aggiorna pallet + stock + log)
// =========================

export function movePalletViaScan(input: {
  code: string;
  palletType: string;
  qty: number;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
}) {
  ensureSeed();

  const code = input.code.trim();
  const palletType = input.palletType.trim();
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const toKind = input.toKind;
  const toId = input.toId;

  // pallet corrente
  const p = upsertPallet({ code });

  const fromKind: StockLocationKind = p.locationKind ?? "NEGOZIO";
  const fromId: string = p.locationId ?? getDefaultShop().id;

  // aggiorna stock SOLO se cambia destinazione o anche se uguale (somma qty)
  // - se cambia: scala dal vecchio e aggiunge al nuovo
  // - se uguale: aggiunge al nuovo (utile per carichi multipli)
  if (fromKind !== toKind || fromId !== toId) {
    if (p.palletType) addStockDelta(fromKind, fromId, p.palletType, -qty);
    addStockDelta(toKind, toId, palletType, +qty);
  } else {
    addStockDelta(toKind, toId, palletType, +qty);
  }

  // aggiorna pallet
  upsertPallet({
    code,
    palletType,
    qty,
    locationKind: toKind,
    locationId: toId,
    notes: input.note ? input.note : p.notes,
  });

  addStockMove({
    ts: now(),
    code,
    palletType,
    qty,
    from: { kind: fromKind, id: fromId },
    to: { kind: toKind, id: toId },
    note: input.note,
  });

  return {
    from: { kind: fromKind, id: fromId },
    to: { kind: toKind, id: toId },
  };
}
