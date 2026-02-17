"use client";

import React, { useMemo, useState } from "react";
import {
  formatDT,
  getDepotOptions,
  getDrivers,
  getPallets,
  getShopOptions,
  setPallets,
  PalletItem,
  StockLocationKind,
} from "../lib/storage";

function locName(kind?: StockLocationKind, id?: string) {
  if (!kind || !id) return "—";
  if (kind === "DEPOSITO") return getDepotOptions().find((x) => x.id === id)?.name || "—";
  if (kind === "AUTISTA") return getDrivers().find((x) => x.id === id)?.name || "—";
  return getShopOptions().find((x) => x.id === id)?.name || "—";
}

export default function PalletsPage() {
  const [q, setQ] = useState("");
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getPallets(), [refresh]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => `${p.code} ${p.altCode || ""} ${p.type || ""} ${p.notes || ""}`.toLowerCase().includes(s));
  }, [list, q]);

  function edit(p: PalletItem) {
    const t = prompt("Tipo pedana (es: EPAL/CHEP/LPR/IFCO...)", p.type || "") ?? p.type || "";
    const a = prompt("Codice alternativo (opz.)", p.altCode || "") ?? p.altCode || "";
    const n = prompt("Note (opz.)", p.notes || "") ?? p.notes || "";

    const all = getPallets();
    const idx = all.findIndex((x) => x.id === p.id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], type: t.trim() || undefined, altCode: a.trim() || undefined, notes: n.trim() || undefined };
    setPallets(all);
    setRefresh((x) => x + 1);
  }

  function del(p: PalletItem) {
    if (!confirm(`Eliminare pedana "${p.code}"?`)) return;
    const all = getPallets().filter((x) => x.id !== p.id);
    setPallets(all);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🧱 Registro Pedane</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <input style={{ ...inp(), marginTop: 12 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per codice, tipo, note..." />

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>Nessuna pedana.</div> : null}
        {filtered.map((p) => (
          <div key={p.id} style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>{p.code}</div>
                <div style={{ opacity: 0.85 }}>
                  Tipo: <b>{p.type || "—"}</b> • Alt: {p.altCode || "—"}
                </div>
              </div>
              <div style={{ opacity: 0.85 }}>
                Ultimo: {p.lastSeenTs ? formatDT(p.lastSeenTs) : "—"}
                <br />
                Posizione: {p.lastLocKind ? `${p.lastLocKind} • ${locName(p.lastLocKind, p.lastLocId)}` : "—"}
              </div>
            </div>

            <div style={{ opacity: 0.85 }}>
              GPS: {p.lastLat && p.lastLng ? `${p.lastLat.toFixed(5)}, ${p.lastLng.toFixed(5)} (±${Math.round(p.lastAccuracy || 0)}m)` : "—"}
              {p.notes ? <div>📝 {p.notes}</div> : null}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button style={btn("#1565c0")} onClick={() => edit(p)}>Modifica</button>
              <button style={btn("#e53935")} onClick={() => del(p)}>Elimina</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = (): React.CSSProperties => ({ padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16, width: "100%" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const card = (): React.CSSProperties => ({ padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white", display: "grid", gap: 8 });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
