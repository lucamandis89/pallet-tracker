"use client";

/* =========================================================
   STORAGE CENTRALIZZATO - Pallet Tracker
   Tutti i dati vengono salvati in localStorage.
   ========================================================= */

export type StockLocationKind = "NEGOZIO" | "DEPOSITO" | "AUTISTA";

export type Driver = {
  id: string;
  name: string;
  phone?: string;
};

export type Shop = {
  id: string;
  name: string;
  address?: string;
};

export type Depot = {
  id: string;
  name: string;
  address?: string;
};

export type PalletItem = {
  id: string;          // codice principale (PEDANA-xxx)
  type: string;        // tipo pallet (EPAL, CHEP, IFCO, ecc.)
  altCode?: string;    // codice alternativo
  note?: string;
  createdAt: number;
};

export type ScanHistoryItem = {
  id: string;
  palletCode: string;
  ts: number;
  lat?: number;
  lng?: number;
  note?: string;
};

export type StockMove = {
  id: string;
  ts: number;
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

/* =========================
   KEY STORAGE
========================= */

const KEY_DRIVERS = "pt_drivers";
const KEY_SHOPS = "pt_shops";
const KEY_DEPOTS = "pt_depots";
const KEY_PALLETS = "pt_pallets";
const KEY_SCAN_HISTORY = "pt_scan_history";
const KEY_STOCK_MOVES = "pt_stock_moves";

/* =========================
   FUNZIONI BASE
========================= */

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, data: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* =========================
   FORMATTING
========================= */

export function formatDT(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("it-IT");
}

/* =========================
   CSV EXPORT
========================= */

export function downloadCsv(filename: string, headers: string[], rows: any[][]) {
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ].join("\n");

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

/* =========================
   AUTISTI
========================= */

export function getDrivers(): Driver[] {
  return load<Driver[]>(KEY_DRIVERS, []);
}

export function addDriver(name: string, phone?: string) {
  const list = getDrivers();
  list.push({ id: uid("DRV"), name, phone });
  save(KEY_DRIVERS, list);
}

export function deleteDriver(id: string) {
  const list = getDrivers().filter((d) => d.id !== id);
  save(KEY_DRIVERS, list);
}

/* =========================
   NEGOZI
========================= */

export function getShopOptions(): Shop[] {
  return load<Shop[]>(KEY_SHOPS, []);
}

export function addShop(name: string, address?: string) {
  const list = getShopOptions();
  list.push({ id: uid("SHOP"), name, address });
  save(KEY_SHOPS, list);
}

export function deleteShop(id: string) {
  const list = getShopOptions().filter((s) => s.id !== id);
  save(KEY_SHOPS, list);
}

/* =========================
   DEPOSITI
========================= */

export function getDepotOptions(): Depot[] {
  return load<Depot[]>(KEY_DEPOTS, []);
}

export function addDepot(name: string, address?: string) {
  const list = getDepotOptions();
  list.push({ id: uid("DEP"), name, address });
  save(KEY_DEPOTS, list);
}

export function deleteDepot(id: string) {
  const list = getDepotOptions().filter((d) => d.id !== id);
  save(KEY_DEPOTS, list);
}

/* =========================
   REGISTRO PEDANE
========================= */

export function getPallets(): PalletItem[] {
  return load<PalletItem[]>(KEY_PALLETS, []);
}

export function addPallet(id: string, type: string, altCode?: string, note?: string) {
  const list = getPallets();

  // evita duplicati
  const exists = list.find((p) => p.id === id);
  if (exists) return;

  list.push({
    id,
    type,
    altCode,
    note,
    createdAt: Date.now(),
  });

  save(KEY_PALLETS, list);
}

export function updatePallet(id: string, patch: Partial<PalletItem>) {
  const list = getPallets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;

  list[idx] = { ...list[idx], ...patch };
  save(KEY_PALLETS, list);
}

export function deletePallet(id: string) {
  const list = getPallets().filter((p) => p.id !== id);
  save(KEY_PALLETS, list);
}

/* =========================
   SCANSIONI (HISTORY)
========================= */

export function getScanHistory(): ScanHistoryItem[] {
  return load<ScanHistoryItem[]>(KEY_SCAN_HISTORY, []);
}

export function addScanHistory(palletCode: string, lat?: number, lng?: number, note?: string) {
  const list = getScanHistory();

  list.unshift({
    id: uid("HIS"),
    palletCode,
    ts: Date.now(),
    lat,
    lng,
    note,
  });

  save(KEY_SCAN_HISTORY, list);
}

export function clearScanHistory() {
  save(KEY_SCAN_HISTORY, []);
}

/* =========================
   STOCK MOVES (MOVIMENTI)
========================= */

export function getStockMoves(): StockMove[] {
  return load<StockMove[]>(KEY_STOCK_MOVES, []);
}

export function addStockMove(move: Omit<StockMove, "id">) {
  const list = getStockMoves();

  list.unshift({
    ...move,
    id: uid("MOVE"),
  });

  save(KEY_STOCK_MOVES, list);
}

/* =========================
   CALCOLO GIACENZE
========================= */

export function getStockRows(): StockRow[] {
  const moves = getStockMoves();
  const map = new Map<string, number>();

  // chiave = palletType|kind|id
  function key(t: string, kind: StockLocationKind, id: string) {
    return `${t}|${kind}|${id}`;
  }

  for (const m of moves) {
    const fromKey = key(m.palletType, m.from.kind, m.from.id);
    const toKey = key(m.palletType, m.to.kind, m.to.id);

    map.set(fromKey, (map.get(fromKey) || 0) - (m.qty || 0));
    map.set(toKey, (map.get(toKey) || 0) + (m.qty || 0));
  }

  const rows: StockRow[] = [];
  for (const [k, qty] of map.entries()) {
    const [palletType, kind, id] = k.split("|");
    rows.push({
      palletType,
      qty,
      locationKind: kind as StockLocationKind,
      locationId: id,
    });
  }

  // filtro righe vuote
  return rows.filter((r) => (r.qty ?? 0) !== 0);
}
