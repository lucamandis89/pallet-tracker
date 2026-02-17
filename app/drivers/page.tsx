"use client";

import React, { useEffect, useMemo, useState } from "react";

type Driver = {
  id: string;
  name: string;
  phone: string;
  licensePlate?: string; // targa (opzionale)
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = "pallet_drivers";

function uid() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

export default function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [note, setNote] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setItems(saved ? JSON.parse(saved) : []);
  }, []);

  function persist(next: Driver[]) {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPhone("");
    setLicensePlate("");
    setNote("");
  }

  function onSubmit() {
    if (!name.trim()) return alert("Inserisci il nome autista.");
    if (!phone.trim()) return alert("Inserisci il telefono.");

    if (editingId) {
      const next = items.map((d) =>
        d.id === editingId
          ? { ...d, name: name.trim(), phone: phone.trim(), licensePlate: licensePlate.trim(), note: note.trim() }
          : d
      );
      persist(next);
      resetForm();
      return;
    }

    const newItem: Driver = {
      id: uid(),
      name: name.trim(),
      phone: phone.trim(),
      licensePlate: licensePlate.trim(),
      note: note.trim(),
      createdAt: new Date().toLocaleString(),
    };

    persist([newItem, ...items]);
    resetForm();
  }

  function onEdit(d: Driver) {
    setEditingId(d.id);
    setName(d.name);
    setPhone(d.phone);
    setLicensePlate(d.licensePlate ?? "");
    setNote(d.note ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questo autista?")) return;
    persist(items.filter((x) => x.id !== id));
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((d) => {
      const hay = `${d.name} ${d.phone} ${d.licensePlate ?? ""} ${d.note ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const inputStyle = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontSize: 16,
  };

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>Aggiungi, modifica, elimina e cerca autisti.</div>

      <div style={{ display: "grid", gap: 10, border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>{editingId ? "✏️ Modifica Autista" : "➕ Nuovo Autista"}</div>

        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" />
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono" />
        <input style={inputStyle} value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="Targa (opzionale)" />
        <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opzionale)" />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn("#1e88e5")} onClick={onSubmit}>
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

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Cerca autista (nome/telefono/targa/nota)" />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun autista presente.</div>
        ) : (
          filtered.map((d) => (
            <div key={d.id} style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{d.name}</div>
              <div style={{ marginTop: 6 }}>📞 {d.phone}</div>
              {d.licensePlate ? <div style={{ marginTop: 6 }}>🚛 Targa: {d.licensePlate}</div> : null}
              {d.note ? <div style={{ marginTop: 6, opacity: 0.9 }}>📝 {d.note}</div> : null}
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>Creato: {d.createdAt}</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn("#6a1b9a")} onClick={() => onEdit(d)}>
                  Modifica
                </button>
                <button style={btn("#e53935")} onClick={() => onDelete(d.id)}>
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
