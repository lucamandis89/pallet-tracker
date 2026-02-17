// app/lib/storage.ts
// Storage unico (localStorage) per tutta l'app.
// Tutto "client-safe": se window non c'è (SSR) ritorna fallback.

export type StockLocationKind = "shop" | "depot" | "driver" | "unknown";

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  active?: boolean;
  createdAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  note?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  note?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
};

export type PalletType =
  | "EUR/EPAL"
  | "CHEP"
  | "LPR"
  | "IFCO"
  | "CP"
  | "ALTRO";

export type PalletItem = {
  id: string;
  code: string; // QR/ID pedana
  type: PalletType;
  qty: number;

  // posizione attuale
  locationKind: StockLocationKind;
  locationId?: string; // id negozio / deposito / autista
  locationLabel?: string; // nome "snapshot" (comodo per storico)

  // GPS
  lat?: number;
  lng?: number;

  // info extra
  altCode?: string; // codice alternativo (se QR rovinato / etichetta alternativa)
  notes?: string;

  updatedAt: number;
  createdAt: number;
};

export type ScanHistoryItem = {
  id: string;
  ts: number;

  palletCode: string;
  palletType: PalletType;
  qty: number;

  mode: "scan" | "manual";

  locationKind: StockLocationKind;
  locationId?: string;
  locationLabel?: string;

  lat?: number;
  lng?: number;

  notes?: string;
};

export type MissingItem = {
  id: string;
  palletCode: string;
  reason?: string;
  createdAt: number;
  resolved?: boolean;
  resolvedAt?: number;
};

const KEYS = {
  DRIVERS: "pt_drivers_v1",
  SHOPS: "pt_shops_v1",
  DEPOTS: "pt_depots_v1",
  PALLETS: "pt_pallets_v1",
  HISTORY: "pt_history_v1",
  MISSING: "pt_missing_v1",
  DEFAULT_SHOP: "pt_default_shop_v1",
  DEFAULT_DEPOT: "pt_default_depot_v1",
  LAST_SCAN: "pt_last_scan_v1",
} as const;

function hasWindow() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!hasWindow()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/* -------------------- DRIVERS -------------------- */

export function getDrivers(): DriverItem[] {
  return readJSON<DriverItem[]>(KEYS.DRIVERS, []);
}

export function addDriver(input: Omit<DriverItem, "id" | "createdAt">): DriverItem {
  const all = getDrivers();
  const item: DriverItem = {
    id: uid("drv"),
    createdAt: Date.now(),
    active: true,
    ...input,
  };
  all.unshift(item);
  writeJSON(KEYS.DRIVERS, all);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>) {
  const all = getDrivers().map((d) => (d.id === id ? { ...d, ...patch } : d));
  writeJSON(KEYS.DRIVERS, all);
}

export function removeDriver(id: string) {
  const all = getDrivers().filter((d) => d.id !== id);
  writeJSON(KEYS.DRIVERS, all);
}

/* -------------------- SHOPS -------------------- */

export function getShops(): ShopItem[] {
  return readJSON<ShopItem[]>(KEYS.SHOPS, []);
}

export function addShop(input: Omit<ShopItem, "id" | "createdAt">): ShopItem {
  const all = getShops();
  const item: ShopItem = {
    id: uid("shop"),
    createdAt: Date.now(),
    ...input,
  };
  all.unshift(item);
  writeJSON(KEYS.SHOPS, all);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>) {
  const all = getShops().map((s) => (s.id === id ? { ...s, ...patch } : s));
  writeJSON(KEYS.SHOPS, all);
}

export function removeShop(id: string) {
  const all = getShops().filter((s) => s.id !== id);
  writeJSON(KEYS.SHOPS, all);

  // se era default, resetto
  const def = getDefaultShop();
  if (def === id) setDefaultShop("");
}

export function getDefaultShop(): string {
  return readJSON<string>(KEYS.DEFAULT_SHOP, "");
}

export function setDefaultShop(shopId: string) {
  writeJSON(KEYS.DEFAULT_SHOP, shopId || "");
}

export function getShopOptions() {
  return getShops().map((s) => ({ id: s.id, label: s.name }));
}

/* -------------------- DEPOTS -------------------- */

export function getDepots(): DepotItem[] {
  return readJSON<DepotItem[]>(KEYS.DEPOTS, []);
}

export function addDepot(input: Omit<DepotItem, "id" | "createdAt">): DepotItem {
  const all = getDepots();
  const item: DepotItem = {
    id: uid("dep"),
    createdAt: Date.now(),
    ...input,
  };
  all.unshift(item);
  writeJSON(KEYS.DEPOTS, all);
  return item;
}

export function updateDepot(id: string, patch: Partial<DepotItem>) {
  const all = getDepots().map((d) => (d.id === id ? { ...d, ...patch } : d));
  writeJSON(KEYS.DEPOTS, all);
}

export function removeDepot(id: string) {
  const all = getDepots().filter((d) => d.id !== id);
  writeJSON(KEYS.DEPOTS, all);

  const def = getDefaultDepot();
  if (def === id) setDefaultDepot("");
}

export function getDefaultDepot(): string {
  return readJSON<string>(KEYS.DEFAULT_DEPOT, "");
}

export function setDefaultDepot(depotId: string) {
  writeJSON(KEYS.DEFAULT_DEPOT, depotId || "");
}

export function getDepotOptions() {
  return getDepots().map((d) => ({ id: d.id, label: d.name }));
}

/* -------------------- PALLETS -------------------- */

export function getPallets(): PalletItem[] {
  return readJSON<PalletItem[]>(KEYS.PALLETS, []);
}

export function setPallets(list: PalletItem[]) {
  writeJSON(KEYS.PALLETS, list);
}

export function upsertPallet(p: PalletItem) {
  const all = getPallets();
  const idx = all.findIndex((x) => x.id === p.id || x.code === p.code);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...p, updatedAt: Date.now() };
  } else {
    all.unshift({ ...p, id: p.id || uid("pal"), createdAt: Date.now(), updatedAt: Date.now() });
  }
  writeJSON(KEYS.PALLETS, all);
}

export function deletePallet(id: string) {
  const all = getPallets().filter((p) => p.id !== id);
  writeJSON(KEYS.PALLETS, all);
}

export function findPalletByCode(code: string): PalletItem | undefined {
  const c = (code || "").trim();
  if (!c) return undefined;
  return getPallets().find((p) => p.code.toLowerCase() === c.toLowerCase());
}

export function movePalletViaScan(args: {
  palletCode: string;
  palletType: PalletType;
  qty: number;
  mode: "scan" | "manual";
  locationKind: StockLocationKind;
  locationId?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  altCode?: string;
  notes?: string;
}) {
  const code = (args.palletCode || "").trim();
  if (!code) return;

  const existing = findPalletByCode(code);

  const next: PalletItem = existing
    ? {
        ...existing,
        code,
        type: args.palletType,
        qty: args.qty,
        locationKind: args.locationKind,
        locationId: args.locationId,
        locationLabel: args.locationLabel,
        lat: args.lat,
        lng: args.lng,
        altCode: args.altCode ?? existing.altCode,
        notes: args.notes ?? existing.notes,
        updatedAt: Date.now(),
      }
    : {
        id: uid("pal"),
        code,
        type: args.palletType,
        qty: args.qty,
        locationKind: args.locationKind,
        locationId: args.locationId,
        locationLabel: args.locationLabel,
        lat: args.lat,
        lng: args.lng,
        altCode: args.altCode,
        notes: args.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

  upsertPallet(next);

  addScanHistory({
    palletCode: code,
    palletType: args.palletType,
    qty: args.qty,
    mode: args.mode,
    locationKind: args.locationKind,
    locationId: args.locationId,
    locationLabel: args.locationLabel,
    lat: args.lat,
    lng: args.lng,
    notes: args.notes,
  });

  setLastScan({
    palletCode: code,
    ts: Date.now(),
  });
}

/* -------------------- HISTORY -------------------- */

export function getHistory(): ScanHistoryItem[] {
  return readJSON<ScanHistoryItem[]>(KEYS.HISTORY, []);
}

export function addScanHistory(input: Omit<ScanHistoryItem, "id" | "ts"> & { ts?: number }) {
  const all = getHistory();
  const item: ScanHistoryItem = {
    id: uid("his"),
    ts: input.ts ?? Date.now(),
    palletCode: input.palletCode,
    palletType: input.palletType,
    qty: input.qty,
    mode: input.mode,
    locationKind: input.locationKind,
    locationId: input.locationId,
    locationLabel: input.locationLabel,
    lat: input.lat,
    lng: input.lng,
    notes: input.notes,
  };
  all.unshift(item);
  writeJSON(KEYS.HISTORY, all);
}

// compatibilità: se in qualche pagina avevi importato "addHistory"
export const addHistory = addScanHistory;

export function clearHistory() {
  writeJSON(KEYS.HISTORY, []);
}

/* -------------------- LAST SCAN -------------------- */

export function setLastScan(value: { palletCode: string; ts: number }) {
  writeJSON(KEYS.LAST_SCAN, value);
}

export function getLastScan(): { palletCode: string; ts: number } | null {
  return readJSON<{ palletCode: string; ts: number } | null>(KEYS.LAST_SCAN, null);
}

/* -------------------- MISSING -------------------- */

export function getMissing(): MissingItem[] {
  return readJSON<MissingItem[]>(KEYS.MISSING, []);
}

export function addMissing(input: Omit<MissingItem, "id" | "createdAt" | "resolved" | "resolvedAt">) {
  const all = getMissing();
  const item: MissingItem = {
    id: uid("mis"),
    createdAt: Date.now(),
    resolved: false,
    ...input,
  };
  all.unshift(item);
  writeJSON(KEYS.MISSING, all);
}

export function resolveMissing(id: string, resolved: boolean) {
  const all = getMissing().map((m) =>
    m.id === id
      ? { ...m, resolved, resolvedAt: resolved ? Date.now() : undefined }
      : m
  );
  writeJSON(KEYS.MISSING, all);
}

export function removeMissing(id: string) {
  const all = getMissing().filter((m) => m.id !== id);
  writeJSON(KEYS.MISSING, all);
}

/* -------------------- CSV HELPERS -------------------- */

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function historyToCsv(): string {
  const rows = getHistory();
  const header = [
    "ts",
    "data",
    "ora",
    "palletCode",
    "palletType",
    "qty",
    "mode",
    "locationKind",
    "locationLabel",
    "lat",
    "lng",
    "notes",
  ];

  const lines = [header.join(";")];

  for (const r of rows) {
    const d = new Date(r.ts);
    const data = d.toLocaleDateString();
    const ora = d.toLocaleTimeString();
    lines.push(
      [
        r.ts,
        data,
        ora,
        r.palletCode,
        r.palletType,
        r.qty,
        r.mode,
        r.locationKind,
        r.locationLabel ?? "",
        r.lat ?? "",
        r.lng ?? "",
        r.notes ?? "",
      ]
        .map(csvEscape)
        .join(";")
    );
  }
  return lines.join("\n");
}

export function palletsToCsv(): string {
  const rows = getPallets();
  const header = [
    "code",
    "type",
    "qty",
    "locationKind",
    "locationLabel",
    "lat",
    "lng",
    "altCode",
    "notes",
    "updatedAt",
  ];
  const lines = [header.join(";")];

  for (const p of rows) {
    const d = new Date(p.updatedAt);
    lines.push(
      [
        p.code,
        p.type,
        p.qty,
        p.locationKind,
        p.locationLabel ?? "",
        p.lat ?? "",
        p.lng ?? "",
        p.altCode ?? "",
        p.notes ?? "",
        d.toISOString(),
      ]
        .map(csvEscape)
        .join(";")
    );
  }
  return lines.join("\n");
}
