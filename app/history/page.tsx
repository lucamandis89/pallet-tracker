"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type HistoryItem = {
  id: string;
  qrCode: string;
  lat: number;
  lng: number;
  date: string;
};

const STORAGE_KEY = "pallet_history";

function saveToHistory(item: HistoryItem) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const arr: HistoryItem[] = raw ? JSON.parse(raw) : [];
  arr.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

export default function ScanPage() {
  const scannerRef = useRef<any>(null);
  const html5QrCodeRef = useRef<any>(null);

  const [status, setStatus] = useState("📷 Inquadra il QR della pedana");
  const [qr, setQr] = useState<string>("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const dateString = useMemo(() => new Date().toLocaleString(), [qr, lat, lng]);

  const getGPS = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalizzazione non supportata"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;

        const { Html5Qrcode } = mod;

        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;

        setStatus("📷 Avvio fotocamera...");
        setIsRunning(true);

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 220, height: 220 } },
          async (decodedText: string) => {
            // Evita doppie letture
            if (qr) return;

            setQr(decodedText);
            setStatus("✅ QR letto correttamente!");

            // Ferma subito la scansione per non rileggerlo
            try {
              await html5QrCode.stop();
              await html5QrCode.clear();
              setIsRunning(false);
            } catch {}

            // GPS
            try {
              setStatus("📍 Recupero posizione GPS...");
              const g = await getGPS();
              setLat(g.lat);
              setLng(g.lng);

              // Salva storico
              const item: HistoryItem = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                qrCode: decodedText,
                lat: g.lat,
                lng: g.lng,
                date: new Date().toLocaleString(),
              };

              saveToHistory(item);
              setStatus("✅ Salvato in storico!");
            } catch (e) {
              setStatus("⚠ GPS non disponibile o permesso negato");
            }
          },
          () => {
            // onScanFailure: non fare nulla (evita spam in console)
          }
        );
      } catch (e) {
        setStatus("❌ Errore avvio scanner (controlla permessi fotocamera)");
        setIsRunning(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      const html5QrCode = html5QrCodeRef.current;
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = async () => {
    // Ricarica la pagina per ripartire pulito (semplice e affidabile)
    window.location.reload();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>📷 Scanner QR Pedane</h1>
      <p style={{ color: "#444", marginTop: 8 }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: "#f2f2f2",
          border: "1px solid #ddd",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Stato: {status}
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          id="qr-reader"
          ref={scannerRef as any}
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid #ddd",
          }}
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={reset}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "#e53935",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          🔄 Riparti
        </button>

        <Link href="/history">
          <button
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "#1976d2",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            📜 Vai allo Storico
          </button>
        </Link>

        <Link href="/">
          <button
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #ccc",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ⬅ Torna alla Home
          </button>
        </Link>
      </div>

      {qr && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            background: "#e9f7ef",
            border: "2px solid #2e7d32",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          ✅ QR Rilevato: <div style={{ marginTop: 6 }}>{qr}</div>
        </div>
      )}

      {lat !== null && lng !== null && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 14,
            background: "#e3f2fd",
            border: "2px solid #1565c0",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          📍 GPS Salvato:
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            Lat: {lat} <br />
            Lng: {lng} <br />
            Data: {dateString}
          </div>
        </div>
      )}

      {isRunning && (
        <p style={{ marginTop: 10, color: "#777" }}>
          Se non legge, prova ad avvicinare/allontanare e a mettere più luce.
        </p>
      )}
    </div>
  );
}
