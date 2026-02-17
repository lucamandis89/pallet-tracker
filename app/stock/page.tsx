"use client";

import React, { useEffect, useMemo, useState } from "react";

type Shop = { id: string; name: string; address: string; phone?: string; note?: string; createdAt: string };

type StockRow = {
  shopId: string;
  shopName: string;
  // quantità per tipo (chiave = tipo)
  byType: Record<string, number>;
  updatedAt: string;
};

type StockMove = {
  id: string;
  ts: string;
  shopId: string;
  shopName: string;
  type: string;
  delta: number; // + / -
  note?: string;
};

const STORAGE_SHOPS = "pallet_shops";
const STORAGE_TYPES = "pallet_types_v1"; // tipi personalizzati salvati da /pallets
const STORAGE_STOCK = "pallet_stock_v1";
const STORAGE_STOCK_MOVES = "pallet_stock_moves_v1";

function uid() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_TYPES = [
  "EPAL (EUR) 1200x800",
  "EPAL 2 1200x1000",
  "Half pallet 800x600",
  "Display pallet",
  "CHEP Blue",
  "CHEP Red",
  "LPR",
  "DUSS",
  "IFCO (casse/RTI)",
  "IPP / FSW",
  "CP (Chemical)",
  "US Pallet 48x40",
];

function toCSV(rows: StockRow[]) {
  // header: shopId, shopName, updatedAt, ...types
  const allTypes = Array.from(
    new Set(
      rows.flatMap((r) => Object.keys(r.byType || {}))
    )
  ).sort((a, b) => a.localeCompare(b));

  const header = ["shopId", "shopName", "updatedAt", ...allTypes];

  const esc = (v: any) => {
    const s = v === undefined || v === null ? "" : String(v);
    const needs = /[",\n;]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    const line = [
      r.shopId,
      r.shopName,
      r.updatedAt,
      ...allTypes.map((t) => r.byType?.[t] ?? 0),
    ].map(esc);
    lines.push(line.join(","));
  }
  return lines.join("\n");
}

export default function StockPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [moves, setMoves] = useState<StockMove[]>([]);

  const [q, setQ] = useState("");

  // form aggiornamento
  const [selShopId, setSelShopId] = useState("");
  const [selType, setSelType] = useState(DEFAULT_TYPES[0]);
  const [delta, setDelta] = useState<number>(1);
  const [note, setNote] = useState("");

  // init
  useEffect(() => {
    const s = safeParse<Shop[]>(localStorage.getItem(STORAGE_SHOPS), []);
    setShops(s);

    const custom = safeParse<string[]>(localStorage.getItem(STORAGE_TYPES), []);
    const mergedTypes = Array.from(new Set([...DEFAULT_TYPES, ...custom])).sort((a, b) => a.localeCompare(b));
    setTypes(mergedTypes);

    const savedRows = safeParse<StockRow[]>(localStorage.getItem(STORAGE_STOCK), []);
    setRows(savedRows);

    const savedMoves = safeParse<StockMove[]>(localStorage.getItem(STORAGE_STOCK_MOVES), []);
    setMoves(savedMoves);

    // default shop selezionato
    if (s[0]?.id) setSelShopId(s[0].id);
  }, []);

  function persistRows(next: StockRow[]) {
    setRows(next);
    localStorage.setItem(STORAGE_STOCK, JSON.stringify(next));
  }

  function persistMoves(next: StockMove[]) {
    setMoves(next);
    localStorage.setItem(STORAGE_STOCK_MOVES, JSON.stringify(next));
  }

  function ensureRow(shopId: string): StockRow {
    const shop = shops.find((x) => x.id === shopId);
    const existing = rows.find((r) => r.shopId === shopId);
    if (existing) return existing;

    const newRow: StockRow = {
      shopId,
      shopName: shop?.name ?? "—",
      byType: {},
      updatedAt: new Date().toLocaleString(),
    };
    const next = [newRow, ...rows];
    persistRows(next);
    return newRow;
  }

  function applyDelta() {
    if (!shops.length) return alert("Crea prima almeno 1 negozio in /shops");
    if (!selShopId) return alert("Seleziona un negozio.");
    if (!selType) return alert("Seleziona un tipo.");

    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) return alert("Inserisci una quantità valida (diversa da 0).");

    const shop = shops.find((x) => x.id === selShopId);
    const row = ensureRow(selShopId);

    const current = row.byType?.[selType] ?? 0;
    const nextValue = current + d;
    if (nextValue < 0) return alert("Non puoi andare sotto 0.");

    const now = new Date().toLocaleString();

    const nextRows = rows.map((r) => {
      if (r.shopId !== selShopId) return r;
      return {
        ...r,
        shopName: shop?.name ?? r.shopName,
        byType: { ...(r.byType || {}), [selType]: nextValue },
        updatedAt: now,
      };
    });

    // se la riga non esisteva, rows potrebbe non includerla ancora nello stato (perché ensureRow ha persistito)
    // ricarico base sicura:
    const baseRows = safeParse<StockRow[]>(localStorage.getItem(STORAGE_STOCK), nextRows);
    const fixedRows = baseRows.map((r) => {
      if (r.shopId !== selShopId) return r;
      return {
        ...r,
        shopName: shop?.name ?? r.shopName,
        byType: { ...(r.byType || {}), [selType]: nextValue },
        updatedAt: now,
      };
    });
    persistRows(fixedRows);

    const mv: StockMove = {
      id: uid(),
      ts: now,
      shopId: selShopId,
      shopName: shop?.name ?? "—",
      type: selType,
      delta: d,
      note: note.trim() || undefined,
    };
    persistMoves([mv, ...moves]);

    setNote("");
    alert("✅ Giacenza aggiornata!");
  }

  function resetAllStock() {
    if (!confirm("Svuotare tutte le giacenze e lo storico movimenti stock?")) return;
    localStorage.removeItem(STORAGE_STOCK);
    localStorage.removeItem(STORAGE_STOCK_MOVES);
    setRows([]);
    setMoves([]);
  }

  function exportCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock_negozi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.shopName} ${r.shopId} ${Object.entries(r.byType || {}).map(([k, v]) => `${k}:${v}`).join(" ")}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const totals = useMemo(() => {
    const totalByType: Record<string, number> = {};
    for (const r of rows) {
      for (const [t, v] of Object.entries(r.byType || {})) {
        totalByType[t] = (totalByType[t] || 0) + (Number(v) || 0);
      }
    }
    return totalByType;
  }, [rows]);

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontSize: 16,
    background: "white",
  };

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card: React.CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    background: "white",
  };

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Giacenze per Negozio</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        Gestione quantità per tipo (EPAL/CHEP/LPR/DUSS/IFCO...). Export CSV e storico movimenti stock.
      </div>

      {/* Azioni */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href="/"
          style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          ← Home
        </a>
        <a
          href="/shops"
          style={{ ...btn("#1b9a4a"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          🏪 Negozi
        </a>
        <button style={btn("#6a1b9a")} onClick={exportCSV} disabled={rows.length === 0}>
          ⬇️ Export CSV
        </button>
        <button style={btn("#e53935")} onClick={resetAllStock}>
          🗑️ Reset Stock
        </button>
      </div>

      {/* Pannello aggiornamento */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>➕ / ➖ Aggiorna giacenza</div>

        <div style={{ display: "grid", gap: 10 }}>
          <select style={inputStyle} value={selShopId} onChange={(e) => setSelShopId(e.target.value)}>
            {shops.length === 0 ? (
              <option value="">Nessun negozio</option>
            ) : (
              shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.address}
                </option>
              ))
            )}
          </select>

          <select style={inputStyle} value={selType} onChange={(e) => setSelType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            style={inputStyle}
            type="number"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            placeholder="Quantità: usa + per carico, - per scarico (es. 10 / -5)"
          />

          <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opzionale) es. consegna / ritiro / reso" />

          <button style={btn("#2e7d32")} onClick={applyDelta}>
            ✅ Applica variazione
          </button>

          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Suggerimento: per scaricare usa valori negativi (es. <b>-5</b>).
          </div>
        </div>
      </div>

      {/* Ricerca */}
      <div style={{ marginBottom: 12 }}>
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Cerca negozio o tipo (es. CHEP / IFCO / Conad)" />
      </div>

      {/* Totali */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Totali (tutti i negozi)</div>
        {Object.keys(totals).length === 0 ? (
          <div style={{ opacity: 0.75 }}>Nessun totale (nessuna giacenza inserita).</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(totals)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([t, v]) => (
                <div key={t}>
                  <b>{t}:</b> {v}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Tabelle per negozio */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredRows.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna giacenza presente.</div>
        ) : (
          filteredRows.map((r) => (
            <div key={r.shopId} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{r.shopName}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>Aggiornato: {r.updatedAt}</div>
                </div>
                <div style={{ opacity: 0.8, fontWeight: 800 }}>ID: {r.shopId}</div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {Object.keys(r.byType || {}).length === 0 ? (
                  <div style={{ opacity: 0.75 }}>Nessuna giacenza inserita per questo negozio.</div>
                ) : (
                  Object.entries(r.byType)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([t, v]) => (
                      <div key={t} style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><b>{t}</b></div>
                        <div style={{ fontWeight: 900 }}>{v}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Storico movimenti stock */}
      <div style={{ marginTop: 18, ...card }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>🧾 Storico movimenti Stock</div>

        {moves.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Nessun movimento stock registrato.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {moves.slice(0, 40).map((m) => (
              <div key={m.id} style={{ paddingBottom: 10, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontWeight: 900 }}>
                  {m.delta > 0 ? "➕" : "➖"} {m.delta} • {m.type}
                </div>
                <div style={{ opacity: 0.9 }}>
                  🏪 {m.shopName} • 🕒 {m.ts}
                  {m.note ? ` • Note: ${m.note}` : ""}
                </div>
              </div>
            ))}
            {moves.length > 40 ? <div style={{ opacity: 0.7 }}>Mostrati ultimi 40 movimenti.</div> : null}
          </div>
        )}
      </div>
    </div>
  );
  }
