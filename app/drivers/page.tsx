"use client";

import React, { useMemo, useState } from "react";
import { addDriver, getDrivers, removeDriver, updateDriver, type DriverItem } from "../lib/storage";

export default function DriversPage() {
  const [list, setList] = useState<DriverItem[]>(() => getDrivers());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const styles = useMemo(() => {
    const input = {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #ddd",
      fontSize: 16,
      outline: "none",
    } as const;

    const btn = (bg: string) =>
      ({
        padding: "12px 14px",
        borderRadius: 12,
        border: "none",
        fontWeight: 900,
        cursor: "pointer",
        background: bg,
        color: "white",
      } as const);

    return { input, btn };
  }, []);

  function reload() {
    setList(getDrivers());
  }

  function add() {
    if (!name.trim()) return alert("Inserisci il nome autista.");
    addDriver({
      name: name.trim(),
      phone: phone.trim() || undefined,
      note: note.trim() || undefined,
      active: true,
    });
    setName("");
    setPhone("");
    setNote("");
    reload();
  }

  function edit(d: DriverItem) {
    const newName = (prompt("Nome autista:", d.name) ?? d.name).trim();
    const newPhone = (prompt("Telefono (opz.):", d.phone ?? "") ?? (d.phone ?? "")).trim();
    const newNote = (prompt("Note (opz.):", d.note ?? "") ?? (d.note ?? "")).trim();
    updateDriver(d.id, {
      name: newName || d.name,
      phone: newPhone || undefined,
      note: newNote || undefined,
    });
    reload();
  }

  function toggleActive(d: DriverItem) {
    updateDriver(d.id, { active: !d.active });
    reload();
  }

  function del(id: string) {
    if (!confirm("Eliminare autista?")) return;
    removeDriver(id);
    reload();
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>🚚 Gestione Autisti</h1>
      <div style={{ marginTop: 10 }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>
          ← Home
        </a>
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi autista</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" style={styles.input} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono (opz.)" style={styles.input} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opz.)" style={styles.input} />
          <button onClick={add} style={styles.btn("#1e88e5")}>+ Aggiungi autista</button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun autista inserito.</div>
        ) : (
          list.map((d) => (
            <div key={d.id} style={{ padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {d.name} {!d.active ? " (inattivo)" : ""}
                  </div>
                  <div style={{ opacity: 0.85 }}>📞 {d.phone || "—"}</div>
                  {d.note ? <div style={{ marginTop: 6 }}>{d.note}</div> : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <button onClick={() => edit(d)} style={styles.btn("#6a1b9a")}>Modifica</button>
                  <button onClick={() => toggleActive(d)} style={styles.btn("#0b1220")}>
                    {d.active ? "Disattiva" : "Attiva"}
                  </button>
                  <button onClick={() => del(d.id)} style={styles.btn("#e53935")}>Elimina</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
