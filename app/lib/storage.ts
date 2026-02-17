// app/lib/storage.ts
// Client-only storage helpers (localStorage).
// Mantiene: Pedane, Negozi, Depositi, Autisti, Storico, Scansioni, Missing, Stock + CSV export.

export type IdName = { id: string; name: string };

export type StockLocationKind = "DEPOSITO" | "NEGOZIO" | "AUTISTA";

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
  lat?: number;
  lng?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type PalletItem = {
  id: string; // id interno
  code: string; // codice/QR (string)
  palletType: string; // tipo pedana (es: EPAL, 80x120, ecc.)
  status?: "OK" | "MISSING" | "DAMAGED";
  locationKind: StockLocationKind;
  locationId: string; // id di deposito/negozio/autista (in base a locationKind)
  lastSeenAt?: number;
  note?: string;
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
  palletType: string;
  qty: number; // normalmente 1, ma lo teniamo generico
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

export type HistoryItem = {
  id: string;
  ts: number;
  kind: "INFO" | "MOVE" | "SCAN" | "ERROR";
  title: string;
  detail?: string;
  meta?: Record<string, any>;
};

export type ScanHistoryItem = {
  id: string;
  ts: number;
  code: string;
  ok: boolean;
  note?: string;
  gps?: { lat: number; lng: number; accuracy?: number };
};

export type MissingItem = {
  id: string;
  ts: number;
  code: string;
  note?: string;
  resolvedAt?: number;
};

type Json = any;

// ---------- keys ----------
const K = {
  pallets: "pt_pallets_v1",
  drivers: "pt_drivers_v1",
  depots: "pt_depots_v1",
  shops: "pt_shops_v1",
  history: "pt_history_v1",
  scanHistory: "pt_scan_history_v1",
  lastScan: "pt_last_scan_v1",
  missing: "pt_missing_v1",
  stockMoves: "pt_stock_moves_v1",

  defaultDepot: "pt_default_depot_v1",
  defaultShop: "pt_default_shop_v1",
};

// ---------- utils ----------
function now() {
  return Date.now();
}

function uid(prefix = "id") {
  // sufficientemente unico per local storage
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

function loadArr<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  return safeParse<T[]>(localStorage.getItem(key), []);
}

function saveArr<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function loadVal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function saveVal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- formatting / csv ----------
export function formatDT(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  if (typeof window === "undefined") return;

  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    // CSV standard: se contiene virgola/quote/newline, racchiudi in ""
    const needs = /[",\n\r;]/.test(s);
    const normalized = s.replace(/"/g, '""');
    return needs ? `"${normalized}"` : normalized;
  };

  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- HISTORY ----------
export function getHistory(): HistoryItem[] {
  return loadArr<HistoryItem>(K.history).sort((a, b) => b.ts - a.ts);
}

export function addHistory(item: Omit<HistoryItem, "id" | "ts"> & { ts?: number }) {
  const list = loadArr<HistoryItem>(K.history);
  list.unshift({
    id: uid("hist"),
    ts: item.ts ?? now(),
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    meta: item.meta,
  });
  // cap per non crescere infinito
  saveArr(K.history, list.slice(0, 500));
}

export function clearHistory() {
  saveArr(K.history, []);
}

// compat: alcuni log suggerivano clearScanHistory come “did you mean”
export function clearScanHistory() {
  saveArr(K.scanHistory, []);
}

// ---------- SCAN HISTORY ----------
export function getScanHistory(): ScanHistoryItem[] {
  return loadArr<ScanHistoryItem>(K.scanHistory).sort((a, b) => b.ts - a.ts);
}

export function addScanHistory(item: Omit<ScanHistoryItem, "id" | "ts"> & { ts?: number }) {
  const list = loadArr<ScanHistoryItem>(K.scanHistory);
  list.unshift({
    id: uid("scan"),
    ts: item.ts ?? now(),
    code: item.code,
    ok: item.ok,
    note: item.note,
    gps: item.gps,
  });
  saveArr(K.scanHistory, list.slice(0, 400));
}

// alias per vecchi import che ho visto nei tuoi screenshot (“did you mean addScanHistory?”)
export const addHistoryScan = addScanHistory;

// ---------- LAST SCAN ----------
export function setLastScan(payload: any) {
  saveVal(K.lastScan, payload ?? null);
}

export function getLastScan<T = any>(): T | null {
  return loadVal<T | null>(K.lastScan, null);
}

// ---------- DEPOTS ----------
export function getDepots(): DepotItem[] {
  return loadArr<DepotItem>(K.depots);
}

export function addDepot(data: { name: string; address?: string; city?: string; note?: string }) {
  const list = getDepots();
  const t = now();
  const item: DepotItem = {
    id: uid("depot"),
    name: data.name.trim(),
    address: data.address?.trim(),
    city: data.city?.trim(),
    note: data.note?.trim(),
    createdAt: t,
    updatedAt: t,
  };
  list.unshift(item);
  saveArr(K.depots, list);
  addHistory({ kind: "INFO", title: "Creato deposito", detail: item.name });
  return item;
}

export function updateDepot(id: string, patch: Partial<Omit<DepotItem, "id" | "createdAt">>) {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  saveArr(K.depots, list);
  return list[idx];
}

export function removeDepot(id: string) {
  const list = getDepots().filter((x) => x.id !== id);
  saveArr(K.depots, list);
}

export function getDepotOptions(): IdName[] {
  return getDepots().map((d) => ({ id: d.id, name: d.name }));
}

export function getDefaultDepot(): string | null {
  return loadVal<string | null>(K.defaultDepot, null);
}

export function setDefaultDepot(id: string | null) {
  saveVal(K.defaultDepot, id);
}

// ---------- SHOPS ----------
export function getShops(): ShopItem[] {
  return loadArr<ShopItem>(K.shops);
}

export function addShop(data: { name: string; address?: string; city?: string; lat?: number; lng?: number; note?: string }) {
  const list = getShops();
  const t = now();
  const item: ShopItem = {
    id: uid("shop"),
    name: data.name.trim(),
    address: data.address?.trim(),
    city: data.city?.trim(),
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    note: data.note?.trim(),
    createdAt: t,
    updatedAt: t,
  };
  list.unshift(item);
  saveArr(K.shops, list);
  addHistory({ kind: "INFO", title: "Creato negozio", detail: item.name });
  return item;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "createdAt">>) {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  saveArr(K.shops, list);
  return list[idx];
}

export function removeShop(id: string) {
  const list = getShops().filter((x) => x.id !== id);
  saveArr(K.shops, list);
}

export function getShopOptions(): IdName[] {
  return getShops().map((s) => ({ id: s.id, name: s.name }));
}

export function getDefaultShop(): string | null {
  return loadVal<string | null>(K.defaultShop, null);
}

export function setDefaultShop(id: string | null) {
  saveVal(K.defaultShop, id);
}

// ---------- DRIVERS ----------
export function getDrivers(): DriverItem[] {
  return loadArr<DriverItem>(K.drivers);
}

export function addDriver(data: { name: string; phone?: string; note?: string }) {
  const list = getDrivers();
  const t = now();
  const item: DriverItem = {
    id: uid("drv"),
    name: data.name.trim(),
    phone: data.phone?.trim(),
    note: data.note?.trim(),
    createdAt: t,
    updatedAt: t,
  };
  list.unshift(item);
  saveArr(K.drivers, list);
  addHistory({ kind: "INFO", title: "Creato autista", detail: item.name });
  return item;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "createdAt">>) {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  saveArr(K.drivers, list);
  return list[idx];
}

export function removeDriver(id: string) {
  const list = getDrivers().filter((x) => x.id !== id);
  saveArr(K.drivers, list);
}

// ---------- PALLETS ----------
export function getPallets(): PalletItem[] {
  return loadArr<PalletItem>(K.pallets);
}

export function setPallets(pallets: PalletItem[]) {
  saveArr(K.pallets, pallets);
}

export function upsertPallet(pallet: Partial<PalletItem> & { code: string }) {
  const list = getPallets();
  const code = pallet.code.trim();
  const t = now();

  const idx = list.findIndex((p) => p.code === code);
  if (idx >= 0) {
    const updated: PalletItem = {
      ...list[idx],
      ...pallet,
      code,
      updatedAt: t,
    } as PalletItem;
    list[idx] = updated;
    saveArr(K.pallets, list);
    return updated;
  }

  const created: PalletItem = {
    id: uid("plt"),
    code,
    palletType: pallet.palletType?.trim() || "STANDARD",
    status: pallet.status ?? "OK",
    locationKind: pallet.locationKind ?? "DEPOSITO",
    locationId: pallet.locationId ?? (getDefaultDepot() || ""),
    lastSeenAt: pallet.lastSeenAt ?? t,
    note: pallet.note?.trim(),
    createdAt: t,
    updatedAt: t,
  };
  list.unshift(created);
  saveArr(K.pallets, list);
  addHistory({ kind: "INFO", title: "Creata pedana", detail: `${created.code} (${created.palletType})` });
  return created;
}

export function deletePallet(id: string) {
  const list = getPallets().filter((p) => p.id !== id);
  saveArr(K.pallets, list);
}

// alias “removePallet” se qualche pagina lo usa
export const removePallet = deletePallet;

// ---------- MISSING ----------
export function getMissing(): MissingItem[] {
  return loadArr<MissingItem>(K.missing).sort((a, b) => b.ts - a.ts);
}

export function reportMissing(code: string, note?: string) {
  const list = getMissing();
  const item: MissingItem = { id: uid("miss"), ts: now(), code: code.trim(), note: note?.trim() };
  list.unshift(item);
  saveArr(K.missing, list);

  // segna anche la pedana come missing se esiste
  const pallets = getPallets();
  const pIdx = pallets.findIndex((p) => p.code === item.code);
  if (pIdx >= 0) {
    pallets[pIdx] = { ...pallets[pIdx], status: "MISSING", updatedAt: now() };
    saveArr(K.pallets, pallets);
  }

  addHistory({ kind: "INFO", title: "Pedana segnalata mancante", detail: item.code, meta: { note: item.note } });
  return item;
}

export function resolveMissing(id: string) {
  const list = getMissing();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], resolvedAt: now() };
  saveArr(K.missing, list);
  addHistory({ kind: "INFO", title: "Mancanza risolta", detail: list[idx].code });
  return list[idx];
}

// ---------- STOCK (rows + moves) ----------
export function getStockMoves(): StockMove[] {
  return loadArr<StockMove>(K.stockMoves).sort((a, b) => b.ts - a.ts);
}

function pushStockMove(move: Omit<StockMove, "id">) {
  const list = loadArr<StockMove>(K.stockMoves);
  list.unshift({ ...move, id: uid("mv") });
  saveArr(K.stockMoves, list.slice(0, 600));
}

export function getStockRows(): StockRow[] {
  // aggrega direttamente dalle pedane
  const pallets = getPallets();
  const map = new Map<string, StockRow>();

  for (const p of pallets) {
    const key = `${p.palletType}__${p.locationKind}__${p.locationId}`;
    const cur = map.get(key);
    if (cur) cur.qty += 1;
    else map.set(key, { palletType: p.palletType, qty: 1, locationKind: p.locationKind, locationId: p.locationId });
  }

  return Array.from(map.values());
}

// ---------- MOVE VIA SCAN (usato da /scan) ----------
export function movePalletViaScan(args: {
  code: string; // QR
  palletType?: string;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
  gps?: { lat: number; lng: number; accuracy?: number };
}) {
  const t = now();
  const pallets = getPallets();
  const code = args.code.trim();

  let p = pallets.find((x) => x.code === code);
  if (!p) {
    // se non esiste, la creiamo al volo (comodo per operatività)
    p = upsertPallet({
      code,
      palletType: args.palletType?.trim() || "STANDARD",
      locationKind: args.toKind,
      locationId: args.toId,
      lastSeenAt: t,
      status: "OK",
    });
    addScanHistory({ code, ok: true, note: "Creata e movimentata da scan", gps: args.gps });
    setLastScan({ code, action: "CREATE+MOVE", ts: t });
    return p;
  }

  const from = { kind: p.locationKind, id: p.locationId };
  const to = { kind: args.toKind, id: args.toId };

  // se non cambia nulla, aggiorna solo lastSeen
  if (from.kind === to.kind && from.id === to.id) {
    const idx = pallets.findIndex((x) => x.id === p!.id);
    pallets[idx] = { ...p!, lastSeenAt: t, updatedAt: t };
    saveArr(K.pallets, pallets);
    addScanHistory({ code, ok: true, note: "Scan OK (nessun cambio posizione)", gps: args.gps });
    setLastScan({ code, action: "NOOP", ts: t });
    return pallets[idx];
  }

  // aggiorna pedana
  const idx = pallets.findIndex((x) => x.id === p!.id);
  const updated: PalletItem = {
    ...p!,
    locationKind: to.kind,
    locationId: to.id,
    lastSeenAt: t,
    updatedAt: t,
  };
  pallets[idx] = updated;
  saveArr(K.pallets, pallets);

  // log
  pushStockMove({
    ts: t,
    palletType: updated.palletType,
    qty: 1,
    from,
    to,
    note: args.note,
  });

  addHistory({
    kind: "MOVE",
    title: "Movimento pedana",
    detail: `${updated.code} • ${from.kind} → ${to.kind}`,
    meta: { from, to, note: args.note, gps: args.gps },
  });

  addScanHistory({ code, ok: true, note: "Movimentata da scan", gps: args.gps });
  setLastScan({ code, action: "MOVE", ts: t, from, to });

  return updated;
}
