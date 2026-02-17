// app/history/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { clearHistory, downloadCsv, formatDT, getHistory } from "../lib/storage";

export default function HistoryPage() {
  const [refresh, setRefresh] = useState(0);

  const list = useMemo(() => getHistory(), [refresh]);

  function exportCsv() {
    downloadCsv(
      `storico_scansioni_${new Date().toISOString().slice(0, 10)}.csv`,
      ["datetime", "qr", "lat", "lng", "note"],
      list.map((x) => [formatDT(x.ts), x.qr, x.lat ?? "", x.lng ?? "", x.note ?? ""])
    );
  }

  function clearAll() {
    if (!confirm("Vuoi cancellare tutto lo storico?")) return;
    clearHistory();
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📌 Storico Scansioni</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <a href="/scan" style={link()}>Scanner</a>
        <button style={btn("#6a1b9a")} onClick={exportCsv}>Export CSV</button>
        <button style={btn("#e53935")} onClick={clearAll}>Svuota Storico</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        {list.length === 0 ? <div style={{ opacity: 0.7 }}>Nessuna scansione.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {list.slice(0, 200).map((h) => (
            <div key={h.id} style={card()}>
              <div style={{ fontWeight: 1000 }}>{h.qr}</div>
              <div style={{ opacity: 0.85 }}>{formatDT(h.ts)}</div>
              {typeof h.lat === "number" && typeof h.lng === "number" ? (
                <div style={{ opacity: 0.85 }}>
                  GPS: {h.lat.toFixed(6)} , {h.lng.toFixed(6)}
                </div>
              ) : null}
              {h.note ? <div style={{ opacity: 0.85 }}>Note: {h.note}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const card = (): React.CSSProperties => ({ padding: 12, borderRadius: 14, border: "1px solid #eee" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
