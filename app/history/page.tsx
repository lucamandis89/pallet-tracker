"use client";

import React, { useMemo, useState } from "react";
import { clearHistory, getHistory, historyToCsv, type ScanHistoryItem } from "../lib/storage";

export default function HistoryPage() {
  const [list, setList] = useState<ScanHistoryItem[]>(() => getHistory());

  const grouped = useMemo(() => {
    // raggruppo per data
    const map = new Map<string, ScanHistoryItem[]>();
    for (const h of list) {
      const d = new Date(h.ts).toLocaleDateString();
      map.set(d, [...(map.get(d) || []), h]);
    }
    return Array.from(map.entries());
  }, [list]);

  function reload() {
    setList(getHistory());
  }

  function downloadCsv() {
    const csv = historyToCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storico-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function wipe() {
    if (!confirm("Cancellare tutto lo storico?")) return;
    clearHistory();
    reload();
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>📌 Storico Scansioni</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>← Home</a>
        <button onClick={downloadCsv} style={{ padding: "12px 14px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer", background: "#6a1b9a", color: "white" }}>
          ⬇️ Export CSV
        </button>
        <button onClick={wipe} style={{ padding: "12px 14px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer", background: "#e53935", color: "white" }}>
          🗑️ Svuota storico
        </button>
      </div>

      <div style={{ marginTop: 14, opacity: 0.8 }}>
        Righe storico: <b>{list.length}</b>
      </div>

      {grouped.length === 0 ? (
        <div style={{ marginTop: 14, opacity: 0.8 }}>Nessuna scansione salvata.</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {grouped.map(([day, items]) => (
            <div key={day} style={{ padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
              <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 10 }}>{day}</div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Ora</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Codice</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Tipo</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Qty</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Luogo</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>GPS</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((h) => (
                      <tr key={h.id}>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>
                          {new Date(h.ts).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4", fontWeight: 900 }}>
                          {h.palletCode}
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{h.mode}</div>
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{h.palletType}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{h.qty}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{h.locationLabel ?? "—"} ({h.locationKind})</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{h.lat ?? "—"} / {h.lng ?? "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{h.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
