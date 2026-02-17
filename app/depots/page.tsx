"use client";

import React, { useMemo, useState } from "react";
import { addDepot, getDefaultDepot, getDepots, removeDepot, updateDepot, DepotItem } from "../lib/storage";

export default function DepotsPage() {
  const [list, setList] = useState<DepotItem[]>(() => getDepots());
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");

  const defaultDepot = getDefaultDepot();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((x) => `${x.name} ${x.address || ""} ${x.notes || ""}`.toLowerCase().includes(s));
  }, [list, q]);

  function refresh() {
    setList(getDepots());
  }

  function add() {
    const n = name.trim();
    if (!n) return alert("Inserisci il nome deposito.");
    addDepot({ name: n, address: address.trim() || undefined, notes: notes.trim() || undefined });
    setName("");
    setAddress("");
    setNotes("");
    refresh();
  }

  function edit(it: DepotItem) {
    const n = prompt("Nome deposito:", it.name);
    if (n === null) return;
    const a = prompt("Indirizzo:", it.address || "") ?? "";
    const no = prompt("Note:", it.notes || "") ?? "";
    updateDepot(it.id, { name: n.trim() || it.name, address: a.trim() || undefined, notes: no.trim() || undefined });
    refresh();
  }

  function del(it: DepotItem) {
    if (!confirm(`Eliminare "${it.name}"?`)) return;
    removeDepot(it.id);
    refresh();
  }

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏭 Depositi</h1>
      <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>← Home</a>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>✅ Deposito default sempre presente</div>
        <div style={card()}>
          <div style={{ fontWeight: 900 }}>{defaultDepot.name}</div>
          <div style={{ opacity: 0.75 }}>Non eliminabile • utile per demo/inizio</div>
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi deposito</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={inp()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome deposito" />
          <input style={inp()} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Indirizzo (opz.)" />
          <input style={inp()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (opz.)" />
          <button style={btn("#fb8c00")} onClick={add}>Salva</button>
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900 }}>📋 Elenco</div>
        <input style={{ ...inp(), marginTop: 10 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca..." />

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun deposito inserito.</div> : null}
          {filtered.map((x) => (
            <div key={x.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{x.name}</div>
              <div style={{ opacity: 0.85 }}>
                {x.address ? `📍 ${x.address}` : "📍 —"} {x.notes ? ` • 📝 ${x.notes}` : ""}
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
