"use client";

import React, { useMemo, useState } from "react";
import { downloadCsv, getHistory, setHistory, formatDT } from "../lib/storage";

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [refresh, setRefresh] = useState(0);

  const list = useMemo(() => getHistory(), [refresh]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((x) => `${x.code} ${x.palletType || ""} ${x.declaredKind || ""} ${x.declaredId || ""}`.toLowerCase().includes(s));
  }, [list, q]);

  function exportCsv() {
    const rows = filtered.map((x) => [
      x.code,
      formatDT(x.ts),
      x.source,
      x.lat ?? "",
      x.lng ?? "",
      x.accuracy ?? "",
      x.palletType ?? "",
      x.qty ?? "",
      x.declaredKind ?? "",
      x.declaredId ?? "",
      x.note ?? "",
    ]);
    downloadCsv(`storico_${new Date().toISOString().slice(0, 10)}.csv`, [
      "code", "datetime", "source", "lat", "lng", "accuracy", "palletType", "qty", "kind", "refId", "note",
    ], rows);
  }

  function clearAll() {
    if (!confirm("Cancellare TUTTO lo storico?")) return;
    setHistory([]);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📌 Storico scansioni</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#6a1b9a")} onClick={exportCsv}>Export CSV</button>
        <button style={btn("#e53935")} onClick={clearAll}>Svuota</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <input style={{ ...inp(), marginTop: 12 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca..." />

      <div style={{ marginTop: 12, overflowX: "auto", background: "white", border: "1px solid #eee", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Codice", "Quando", "Fonte", "Tipo", "Q.tà", "GPS"].map((h) => (
                <th key={h} style={th()}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => (
              <tr key={x.id}>
                <td style={td()}><b>{x.code}</b></td>
                <td style={td()}>{formatDT(x.ts)}</td>
                <td style={td()}>{x.source}</td>
                <td style={td()}>{x.palletType || "—"}</td>
                <td style={td()}>{x.qty ?? "—"}</td>
                <td style={td()}>{x.lat && x.lng ? `${x.lat.toFixed(5)}, ${x.lng.toFixed(5)}` : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td style={td()} colSpan={6}>Nessuna scansione.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = (): React.CSSProperties => ({ padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16, width: "100%" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const th = (): React.CSSProperties => ({ textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 900 });
const td = (): React.CSSProperties => ({ padding: 10, borderBottom: "1px solid #f3f3f3" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
