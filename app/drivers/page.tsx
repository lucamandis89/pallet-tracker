"use client";

import React, { useMemo, useState } from "react";
import { addDriver, getDrivers, removeDriver, updateDriver, DriverItem } from "../lib/storage";

export default function DriversPage() {
  const [list, setList] = useState<DriverItem[]>(() => getDrivers());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const count = useMemo(() => list.length, [list]);

  function refresh() {
    setList(getDrivers());
  }

  function resetForm() {
    setName("");
    setPhone("");
    setNotes("");
  }

  function onAdd() {
    const n = name.trim();
    if (!n) return alert("Inserisci il nome autista.");
    try {
      addDriver({ name: n, phone: phone.trim() || undefined, notes: notes.trim() || undefined });
      refresh();
      resetForm();
    } catch (e: any) {
      if (e?.message === "LIMIT_10") alert("Limite raggiunto: massimo 10 autisti.");
      else alert("Errore: " + (e?.message || "sconosciuto"));
    }
  }

  function onEdit(item: DriverItem) {
    const newName = prompt("Nome autista:", item.name);
    if (newName === null) return;
    const n = newName.trim();
    if (!n) return alert("Nome non valido.");

    const newPhone = prompt("Telefono (facoltativo):", item.phone || "") ?? item.phone || "";
    const newNotes = prompt("Note (facoltative):", item.notes || "") ?? item.notes || "";

    updateDriver(item.id, {
      name: n,
      phone: newPhone.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    refresh();
  }

  function onDelete(item: DriverItem) {
    if (!confirm(`Eliminare autista "${item.name}"?`)) return;
    removeDriver(item.id);
    refresh();
  }

  const input: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  const btn = (bg: string): React.CSSProperties => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card: React.CSSProperties = {
    padding: 14,
    borderRadius: 16,
    border: "2px solid #1976d2",
    background: "#e3f2fd",
    marginTop: 12,
  };

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Massimo <b>10 autisti</b>. Servono per assegnare le pedane quando sono in viaggio.
      </p>

      <div style={{ padding: 12, borderRadius: 12, background: "#f2f2f2", fontWeight: 900 }}>
        Totale autisti: {count} / 10
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi Autista</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Nome *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Es: Mario Rossi" />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Telefono</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={input}
              placeholder="Facoltativo"
              inputMode="tel"
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={input} placeholder="Facoltative" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={onAdd} style={btn("#2e7d32")}>
            Salva Autista
          </button>
          <button onClick={resetForm} style={btn("#616161")}>
            Svuota
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 8 }}>📋 Elenco</h2>

        {list.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #ddd", background: "white" }}>
            Nessun autista inserito.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #ddd",
                  background: "white",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 900 }}>{d.name}</div>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  {d.phone ? <>📞 {d.phone} &nbsp; </> : null}
                  {d.notes ? <>📝 {d.notes}</> : null}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => onEdit(d)} style={btn("#1565c0")}>
                    Modifica
                  </button>
                  <button onClick={() => onDelete(d)} style={btn("#c62828")}>
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
