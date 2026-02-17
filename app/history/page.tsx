"use client";

import React, { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  code: string;
  lat?: number;
  lng?: number;
  date: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("pallet_history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  function clearHistory() {
    localStorage.removeItem("pallet_history");
    setHistory([]);
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>📌 Storico Pedane</h1>

      {history.length === 0 ? (
        <p style={{ fontSize: 16, opacity: 0.8 }}>Nessuna scansione salvata.</p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontWeight: 700 }}>Totale scansioni: {history.length}</p>

            <button
              onClick={clearHistory}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#e53935",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Cancella tutto
            </button>
          </div>

          {history.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #ddd",
                marginBottom: 12,
                background: "#f9f9f9",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>📦 {item.code}</div>
              <div style={{ marginTop: 6, fontSize: 14 }}>🕒 {item.date}</div>

              {item.lat && item.lng ? (
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  📍 GPS: {item.lat}, {item.lng}
                  <br />
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    style={{ fontWeight: 800 }}
                  >
                    Apri su Google Maps
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
                  GPS non disponibile
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
