"use client";

import React, { useMemo, useState } from "react";
import {
  downloadCsv,
  formatDT,
  getDepotOptions,
  getDrivers,
  getShopOptions,
  getStockMoves,
  getStockRows,
  StockLocationKind,
} from "../lib/storage";

function nameOf(kind: StockLocationKind, id: string) {
  if (kind === "DEPOSITO") return getDepotOptions().find((x) => x.id === id)?.name || "—";
  if (kind === "AUTISTA") return getDrivers().find((x) => x.id === id)?.name || "—";
  return getShopOptions().find((x) => x.id === id)?.name || "—";
}

export default function StockPage() {
  const [refresh, setRefresh] = useState(0);

  const rows = useMemo(() => getStockRows().slice().sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0)), [refresh]);
  const moves = useMemo(() => getStockMoves(), [refresh]);

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.palletType, (m.get(r.palletType) || 0) + (r.qty || 0));
    return Array.from(m.entries()).map(([type, qty]) => ({ type, qty }));
  }, [rows]);

  function exportRowsCsv() {
    downloadCsv(
      `stock_rows_${new Date().toISOString().slice(0, 10)}.csv`,
      ["palletType", "qty", "kind", "refId", "name"],
      rows.map((r) => [r.palletType, r.qty, r.locationKind, r.locationId, nameOf(r.locationKind, r.locationId)])
    );
  }

  function exportMovesCsv() {
    downloadCsv(
      `stock_moves_${new Date().toISOString().slice(0, 10)}.csv`,
      ["datetime", "palletType", "qty", "fromKind", "fromId", "fromName", "toKind", "toId", "toName", "note"],
      moves.map((m) => [
        formatDT(m.ts),
        m.palletType,
        m.qty,
        m.from.kind,
        m.from.id,
        nameOf(m.from.kind, m.from.id),
        m.to.kind,
        m.to.id,
        nameOf(m.to.kind, m.to.id),
        m.note || "",
      ])
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Giacenze (Stock)</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
        <button style={btn("#6a1b9a")} onClick={exportRowsCsv}>Export Giacenze CSV</button>
        <button style={btn("#6a1b9a")} onClick={exportMovesCsv}>Export Movimenti CSV</button>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Totali per tipo pedana</div>
        {totals.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun dato.</div> : null}
        <div style={{ display: "grid", gap: 6 }}>
          {totals.map((t) => (
            <div key={t.type} style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
              <span>{t.type}</span>
              <span>{t.qty}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Dettaglio giacenze</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Tipo", "Q.tà", "Dove", "Nome"].map((h) => (
                  <th key={h} style={th()}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td style={td()}><b>{r.palletType}</b></td>
                  <td style={td()}>{r.qty}</td>
                  <td style={td()}>{r.locationKind}</td>
                  <td style={td()}>{nameOf(r.locationKind, r.locationId)}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td style={td()} colSpan={4}>Nessun record.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Movimenti recenti</div>
        {moves.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun movimento.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {moves.slice(0, 50).map((m) => (
            <div key={m.id} style={{ padding: 12, borderRadius: 14, border: "1px solid #eee" }}>
              <div style={{ fontWeight: 900 }}>
                {m.palletType} • {m.qty} • {formatDT(m.ts)}
              </div>
              <div style={{ opacity: 0.85 }}>
                <b>Da:</b> {m.from.kind} {nameOf(m.from.kind, m.from.id)} → <b>A:</b> {m.to.kind} {nameOf(m.to.kind, m.to.id)}
                {m.note ? ` • Note: ${m.note}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const th = (): React.CSSProperties => ({ textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 900 });
const td = (): React.CSSProperties => ({ padding: 10, borderBottom: "1px solid #f3f3f3" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
