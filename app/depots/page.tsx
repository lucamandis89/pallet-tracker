"use client";

import React, { useMemo, useState } from "react";
import {
  addDepot,
  getDefaultDepot,
  getDepots,
  removeDepot,
  setDefaultDepot,
  updateDepot,
  type DepotItem,
} from "../lib/storage";

export default function DepotsPage() {
  const [list, setList] = useState<DepotItem[]>(() => getDepots());
  const [def, setDef] = useState<string>(() => getDefaultDepot());

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

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
    setList(getDepots());
    setDef(getDefaultDepot());
  }

  function captureGps() {
    if (!navigator.geolocation) {
      alert("Geolocalizzazione non supportata.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => alert("Permesso GPS negato o posizione non disponibile."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function add() {
    if (!name.trim()) return alert("Inserisci il nome deposito.");
    addDepot({
      name: name.trim(),
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      note: note.trim() || undefined,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });
    setName("");
    setAddress("");
    setCity("");
    setNote("");
    setLat("");
    setLng("");
    reload();
  }

  function edit(d: DepotItem) {
    const newName = (prompt("Nome deposito:", d.name) ?? d.name).trim();
    const newAddress = (prompt("Indirizzo:", d.address ?? "") ?? (d.address ?? "")).trim();
    const newCity = (prompt("Città:", d.city ?? "") ?? (d.city ?? "")).trim();
    const newNote = (prompt("Note:", d.note ?? "") ?? (d.note ?? "")).trim();

    updateDepot(d.id, {
      name: newName || d.name,
      address: newAddress || undefined,
      city: newCity || undefined,
      note: newNote || undefined,
    });
    reload();
  }

  function del(id: string) {
    if (!confirm("Eliminare deposito?")) return;
    removeDepot(id);
    reload();
  }

  function setDefault(id: string) {
    setDefaultDepot(id);
    reload();
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>🏭 Depositi</h1>
      <div style={{ marginTop: 10 }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>
          ← Home
        </a>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 16,
          border: "1px solid #e6e6e6",
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi deposito</div>

        <div style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome deposito" style={styles.input} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Indirizzo (opz.)" style={styles.input} />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Città (opz.)" style={styles.input} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (opz.)" style={styles.input} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitudine (opz.)" style={{ ...styles.input, flex: "1 1 180px" }} />
            <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitudine (opz.)" style={{ ...styles.input, flex: "1 1 180px" }} />
            <button onClick={captureGps} style={styles.btn("#6a1b9a")}>📍 Prendi GPS</button>
          </div>

          <button onClick={add} style={styles.btn("#fb8c00")}>+ Aggiungi deposito</button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun deposito inserito.</div>
        ) : (
          list.map((d) => (
            <div
              key={d.id}
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e6e6e6",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {d.name} {def === d.id ? "⭐" : ""}
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    {d.address || "—"} {d.city ? `· ${d.city}` : ""}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    GPS: {d.lat ?? "—"} / {d.lng ?? "—"}
                  </div>
                  {d.note ? <div style={{ marginTop: 6 }}>{d.note}</div> : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130 }}>
                  <button onClick={() => edit(d)} style={styles.btn("#1e88e5")}>Modifica</button>
                  <button onClick={() => setDefault(d.id)} style={styles.btn("#0b1220")}>Default</button>
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
