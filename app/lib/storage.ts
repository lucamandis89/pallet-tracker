// app/lib/storage.ts
// Storage unico per tutta l'app: shops, depots, drivers, pallets, history, stock.
// Tutto in localStorage (demo/prototipo). Export coerenti con le pagine.

export type StockLocationKind = "DEPOSITO" | "NEGOZIO" | "AUTISTA";

export type ShopItem = { id: string; name: string; address?: string; active?: boolean };
export type DepotItem = { id: string; name: string; address?: string; active?: boolean };
export type DriverItem = { id: string; name: string; phone?: string; active?: boolean };

export type PalletItem = {
  id: string;              // interno
  code: string;            // QR / codice principale
  altCode?: string;        // eventuale codice alternativo
  palletType: string;      // es: EUR/EPAL...
  qty: number;
  location: { kind: StockLocationKind; id: string }; // dove si trova ORA
  note?: string;
  updatedAt: number;
};

export type ScanHistoryItem = {
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source: "qr" | "manual";
  declaredKind: StockLocationKind;
  declaredId: string;
  palletType: string;
  qty: number;
};

export type StockMoveItem = {
  ts: number;
  code: string;
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

type IdLabel = { id: string; label: string };

const KEYS = {
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  drivers: "pt_drivers_v1",
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",
  stockMoves: "pt_stock_moves_v1",
  lastScan: "pt_last_scan_v1",
};

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadArr<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  return safeParse<T[]>(localStorage.getItem(key), []);
}

function saveArr<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

/* -------------------- DEFAULTS -------------------- */

export function getDefaultShop(): ShopItem {
  const all = getShops();
  if (all.length > 0) return all[0];
  const created: ShopItem = { id: "shop_main", name: "Negozio Principale", active: true };
  setShops([created]);
  return created;
}

export function getDefaultDepot(): DepotItem {
  const all = getDepots();
  if (all.length > 0) return all[0];
  const created: DepotItem = { id: "depot_main", name: "Deposito Principale", active: true };
  setDepots([created]);
  return created;
}

/* -------------------- SHOPS -------------------- */

export function getShops(): ShopItem[] {
  return loadArr<ShopItem>(KEYS.shops);
}

export function setShops(list: ShopItem[]) {
  saveArr(KEYS.shops, list);
}

export function addShop(name: string, address?: string): ShopItem {
  const list = getShops();
  const item: ShopItem = { id: uid("shop"), name: name.trim(), address: address?.trim(), active: true };
  setShops([item, ...list]);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>): ShopItem {
  const list = getShops();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Negozio non trovato");
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  setShops(next);
  return updated;
}

export function removeShop(id: string) {
  const list = getShops().filter((s) => s.id !== id);
  setShops(list);
}

export function getShopOptions(): IdLabel[] {
  const list = getShops();
  const base = list.length ? list : [getDefaultShop()];
  return base.map((s) => ({ id: s.id, label: s.name }));
}

/* -------------------- DEPOTS -------------------- */

export function getDepots(): DepotItem[] {
  return loadArr<DepotItem>(KEYS.depots);
}

export function setDepots(list: DepotItem[]) {
  saveArr(KEYS.depots, list);
}

export function addDepot(name: string, address?: string): DepotItem {
  const list = getDepots();
  const item: DepotItem = { id: uid("depot"), name: name.trim(), address: address?.trim(), active: true };
  setDepots([item, ...list]);
  return item;
}

export function updateDepot(id: string, patch: Partial<DepotItem>): DepotItem {
  const list = getDepots();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Deposito non trovato");
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  setDepots(next);
  return updated;
}

export function removeDepot(id: string) {
  const list = getDepots().filter((d) => d.id !== id);
  setDepots(list);
}

export function getDepotOptions(): IdLabel[] {
  const list = getDepots();
  const base = list.length ? list : [getDefaultDepot()];
  return base.map((d) => ({ id: d.id, label: d.name }));
}

/* -------------------- DRIVERS -------------------- */

export function getDrivers(): DriverItem[] {
  return loadArr<DriverItem>(KEYS.drivers);
}

export function setDrivers(list: DriverItem[]) {
  saveArr(KEYS.drivers, list);
}

export function addDriver(name: string, phone?: string): DriverItem {
  const list = getDrivers();
  const item: DriverItem = { id: uid("drv"), name: name.trim(), phone: phone?.trim(), active: true };
  setDrivers([item, ...list]);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>): DriverItem {
  const list = getDrivers();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Autista non trovato");
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  setDrivers(next);
  return updated;
}

export function removeDriver(id: string) {
  const list = getDrivers().filter((d) => d.id !== id);
  setDrivers(list);
}

/* -------------------- PALLETS -------------------- */

export function getPallets(): PalletItem[] {
  return loadArr<PalletItem>(KEYS.pallets);
}

export function setPallets(list: PalletItem[]) {
  saveArr(KEYS.pallets, list);
}

export function upsertPallet(p: PalletItem): PalletItem {
  const list = getPallets();
  const idx = list.findIndex((x) => x.id === p.id);
  const next = [...list];
  if (idx >= 0) next[idx] = p;
  else next.unshift(p);
  setPallets(next);
  return p;
}

export function deletePallet(id: string) {
  setPallets(getPallets().filter((p) => p.id !== id));
}

/* -------------------- HISTORY -------------------- */

export function getHistory(): ScanHistoryItem[] {
  return loadArr<ScanHistoryItem>(KEYS.history).sort((a, b) => b.ts - a.ts);
}

// compat: alcune pagine importano addHistory, altre addScanHistory
export function addHistory(item: ScanHistoryItem) {
  const list = loadArr<ScanHistoryItem>(KEYS.history);
  list.unshift(item);
  saveArr(KEYS.history, list.slice(0, 5000));
}
export const addScanHistory = addHistory;

/* -------------------- LAST SCAN -------------------- */

export function setLastScan(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.lastScan, code);
}
export function getLastScan(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEYS.lastScan) || "";
}

/* -------------------- MOVES / STOCK -------------------- */

export function getStockMoves(): StockMoveItem[] {
  return loadArr<StockMoveItem>(KEYS.stockMoves).sort((a, b) => b.ts - a.ts);
}

export function addStockMove(m: StockMoveItem) {
  const list = loadArr<StockMoveItem>(KEYS.stockMoves);
  list.unshift(m);
  saveArr(KEYS.stockMoves, list.slice(0, 10000));
}

// Righe aggregate per vista Stock (totali per location + tipo)
export function getStockRows() {
  const pallets = getPallets();
  const shops = getShopOptions();
  const depots = getDepotOptions();
  const drivers = getDrivers().map((d) => ({ id: d.id, label: d.name }));

  const byLocLabel = (kind: StockLocationKind, id: string) => {
    if (kind === "NEGOZIO") return shops.find((s) => s.id === id)?.label || "Negozio";
    if (kind === "DEPOSITO") return depots.find((d) => d.id === id)?.label || "Deposito";
    return drivers.find((x) => x.id === id)?.label || "Autista";
  };

  const map = new Map<string, { kind: StockLocationKind; id: string; label: string; palletType: string; qty: number }>();

  for (const p of pallets) {
    const key = `${p.location.kind}::${p.location.id}::${p.palletType}`;
    const current = map.get(key);
    if (current) current.qty += p.qty;
    else {
      map.set(key, {
        kind: p.location.kind,
        id: p.location.id,
        label: byLocLabel(p.location.kind, p.location.id),
        palletType: p.palletType,
        qty: p.qty,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.label + a.palletType).localeCompare(b.label + b.palletType));
}

// Opzioni per select “dove si trova ORA?”
export function getStockLocationOptions(kind: StockLocationKind): IdLabel[] {
  if (kind === "NEGOZIO") return getShopOptions();
  if (kind === "DEPOSITO") return getDepotOptions();
  return getDrivers().map((d) => ({ id: d.id, label: d.name }));
}

/**
 * Aggiorna/crea la pedana scansionata e registra lo spostamento.
 * Usata da /scan
 */
export function movePalletViaScan(args: {
  code: string;
  palletType: string;
  qty: number;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
}): { pallet: PalletItem; from: { kind: StockLocationKind; id: string }; to: { kind: StockLocationKind; id: string } } {
  const code = args.code.trim();
  if (!code) throw new Error("Codice pedana mancante");

  const to = { kind: args.toKind, id: args.toId };

  // trovo per code o altCode
  const list = getPallets();
  const found = list.find((p) => p.code === code || p.altCode === code);

  const from = found?.location ?? { kind: "DEPOSITO" as StockLocationKind, id: getDefaultDepot().id };

  const pallet: PalletItem = {
    id: found?.id || uid("plt"),
    code: found?.code || code,
    altCode: found?.altCode,
    palletType: args.palletType,
    qty: Math.max(1, Math.floor(args.qty)),
    location: to,
    note: args.note?.trim() || found?.note,
    updatedAt: Date.now(),
  };

  upsertPallet(pallet);

  addStockMove({
    ts: Date.now(),
    code: pallet.code,
    palletType: pallet.palletType,
    qty: pallet.qty,
    from,
    to,
    note: args.note?.trim() || undefined,
  });

  setLastScan(pallet.code);

  return { pallet, from, to };
}
