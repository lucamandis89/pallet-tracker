"use client";

import React, { useMemo, useState } from "react";
import { getPallets, palletsToCsv, type PalletItem } from "../lib/storage";

type Group = {
  key: string;
  label: string;
  totalQty: number;
  items: PalletItem[];
};

export default function StockPage() {
  const [list] = useState<PalletItem[]>(() => getPallets());

  const groups = useMemo(() => {
    const map = new Map<string, Group>();

    for (const p of list) {
      const label = p.locationLabel || "Sconosciuto";
      const key = `${p.locationKind}:${p.locationId || "none"}:${label}`;
      const g = map.get(key) || { key, label, totalQty: 0, items: [] };
      g.totalQty += p.qty;
      g.items.push(p);
      map.set(key, g);
    }

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [list]);

  function downloadCsv() {
    const csv = palletsToCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-pedane-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>📦 Giacenze (Stock)</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>← Home</a>
        <button
          onClick={downloadCsv}
          style={{ padding: "12px 14px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer", background: "#6a1b9a", color: "white" }}
        >
          ⬇️ Export CSV stock
        </button>
      </div>

      <div style={{ marginTop: 14, opacity: 0.8 }}>
        Totale pedane registrate: <b>{list.length}</b>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {groups.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna pedana registrata.</div>
        ) : (
          groups.map((g) => (
            <div key={g.key} style={{ padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 18 }}>{g.label}</div>
                  <div style={{ opacity: 0.85 }}>Totale quantità: <b>{g.totalQty}</b> · Righe: <b>{g.items.length}</b></div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {g.items
                  .slice()
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((p) => (
                    <div key={p.id} style={{ padding: 10, borderRadius: 12, border: "1px solid #f0f0f0" }}>
                      <b>{p.code}</b> · {p.type} · qty <b>{p.qty}</b>
                      {p.altCode ? <span> · alt <b>{p.altCode}</b></span> : null}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
