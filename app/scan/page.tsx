"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanPage() {
  const [status, setStatus] = useState("📷 Inquadra il QR della pedana");
  const [scanning, setScanning] = useState(false);
  const [lastQr, setLastQr] = useState<string | null>(null);

  const qrRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {});
        qrRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const startScan = async () => {
    if (scanning) return;

    setStatus("📷 Avvio fotocamera...");
    setScanning(true);

    try {
      if (!qrRef.current) {
        qrRef.current = new Html5Qrcode("reader");
      }

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
      };

      await qrRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (!decodedText) return;

          setLastQr(decodedText);
          setStatus(`✅ QR letto: ${decodedText}`);

          // prova a salvare posizione GPS
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                const data = {
                  qr: decodedText,
                  lat,
                  lon,
                  timestamp: new Date().toISOString(),
                };

                console.log("POSIZIONE SALVATA:", data);

                setStatus(
                  `✅ QR letto: ${decodedText}\n📍 GPS salvato: ${lat.toFixed(
                    6
                  )}, ${lon.toFixed(6)}`
                );
              },
              () => {
                setStatus(`✅ QR letto: ${decodedText}\n⚠️ GPS non disponibile`);
              }
            );
          } else {
            setStatus(`✅ QR letto: ${decodedText}\n⚠️ GPS non supportato`);
          }
        },
        () => {}
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ Errore avvio scanner. Controlla permessi fotocamera.");
      setScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
      }
    } catch (err) {
      console.log(err);
    }

    setScanning(false);
    setStatus("🛑 Scanner fermato");
  };

  const reset = () => {
    setLastQr(null);
    setStatus("📷 Inquadra il QR della pedana");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>
        📷 Scanner QR Pedane
      </h1>

      <p style={{ fontSize: "18px" }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata
        automaticamente.
      </p>

      <div
        style={{
          background: "#f1f5f9",
          padding: "15px",
          borderRadius: "12px",
          marginTop: "15px",
          fontSize: "18px",
          whiteSpace: "pre-line",
        }}
      >
        <b>Stato:</b> {status}
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={startScan}
          disabled={scanning}
          style={{
            padding: "14px 20px",
            fontSize: "18px",
            borderRadius: "12px",
            border: "none",
            background: scanning ? "#94a3b8" : "#16a34a",
            color: "white",
            cursor: scanning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          ▶ Avvia Scanner
        </button>

        <button
          onClick={stopScan}
          style={{
            padding: "14px 20px",
            fontSize: "18px",
            borderRadius: "12px",
            border: "none",
            background: "#dc2626",
            color: "white",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          ⛔ Ferma
        </button>

        <button
          onClick={reset}
          style={{
            padding: "14px 20px",
            fontSize: "18px",
            borderRadius: "12px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          🔄 Reset
        </button>
      </div>

      <div
        id="reader"
        style={{
          width: "100%",
          maxWidth: "500px",
          marginTop: "25px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      ></div>

      {lastQr && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            background: "#e0f2fe",
            fontSize: "18px",
          }}
        >
          <b>Ultimo QR letto:</b> {lastQr}
        </div>
      )}

      <div style={{ marginTop: "25px" }}>
        <a
          href="/"
          style={{
            fontSize: "18px",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
