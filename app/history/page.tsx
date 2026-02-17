"use client";

import React, { useMemo, useState } from "react";
import { clearHistory, downloadCsv, formatDT, getHistory } from "../lib/storage";

export default function HistoryPage() {
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getHistory(), [refresh]);

  function exportCsv() {
    downloadCsv(
      `scan_history_${new Date().toISOString().slice(0, 10)}.csv`,
      ["datetime", "code", "lat", "lng", "accuracy", "source"],
      list.map((h) => [formatDT(h.ts), h.code, h.lat ?? "", h.lng ?? "", h.accuracy ?? "", h.source])
    );
  }

  function clearAll() {
    if (!confirm("Vuoi cancellare TUTTO lo storico?")) return;
    clearHistory();
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📌 Storico Scansioni</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#6a1b9a")} onClick={exportCsv}>Export CSV</button>
        <button style={btn("#e53935")} onClick={clearAll}>Svuota storico</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        {list.length === 0 ? <div style={{ opacity: 0.75 }}>Nessuna scansione.</div> : null}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data/ora", "Codice", "Lat", "Lng", "Acc", "Fonte"].map((h) => (
                  <th key={h} style={th()}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td style={td()}>{formatDT(r.ts)}</td>
                  <td style={td()}><b>{r.code}</b></td>
                  <td style={td()}>{r.lat ?? "—"}</td>
                  <td style={td()}>{r.lng ?? "—"}</td>
                  <td style={td()}>{r.accuracy ?? "—"}</td>
                  <td style={td()}>{r.source}</td>
                </tr>
              ))}
              {list.length === 0 ? <tr><td style={td()} colSpan={6}>—</td></tr> : null}
            </tbody>
          </table>
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
