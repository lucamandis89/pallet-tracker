"use client";

import React, { useMemo, useState } from "react";
import { addDriver, getDrivers, removeDriver, updateDriver, DriverItem } from "../lib/storage";

export default function DriversPage() {
  const [list, setList] = useState<DriverItem[]>(() => getDrivers());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((x) => `${x.name} ${x.phone || ""} ${x.notes || ""}`.toLowerCase().includes(s));
  }, [list, q]);

  function refresh() {
    setList(getDrivers());
  }

  function add() {
    const n = name.trim();
    if (!n) return alert("Inserisci il nome autista.");
    try {
      addDriver({ name: n, phone: phone.trim() || undefined, notes: notes.trim() || undefined });
      setName("");
      setPhone("");
      setNotes("");
      refresh();
    } catch (e: any) {
      alert(e?.message === "LIMIT_10" ? "Limite massimo autisti: 10" : "Errore: " + (e?.message || "sconosciuto"));
    }
  }

  function edit(it: DriverItem) {
    const n = prompt("Nome autista:", it.name);
    if (n === null) return;
    const p = prompt("Telefono:", it.phone || "") ?? "";
    const no = prompt("Note:", it.notes || "") ?? "";
    updateDriver(it.id, { name: n.trim() || it.name, phone: p.trim() || undefined, notes: no.trim() || undefined });
    refresh();
  }

  function del(it: DriverItem) {
    if (!confirm(`Eliminare "${it.name}"?`)) return;
    removeDriver(it.id);
    refresh();
  }

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Autisti</h1>
      <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>← Home</a>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi autista (max 10)</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={inp()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" />
          <input style={inp()} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opz.)" />
          <input style={inp()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (opz.)" />
          <button style={btn("#1e88e5")} onClick={add}>Salva</button>
        </div>
      </div>

      <div style={box()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>📋 Elenco</div>
          <div style={{ fontWeight: 900, opacity: 0.8 }}>{list.length} / 10</div>
        </div>

        <input style={{ ...inp(), marginTop: 10 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca..." />

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun autista.</div> : null}
          {filtered.map((x) => (
            <div key={x.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{x.name}</div>
              <div style={{ opacity: 0.85 }}>
                {x.phone ? `📞 ${x.phone}` : "📞 —"} {x.notes ? ` • 📝 ${x.notes}` : ""}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn("#1565c0")} onClick={() => edit(x)}>Modifica</button>
                <button style={btn("#e53935")} onClick={() => del(x)}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const inp = (): React.CSSProperties => ({ padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16, width: "100%" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const card = (): React.CSSProperties => ({ padding: 14, borderRadius: 14, border: "1px solid #eee", display: "grid", gap: 8 });
