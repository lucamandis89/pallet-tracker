// app/drivers/page.tsx
"use client";

import React, { useState } from "react";
import { addDriver, getDrivers, removeDriver, updateDriver, DriverItem } from "../lib/storage";

export default function DriversPage() {
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const list = getDrivers();

  function add() {
    addDriver(name, phone);
    setName("");
    setPhone("");
    setRefresh((x) => x + 1);
  }

  function edit(d: DriverItem) {
    const n = prompt("Nome autista", d.name) ?? d.name;
    const p = prompt("Telefono (opz.)", d.phone ?? "") ?? (d.phone ?? "");
    updateDriver({ ...d, name: n.trim() || d.name, phone: p.trim() || "" });
    setRefresh((x) => x + 1);
  }

  function del(id: string) {
    if (!confirm("Eliminare questo autista?")) return;
    removeDriver(id);
    setRefresh((x) => x + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/" style={link()}>← Home</a>
        <a href="/scan" style={link()}>Scanner</a>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Aggiungi autista</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" style={inp()} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opz.)" style={inp()} />
        <button onClick={add} style={btn("#2e7d32")}>Aggiungi</button>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Elenco</div>
        {list.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun autista.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((d) => (
            <div key={d.id} style={card()}>
              <div style={{ fontWeight: 900 }}>{d.name}</div>
              {d.phone ? <div style={{ opacity: 0.8 }}>{d.phone}</div> : null}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => edit(d)} style={btn("#455a64")}>Modifica</button>
                <button onClick={() => del(d.id)} style={btn("#e53935")}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ opacity: 0, height: 1 }}>{refresh}</div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const card = (): React.CSSProperties => ({ padding: 12, borderRadius: 14, border: "1px solid #eee" });
const inp = (): React.CSSProperties => ({ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", marginBottom: 10, fontWeight: 800 });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
