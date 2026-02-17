"use client";

import { useEffect, useState } from "react";

export default function ScanPage() {
  const [qrCode, setQrCode] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // prende GPS
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS non supportato su questo dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        alert("Permesso GPS negato o errore GPS.");
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleSubmit = async () => {
    if (!qrCode) {
      alert("Inserisci o scansiona un codice QR.");
      return;
    }

    if (!location) {
      alert("GPS non disponibile. Attiva la localizzazione.");
      return;
    }

    setLoading(true);

    try {
      // simulazione salvataggio
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus(
        `✅ Pedana aggiornata!\nQR: ${qrCode}\nPosizione: ${location.lat}, ${location.lng}`
      );
    } catch (err) {
      setStatus("❌ Errore nel salvataggio.");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>📦 Pallet Tracker - Scan QR</h1>

      <p style={{ marginTop: 10 }}>
        Inserisci il codice QR della pedana (o scannerizzalo con la fotocamera).
      </p>

      <input
        type="text"
        placeholder="Inserisci codice QR..."
        value={qrCode}
        onChange={(e) => setQrCode(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 10,
          borderRadius: 10,
          border: "1px solid #ccc",
          fontSize: 16,
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 15,
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "none",
          background: "#0f172a",
          color: "white",
          fontSize: 16,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Salvataggio..." : "📍 Salva posizione pedana"}
      </button>

      <button
        onClick={getLocation}
        style={{
          marginTop: 10,
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #0f172a",
          background: "white",
          color: "#0f172a",
          fontSize: 16,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        🔄 Aggiorna GPS
      </button>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: "bold" }}>📡 Posizione attuale</h2>
        {location ? (
          <p>
            Lat: <b>{location.lat}</b> <br />
            Lng: <b>{location.lng}</b>
          </p>
        ) : (
          <p>❌ GPS non disponibile</p>
        )}
      </div>

      {status && (
        <pre
          style={{
            marginTop: 20,
            background: "#f3f4f6",
            padding: 15,
            borderRadius: 10,
            whiteSpace: "pre-wrap",
          }}
        >
          {status}
        </pre>
      )}
    </main>
  );
}
