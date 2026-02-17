// app/lib/storage.ts
"use client";

export type ScanEvent = {
  id: string;
  code: string;
  ts: number; // epoch ms
  lat?: number;
  lng?: number;
  accuracy?: number;
  source: "qr" | "manual";
};

export type PalletItem = {
  id: string;
  code: string;        // codice principale (da QR o scritto)
  altCode?: string;    // fallback (se QR rovinato)
  type?: string;       // EPAL, CHEP, ecc.
  notes?: string;
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";
};

const KEY_HISTORY = "pt_history_v1";
const KEY_PALLETS = "pt_pallets_v1";
const KEY_LASTSCAN = "pt_lastscan_v1";

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
  // mantieni gli ultimi 2000 eventi
  setHistory(items.slice(0, 2000));
}

export function setLastScan(code: string) {
  localStorage.setItem(KEY_LASTSCAN, code);
}

export function getLastScan(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_LASTSCAN) || "";
}

// --- Pallets registry ---
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
    (p) => p.code.toLowerCase() === codeNorm.toLowerCase() || (p.altCode || "").toLowerCase() === codeNorm.toLowerCase()
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

// --- CSV helpers ---
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
