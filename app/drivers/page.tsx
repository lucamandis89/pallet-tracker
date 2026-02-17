"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Driver, loadDB, saveDB, uid } from "../lib/db";

export default function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const db = loadDB();
    setItems(db.drivers);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => (x.name + " " + (x.phone || "")).toLowerCase().includes(s));
  }, [items, q]);

  function add() {
    const n = name.trim();
    if (!n) return;
    const db = loadDB();
    const row: Driver = { id: uid("drv"), name: n, phone: phone.trim() || undefined, note: note.trim() || undefined, createdAt: Date.now() };
    db.drivers.unshift(row);
    saveDB(db);
    setItems(db.drivers);
    setName(""); setPhone(""); setNote("");
  }

  function remove(id: string) {
    const db = loadDB();
    db.drivers = db.drivers.filter((x) => x.id !== id);
    saveDB(db);
    setItems(db.drivers);
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <a href="/" style={{ color: "#1e88e5", fontWeight: 700 }}>← Torna alla Home</a>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
        <h2 style={{ marginTop: 0 }}>➕ Aggiungi autista</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" style={inp()} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opzionale)" style={inp()} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opzionale)" style={inp()} />
          <button onClick={add} style={btn("#1e88e5")}>Salva autista</button>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca..." style={inp()} />
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun autista.</div> : null}
          {filtered.map((x) => (
            <div key={x.id} style={card()}>
              <div style={{ fontWeight: 800 }}>{x.name}</div>
              <div style={{ opacity: 0.85 }}>{x.phone || "—"} {x.note ? `• ${x.note}` : ""}</div>
              <button onClick={() => remove(x.id)} style={btn("#e53935")}>Elimina</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function inp(): React.CSSProperties {
  return { padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 };
}
function btn(color: string): React.CSSProperties {
  return { padding: 12, borderRadius: 12, border: "none", background: color, color: "white", fontWeight: 800, cursor: "pointer" };
}
function card(): React.CSSProperties {
  return { padding: 12, borderRadius: 14, border: "1px solid #eee", display: "grid", gap: 8 };
}
