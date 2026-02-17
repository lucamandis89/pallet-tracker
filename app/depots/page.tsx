"use client";

import React, { useMemo, useState } from "react";
import { addDepot, getDepots, removeDepot, updateDepot } from "../lib/storage";

export default function DepotsPage() {
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getDepots(), [refresh]);

  function add() {
    const name = prompt("Nome deposito:");
    if (!name?.trim()) return;
    const address = prompt("Indirizzo (opz.)") || "";
    const note = prompt("Note (opz.)") || "";
    addDepot(name.trim(), address.trim() || undefined, note.trim() || undefined);
    setRefresh((x) => x + 1);
  }

  function edit(id: string) {
    const d = list.find((x) => x.id === id);
    if (!d) return;
    const name = prompt("Nome:", d.name) ?? d.name;
    const address = prompt("Indirizzo:", d.address || "") ?? (d.address || "");
    const note = prompt("Note:", d.note || "") ?? (d.note || "");
    updateDepot(id, { name: name.trim(), address: address.trim() || undefined, note: note.trim() || undefined });
    setRefresh((x) => x + 1);
  }

  function del(id: string) {
    if (!confirm("Eliminare deposito? (se è l’ultimo non si può)")) return;
    removeDepot(id);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏭 Depositi</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#fb8c00")} onClick={add}>+ Aggiungi deposito</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>
          Nota: non puoi eliminare l’ultimo deposito (serve come fallback).
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((d) => (
            <div key={d.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{d.name}</div>
              <div style={{ opacity: 0.85 }}>
                {d.address ? `📍 ${d.address}` : "📍 (nessun indirizzo)"} {d.note ? ` • 📝 ${d.note}` : ""}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button style={btn("#455a64")} onClick={() => edit(d.id)}>Modifica</button>
                <button style={btn("#e53935")} onClick={() => del(d.id)}>Elimina</button>
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
