"use client";

import React, { useMemo, useState } from "react";
import { addShop, deleteShop, getShops, updateShop } from "../lib/storage";

export default function ShopsPage() {
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getShops(), [refresh]);

  function add() {
    const name = prompt("Nome negozio:");
    if (!name?.trim()) return;
    const address = prompt("Indirizzo (opz.)") || "";
    const note = prompt("Note (opz.)") || "";
    addShop(name.trim(), address.trim() || undefined, note.trim() || undefined);
    setRefresh((x) => x + 1);
  }

  function edit(id: string) {
    const s = list.find((x) => x.id === id);
    if (!s) return;
    const name = prompt("Nome:", s.name) ?? s.name;
    const address = prompt("Indirizzo:", s.address || "") ?? (s.address || "");
    const note = prompt("Note:", s.note || "") ?? (s.note || "");
    updateShop(id, { name: name.trim(), address: address.trim() || undefined, note: note.trim() || undefined });
    setRefresh((x) => x + 1);
  }

  function del(id: string) {
    if (!confirm("Eliminare negozio?")) return;
    deleteShop(id);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏪 Gestione Negozi</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#1b9a4a")} onClick={add}>+ Aggiungi negozio</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        {list.length === 0 ? <div style={{ opacity: 0.75 }}>Nessun negozio. Aggiungine uno.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((s) => (
            <div key={s.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{s.name}</div>
              <div style={{ opacity: 0.85 }}>
                {s.address ? `📍 ${s.address}` : "📍 (nessun indirizzo)"} {s.note ? ` • 📝 ${s.note}` : ""}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button style={btn("#455a64")} onClick={() => edit(s.id)}>Modifica</button>
                <button style={btn("#e53935")} onClick={() => del(s.id)}>Elimina</button>
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
