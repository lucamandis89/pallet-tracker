"use client";

import React, { useEffect, useMemo, useState } from "react";

type Driver = {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

const LS_KEY = "pallet-tracker:drivers:v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function toCsvValue(v: any) {
  const s = v === undefined || v === null ? "" : String(v);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function useGeo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function getPosition() {
    setError("");
    setLoading(true);

    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        setLoading(false);
        setError("Geolocalizzazione non supportata.");
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          setLoading(false);
          const msg =
            err.code === err.PERMISSION_DENIED
              ? "Permesso GPS negato."
              : "Impossibile ottenere la posizione.";
          setError(msg);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  return { loading, error, getPosition };
}

export default function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = useMemo(
    () => ({
      name: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      notes: "",
    }),
    []
  );

  const [form, setForm] = useState<any>(emptyForm);

  const { loading: geoLoading, error: geoError, getPosition } = useGeo();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(it: Driver) {
    setEditingId(it.id);
    setForm({
      name: it.name || "",
      phone: it.phone || "",
      address: it.address || "",
      lat: it.lat ?? "",
      lng: it.lng ?? "",
      notes: it.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Eliminare questo autista?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
  }

  async function fillMyPosition() {
    try {
      const p = await getPosition();
      setForm((f: any) => ({ ...f, lat: p.lat, lng: p.lng }));
    } catch {}
  }

  function save() {
    const name = String(form.name || "").trim();
    if (!name) {
      alert("Inserisci almeno il nome dell’autista.");
      return;
    }

    const phone = String(form.phone || "").trim();
    const address = String(form.address || "").trim();

    const latNum =
      form.lat === "" || form.lat === null || form.lat === undefined ? undefined : Number(form.lat);
    const lngNum =
      form.lng === "" || form.lng === null || form.lng === undefined ? undefined : Number(form.lng);

    if ((latNum !== undefined && Number.isNaN(latNum)) || (lngNum !== undefined && Number.isNaN(lngNum))) {
      alert("Lat/Lng non validi (devono essere numeri).");
      return;
    }

    const notes = String(form.notes || "").trim();

    if (editingId) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? { ...x, name, phone, address, lat: latNum, lng: lngNum, notes }
            : x
        )
      );
    } else {
      const newItem: Driver = {
        id: uid(),
        name,
        phone,
        address,
        lat: latNum,
        lng: lngNum,
        notes,
        createdAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
    }

    resetForm();
  }

  function exportCsv() {
    const header = ["id", "name", "phone", "address", "lat", "lng", "notes", "createdAt"];
    const rows = items.map((x) => [
      x.id,
      x.name,
      x.phone,
      x.address,
      x.lat ?? "",
      x.lng ?? "",
      x.notes ?? "",
      new Date(x.createdAt).toISOString(),
    ]);

    const csv =
      header.map(toCsvValue).join(",") +
      "\n" +
      rows.map((r) => r.map(toCsvValue).join(",")).join("\n");

    downloadTextFile("autisti.csv", csv, "text/csv;charset=utf-8");
  }

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Aggiungi autisti con contatti e posizione. Dati salvati in locale.
      </p>

      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>
          {editingId ? "✏️ Modifica Autista" : "➕ Nuovo Autista"}
        </h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <input
            placeholder="Nome e Cognome *"
            value={form.name}
            onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Indirizzo"
            value={form.address}
            onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", gridColumn: "1 / -1" }}
          />

          <input
            placeholder="Latitudine (es. 39.1234)"
            value={form.lat}
            onChange={(e) => setForm((f: any) => ({ ...f, lat: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            inputMode="decimal"
          />
          <input
            placeholder="Longitudine (es. 8.1234)"
            value={form.lng}
            onChange={(e) => setForm((f: any) => ({ ...f, lng: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            inputMode="decimal"
          />

          <textarea
            placeholder="Note (facoltative)"
            value={form.notes}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              gridColumn: "1 / -1",
              minHeight: 80,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={save}
            style={{ ...btn, background: "#1e88e5", color: "white" }}
          >
            {editingId ? "Salva Modifica" : "Aggiungi Autista"}
          </button>

          <button
            onClick={resetForm}
            style={{ ...btn, background: "#f1f1f1" }}
          >
            Annulla
          </button>

          <button
            onClick={fillMyPosition}
            style={{ ...btn, background: "#2e7d32", color: "white" }}
            disabled={geoLoading}
          >
            📍 Usa mia posizione
          </button>

          <button
            onClick={exportCsv}
            style={{ ...btn, background: "#6a1b9a", color: "white" }}
          >
            ⬇️ Export CSV
          </button>
        </div>

        {geoError ? (
          <div style={{ marginTop: 10, color: "#c62828", fontWeight: 700 }}>{geoError}</div>
        ) : null}
      </div>

      <div style={{ ...cardStyle }}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco Autisti</h2>
        {items.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nessun autista inserito.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{it.name}</div>
                    <div style={{ opacity: 0.85 }}>
                      {it.phone ? `📞 ${it.phone}` : "📞 —"}{" "}
                      {it.address ? ` • 📍 ${it.address}` : ""}
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      GPS: {it.lat ?? "—"} , {it.lng ?? "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() => startEdit(it)}
                      style={{ ...btn, padding: "10px 12px", background: "#ffb300" }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => remove(it.id)}
                      style={{ ...btn, padding: "10px 12px", background: "#e53935", color: "white" }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>

                {it.notes ? (
                  <div style={{ marginTop: 8, opacity: 0.85 }}>
                    📝 {it.notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <a href="/" style={{ fontWeight: 800 }}>← Torna alla Home</a>
      </div>
    </div>
  );
}
