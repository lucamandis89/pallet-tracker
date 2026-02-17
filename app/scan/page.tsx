"use client";

import { useState } from "react";

export default function ScanPage() {
  const [palletId, setPalletId] = useState("");
  const [location, setLocation] = useState<string>("Nessuna posizione salvata");
  const [status, setStatus] = useState<string>("");

  const handleFakeScan = () => {
    const fakeCode = "PALLET-" + Math.floor(Math.random() * 100000);
    setPalletId(fakeCode);
    setStatus("✅ QR letto con successo: " + fakeCode);
  };

  const handleSaveLocation = () => {
    if (!palletId) {
      setStatus("❌ Prima scansiona un QR!");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("❌ Il GPS non è supportato su questo dispositivo.");
      return;
    }

    setStatus("📍 Recupero posizione GPS...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const newLocation = `📦 ${palletId} → Lat: ${lat.toFixed(
          6
        )}, Lng: ${lng.toFixed(6)}`;

        setLocation(newLocation);
        setStatus("✅ Posizione salvata con successo!");

        // Qui in futuro potrai salvare i dati su database (Firebase, Supabase ecc.)
      },
      () => {
        setStatus("❌ Errore nel recupero della posizione.");
      }
    );
  };

  return (
    <main style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>📷 Scan QR Pallet</h1>

      <p style={{ marginTop: 10 }}>
        Questa pagina serve per leggere un QR Code e salvare la posizione GPS
        della pedana.
      </p>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={handleFakeScan}
          style={{
            padding: 14,
            width: "100%",
            borderRadius: 12,
            border: "none",
            background: "#0f172a",
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          📷 Simula Lettura QR
        </button>
      </div>

      <div style={{ marginTop: 15 }}>
        <input
          value={palletId}
          onChange={(e) => setPalletId(e.target.value)}
          placeholder="Codice pallet..."
          style={{
            padding: 12,
            width: "100%",
            borderRadius: 12,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />
      </div>

      <div style={{ marginTop: 15 }}>
        <button
          onClick={handleSaveLocation}
          style={{
            padding: 14,
            width: "100%",
            borderRadius: 12,
            border: "none",
            background: "#16a34a",
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          📍 Salva Posizione GPS
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 12,
          background: "#f1f5f9",
          fontSize: 15,
        }}
      >
        <strong>📌 Ultima posizione:</strong>
        <p style={{ marginTop: 8 }}>{location}</p>
      </div>

      {status && (
        <p style={{ marginTop: 15, fontWeight: "bold", color: "#0f172a" }}>
          {status}
        </p>
      )}
    </main>
  );
}
