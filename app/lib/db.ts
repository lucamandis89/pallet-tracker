export type Driver = { id: string; name: string; phone?: string; note?: string; createdAt: number };
export type Shop = { id: string; name: string; address?: string; city?: string; note?: string; createdAt: number };
export type Depot = { id: string; name: string; address?: string; city?: string; note?: string; createdAt: number };

export type PalletType =
  | "EUR/EPAL"
  | "CHEP"
  | "IFCO"
  | "CP1"
  | "CP2"
  | "CP3"
  | "CP4"
  | "CP5"
  | "CP6"
  | "CP7"
  | "CP8"
  | "ALTRO";

export type PlaceKind = "SHOP" | "DEPOT" | "TRUCK" | "UNKNOWN";

export type ScanEvent = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;

  palletType?: PalletType;
  qty?: number;

  placeKind?: PlaceKind;
  placeId?: string; // shop/depot/driver id
  note?: string;
};

export type StockRow = {
  id: string;
  palletType: PalletType;
  qty: number;
  placeKind: PlaceKind;
  placeId?: string;
  updatedAt: number;
};

type DB = {
  drivers: Driver[];
  shops: Shop[];
  depots: Depot[];
  scans: ScanEvent[];
  stock: StockRow[];
};

const KEY = "pallet-tracker-db-v1";

function safeParse<T>(s: string | null): T | null {
  try {
    if (!s) return null;
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function loadDB(): DB {
  if (typeof window === "undefined") {
    return { drivers: [], shops: [], depots: [], scans: [], stock: [] };
  }
  const raw = window.localStorage.getItem(KEY);
  const parsed = safeParse<DB>(raw);
  if (parsed) return parsed;
  return { drivers: [], shops: [], depots: [], scans: [], stock: [] };
}

export function saveDB(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function upsertScan(event: ScanEvent) {
  const db = loadDB();
  db.scans.unshift(event);
  saveDB(db);
}

export function upsertStockFromScan(scan: ScanEvent) {
  const db = loadDB();
  const palletType = (scan.palletType || "EUR/EPAL") as PalletType;
  const qty = Number(scan.qty || 1);

  const placeKind = scan.placeKind || "UNKNOWN";
  const placeId = scan.placeId || "";

  const key = `${palletType}__${placeKind}__${placeId}`;
  const existing = db.stock.find((r) => `${r.palletType}__${r.placeKind}__${r.placeId || ""}` === key);

  if (existing) {
    existing.qty = existing.qty + qty;
    existing.updatedAt = Date.now();
  } else {
    db.stock.unshift({
      id: uid("stock"),
      palletType,
      qty,
      placeKind,
      placeId: placeId || undefined,
      updatedAt: Date.now(),
    });
  }

  saveDB(db);
}

export function resolvePlaceName(db: DB, placeKind: PlaceKind, placeId?: string) {
  if (!placeId) return "—";
  if (placeKind === "SHOP") return db.shops.find((x) => x.id === placeId)?.name || "—";
  if (placeKind === "DEPOT") return db.depots.find((x) => x.id === placeId)?.name || "—";
  if (placeKind === "TRUCK") return db.drivers.find((x) => x.id === placeId)?.name || "—";
  return "—";
}

export function toCSV(rows: Record<string, any>[], headers: string[]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    const q = s.includes(",") || s.includes("\n") || s.includes('"');
    return q ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
