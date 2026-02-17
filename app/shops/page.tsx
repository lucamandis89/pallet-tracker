"use client";

import React, { useMemo, useState } from "react";
import {
  addShop,
  getDefaultShop,
  getShops,
  removeShop,
  setDefaultShop,
  updateShop,
  type ShopItem,
} from "../lib/storage";

export default function ShopsPage() {
  const [list, setList] = useState<ShopItem[]>(() => getShops());
  const [def, setDef] = useState<string>(() => getDefaultShop());

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
      background: "white",
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
    setList(getShops());
    setDef(getDefaultShop());
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
    if (!name.trim()) return alert("Inserisci il nome negozio.");

    addShop({
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

  function edit(s: ShopItem) {
    setName(s.name);
    setAddress(s.address ?? "");
    setCity(s.city ?? "");
    setNote(s.note ?? "");
    setLat(s.lat != null ? String(s.lat) : "");
    setLng(s.lng != null ? String(s.lng) : "");

    sessionStorage.setItem("editingShopId", s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveEditIfAny() {
    const id = sessionStorage.getItem("editingShopId");
    if (!id) return add();

    if (!name.trim()) return alert("Inserisci il nome negozio.");

    updateShop(id, {
      name: name.trim(),
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      note: note.trim() || undefined,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });

    sessionStorage.removeItem("editingShopId");

    setName("");
    setAddress("");
    setCity("");
    setNote("");
    setLat("");
    setLng("");

    reload();
  }

  function cancelEdit() {
    sessionStorage.removeItem("editingShopId");

    setName("");
    setAddress("");
    setCity("");
    setNote("");
    setLat("");
    setLng("");
  }

  function del(id: string) {
    if (!confirm("Eliminare negozio?")) return;
    removeShop(id);
    reload();
  }

  function setDefault(id: string) {
    setDefaultShop(id);
    reload();
  }

  const editingId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("editingShopId")
      : null;

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>🏪 Gestione Negozi</h1>

      <div style={{ marginTop: 10 }}>
        <a
          href="/"
          style={{
            color: "#1e88e5",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
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
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {editingId ? "✏️ Modifica negozio" : "➕ Aggiungi negozio"}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome negozio"
            style={styles.input}
          />

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Indirizzo (opz.)"
            style={styles.input}
          />

          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Città (opz.)"
            style={styles.input}
          />

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (opz.)"
            style={styles.input}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitudine (opz.)"
              style={{ ...styles.input, flex: "1 1 180px" }}
            />

            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitudine (opz.)"
              style={{ ...styles.input, flex: "1 1 180px" }}
            />

            <button onClick={captureGps} style={styles.btn("#6a1b9a")}>
              📍 Prendi GPS
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveEditIfAny} style={styles.btn("#2e7d32")}>
              {editingId ? "Aggiorna" : "+ Aggiungi"}
            </button>

            {editingId ? (
              <button onClick={cancelEdit} style={styles.btn("#616161")}>
                Annulla modifica
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun negozio inserito.</div>
        ) : (
          list.map((s) => (
            <div
              key={s.id}
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e6e6e6",
                background: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {s.name} {def === s.id ? "⭐" : ""}
                  </div>

                  <div style={{ opacity: 0.8 }}>
                    {s.address || "—"} {s.city ? `· ${s.city}` : ""}
                  </div>

                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    GPS: {s.lat ?? "—"} / {s.lng ?? "—"}
                  </div>

                  {s.note ? <div style={{ marginTop: 6 }}>{s.note}</div> : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minWidth: 140,
                  }}
                >
                  <button onClick={() => edit(s)} style={styles.btn("#1e88e5")}>
                    Modifica
                  </button>

                  <button
                    onClick={() => setDefault(s.id)}
                    style={styles.btn("#0b1220")}
                  >
                    Default
                  </button>

                  <button onClick={() => del(s.id)} style={styles.btn("#e53935")}>
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
