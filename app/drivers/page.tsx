"use client";

import React, { useMemo, useState } from "react";
import { addDriver, getDrivers, removeDriver, updateDriver } from "../lib/storage";

export default function DriversPage() {
  const [refresh, setRefresh] = useState(0);
  const list = useMemo(() => getDrivers(), [refresh]);

  function add() {
    const name = prompt("Nome autista:");
    if (!name?.trim()) return;
    const phone = prompt("Telefono (opz.)") || "";
    const note = prompt("Note (opz.)") || "";
    addDriver(name.trim(), phone.trim() || undefined, note.trim() || undefined);
    setRefresh((x) => x + 1);
  }

  function edit(id: string) {
    const d = list.find((x) => x.id === id);
    if (!d) return;
    const name = prompt("Nome:", d.name) ?? d.name;
    const phone = prompt("Telefono:", d.phone || "") ?? (d.phone || "");
    const note = prompt("Note:", d.note || "") ?? (d.note || "");
    updateDriver(id, { name: name.trim(), phone: phone.trim() || undefined, note: note.trim() || undefined });
    setRefresh((x) => x + 1);
  }

  function del(id: string) {
    if (!confirm("Eliminare autista?")) return;
    removeDriver(id);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#1e88e5")} onClick={add}>+ Aggiungi autista</button>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
      </div>

      <div style={box()}>
        {list.length === 0 ? <div style={{ opacity: 0.75 }}>Nessun autista. Aggiungine uno.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((d) => (
            <div key={d.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{d.name}</div>
              <div style={{ opacity: 0.85 }}>
                {d.phone ? `📞 ${d.phone}` : "📞 (nessun telefono)"} {d.note ? ` • 📝 ${d.note}` : ""}
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
