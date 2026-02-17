"use client";

import React, { useEffect, useMemo, useState } from "react";

type Shop = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = "pallet_shops";
function uid() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

export default function ShopsPage() {
  const [items, setItems] = useState<Shop[]>([]);
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setItems(saved ? JSON.parse(saved) : []);
  }, []);

  function persist(next: Shop[]) {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setAddress("");
    setPhone("");
    setNote("");
  }

  function onSubmit() {
    if (!name.trim()) return alert("Inserisci il nome negozio.");
    if (!address.trim()) return alert("Inserisci l'indirizzo.");

    if (editingId) {
      const next = items.map((s) =>
        s.id === editingId
          ? { ...s, name: name.trim(), address: address.trim(), phone: phone.trim(), note: note.trim() }
          : s
      );
      persist(next);
      resetForm();
      return;
    }

    const newItem: Shop = {
      id: uid(),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      note: note.trim(),
      createdAt: new Date().toLocaleString(),
    };

    persist([newItem, ...items]);
    resetForm();
  }

  function onEdit(s: Shop) {
    setEditingId(s.id);
    setName(s.name);
    setAddress(s.address);
    setPhone(s.phone ?? "");
    setNote(s.note ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questo negozio?")) return;
    persist(items.filter((x) => x.id !== id));
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const hay = `${x.name} ${x.address} ${x.phone ?? ""} ${x.note ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const inputStyle = { padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", fontSize: 16 };
  const btn = (bg: string) => ({ padding: "12px 14px", borderRadius: 12, border: "none", fontWeight: 900 as const, cursor: "pointer", background: bg, color: "white" });

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏪 Gestione Negozi</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>Anagrafica negozi (nome, indirizzo, telefono, note).</div>

      <div style={{ display: "grid", gap: 10, border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>{editingId ? "✏️ Modifica Negozio" : "➕ Nuovo Negozio"}</div>

        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome negozio" />
        <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Indirizzo" />
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opzionale)" />
        <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opzionale)" />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn("#1b9a4a")} onClick={onSubmit}>
            {editingId ? "Salva modifiche" : "Aggiungi"}
          </button>
          {editingId ? (
            <button style={btn("#9e9e9e")} onClick={resetForm}>
              Annulla
            </button>
          ) : null}
          <a href="/" style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            ← Home
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Cerca negozio (nome/indirizzo/telefono/nota)" />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun negozio presente.</div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{s.name}</div>
              <div style={{ marginTop: 6 }}>📍 {s.address}</div>
              {s.phone ? <div style={{ marginTop: 6 }}>📞 {s.phone}</div> : null}
              {s.note ? <div style={{ marginTop: 6, opacity: 0.9 }}>📝 {s.note}</div> : null}
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>Creato: {s.createdAt}</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn("#6a1b9a")} onClick={() => onEdit(s)}>
                  Modifica
                </button>
                <button style={btn("#e53935")} onClick={() => onDelete(s.id)}>
                  Elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
