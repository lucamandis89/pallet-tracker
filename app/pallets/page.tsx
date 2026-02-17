"use client";

import React, { useMemo, useState } from "react";
import { deletePallet, formatDT, getPallets, upsertPallet } from "../lib/storage";

export default function PalletsPage() {
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getPallets(), [refresh]);

  function add() {
    const code = prompt("Codice pedana (es: PEDANA-000123):");
    if (!code?.trim()) return;
    const type = prompt("Tipo pedana (es: EUR/EPAL, CHEP, IFCO...) (opz.)") || "";
    const alt = prompt("Codice alternativo (opz.)") || "";
    const notes = prompt("Note (opz.)") || "";
    upsertPallet({ code: code.trim(), palletType: type.trim() || undefined, altCode: alt.trim() || undefined, notes: notes.trim() || undefined });
    setRefresh((x) => x + 1);
  }

  function edit(id: string) {
    const p = list.find((x) => x.id === id);
    if (!p) return;
    const type = prompt("Tipo pedana:", p.palletType || "") ?? (p.palletType || "");
    const alt = prompt("Codice alternativo:", p.altCode || "") ?? (p.altCode || "");
    const notes = prompt("Note:", p.notes || "") ?? (p.notes || "");
    upsertPallet({ code: p.code, palletType: type.trim() || undefined, altCode: alt.trim() || undefined, notes: notes.trim() || undefined });
    setRefresh((x) => x + 1);
  }

  function del(id: string) {
    if (!confirm("Eliminare pedana dal registro?")) return;
    deletePallet(id);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🧱 Registro Pedane</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#2e7d32")} onClick={add}>+ Aggiungi pedana</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        {list.length === 0 ? <div style={{ opacity: 0.75 }}>Nessuna pedana nel registro.</div> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {list.map((p) => (
            <div key={p.id} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
                <div style={{ opacity: 0.8 }}>
                  Ultimo visto: {p.lastSeenTs ? formatDT(p.lastSeenTs) : "—"}
                </div>
              </div>

              <div style={{ opacity: 0.9, marginTop: 6 }}>
                Tipo: <b>{p.palletType || "—"}</b> {p.altCode ? ` • Alt: ${p.altCode}` : ""}
              </div>

              <div style={{ opacity: 0.9, marginTop: 6 }}>
                Posizione: <b>{p.locationKind || "—"}</b> {p.locationId ? `(${p.locationId})` : ""}
              </div>

              <div style={{ opacity: 0.85, marginTop: 6 }}>
                GPS: {p.lastLat ?? "—"}, {p.lastLng ?? "—"} {p.lastAccuracy ? `±${Math.round(p.lastAccuracy)}m` : ""}
              </div>

              {p.notes ? <div style={{ marginTop: 8, opacity: 0.9 }}>📝 {p.notes}</div> : null}

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button style={btn("#455a64")} onClick={() => edit(p.id)}>Modifica</button>
                <button style={btn("#e53935")} onClick={() => del(p.id)}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const card = (): React.CSSProperties => ({ padding: 14, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
