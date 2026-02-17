"use client";

/* ============================
   TIPI DATI
============================ */

export type ScanEvent = {
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
  altCode?: string;
  type?: string;
  notes?: string;
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";
};

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

/* ============================
   LOCAL STORAGE KEYS
============================ */

const KEY_HISTORY = "pt_history_v1";
const KEY_PALLETS = "pt_pallets_v1";
const KEY_LASTSCAN = "pt_lastscan_v1";
const KEY_DRIVERS = "pt_drivers_v1";
const KEY_SHOPS = "pt_shops_v1";

/* ============================
   UTILS
============================ */

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function csvEscape(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: any[][]) {
  const csv =
    [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n") + "\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================
   HISTORY (SCANS)
============================ */

export function getHistory(): ScanEvent[] {
  if (typeof window === "undefined") return [];
  return safeParse<ScanEvent[]>(localStorage.getItem(KEY_HISTORY), []);
}

export function setHistory(items: ScanEvent[]) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(items));
}

export function addHistory(ev: Omit<ScanEvent, "id">) {
  const items = getHistory();
  items.unshift({ id: uid("scan"), ...ev });
  setHistory(items.slice(0, 2000));
}

export function setLastScan(code: string) {
  localStorage.setItem(KEY_LASTSCAN, code);
}

export function getLastScan(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_LASTSCAN) || "";
}

/* ============================
   PALLETS REGISTRY
============================ */

export function getPallets(): PalletItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<PalletItem[]>(localStorage.getItem(KEY_PALLETS), []);
}

export function setPallets(items: PalletItem[]) {
  localStorage.setItem(KEY_PALLETS, JSON.stringify(items));
}

export function upsertPallet(update: Partial<PalletItem> & { code: string }) {
  const items = getPallets();
  const codeNorm = (update.code || "").trim();
  if (!codeNorm) return;

  const idx = items.findIndex(
    (p) =>
      p.code.toLowerCase() === codeNorm.toLowerCase() ||
      (p.altCode || "").toLowerCase() === codeNorm.toLowerCase()
  );

  if (idx >= 0) {
    items[idx] = { ...items[idx], ...update, code: items[idx].code || codeNorm };
  } else {
    items.unshift({
      id: uid("pallet"),
      code: codeNorm,
      altCode: update.altCode,
      type: update.type,
      notes: update.notes,
      lastSeenTs: update.lastSeenTs,
      lastLat: update.lastLat,
      lastLng: update.lastLng,
      lastSource: update.lastSource,
    });
  }

  setPallets(items);
}

/* ============================
   DRIVERS (AUTISTI)
============================ */

export function getDrivers(): DriverItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<DriverItem[]>(localStorage.getItem(KEY_DRIVERS), []);
}

export function setDrivers(items: DriverItem[]) {
  localStorage.setItem(KEY_DRIVERS, JSON.stringify(items));
}

export function addDriver(data: Omit<DriverItem, "id" | "createdAt">) {
  const list = getDrivers();
  if (list.length >= 10) throw new Error("LIMIT_10");

  const item: DriverItem = {
    id: uid("drv"),
    createdAt: Date.now(),
    ...data,
  };

  list.unshift(item);
  setDrivers(list);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>) {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;

  list[idx] = { ...list[idx], ...patch };
  setDrivers(list);
}

export function removeDriver(id: string) {
  setDrivers(getDrivers().filter((x) => x.id !== id));
}

/* ============================
   SHOPS (NEGOZI)
============================ */

export function getShops(): ShopItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<ShopItem[]>(localStorage.getItem(KEY_SHOPS), []);
}

export function setShops(items: ShopItem[]) {
  localStorage.setItem(KEY_SHOPS, JSON.stringify(items));
}

export function addShop(data: Omit<ShopItem, "id" | "createdAt">) {
  const list = getShops();
  if (list.length >= 100) throw new Error("LIMIT_100");

  const item: ShopItem = {
    id: uid("shop"),
    createdAt: Date.now(),
    ...data,
  };

  list.unshift(item);
  setShops(list);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>) {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;

  list[idx] = { ...list[idx], ...patch };
  setShops(list);
}

export function removeShop(id: string) {
  setShops(getShops().filter((x) => x.id !== id));
}
