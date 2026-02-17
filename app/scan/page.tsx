"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

export default function ScanPage() {
  const [result, setResult] = useState<string>("");
  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    const startScanner = () => {
      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
      };

      scanner = new Html5QrcodeScanner("reader", config, false);

      scanner.render(
        (decodedText) => {
          setResult(decodedText);
          setStatus("✅ QR letto correttamente!");

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                setGps({ lat, lng });
                setStatus("📍 Posizione GPS salvata!");

                const savedData = {
                  qr: decodedText,
                  lat,
                  lng,
                  time: new Date().toISOString(),
                };

                const old = localStorage.getItem("scan_history");
                const history = old ? JSON.parse(old) : [];
                history.unshift(savedData);

                localStorage.setItem("scan_history", JSON.stringify(history));
              },
              () => {
                setError("⚠️ GPS non disponibile o permesso negato.");
              }
            );
          } else {
            setError("⚠️ Geolocalizzazione non supportata.");
          }
        },
        () => {}
      );
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>
        📷 Scanner QR Pedane
      </h1>

      <p style={{ fontSize: "18px", marginTop: "10px" }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          borderRadius: "12px",
          border: "1px solid #ccc",
          background: "#f7f7f7",
          fontSize: "18px",
        }}
      >
        <b>Stato:</b> {status}
      </div>

      <div style={{ marginTop: "20px" }}>
        <div
          id="reader"
          style={{
            width: "100%",
            maxWidth: "450px",
            margin: "0 auto",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        ></div>
      </div>

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            border: "1px solid #16a34a",
            background: "#dcfce7",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>
            ✅ QR Rilevato:
          </h2>
          <p style={{ fontSize: "18px" }}>{result}</p>
        </div>
      )}

      {gps && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            border: "1px solid #2563eb",
            background: "#dbeafe",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>
            📍 GPS Salvato:
          </h2>
          <p style={{ fontSize: "18px" }}>
            Lat: {gps.lat} <br />
            Lng: {gps.lng}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            border: "1px solid #dc2626",
            background: "#fee2e2",
          }}
        >
          <b>Errore:</b> {error}
        </div>
      )}

      <div style={{ marginTop: "25px" }}>
        <Link href="/" style={{ fontSize: "18px", color: "#2563eb" }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
