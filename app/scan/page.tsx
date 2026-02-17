"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanPage() {
  const [status, setStatus] = useState("📷 Inquadra il QR della pedana");
  const [result, setResult] = useState<string | null>(null);

  const qrRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const qrRegionId = "qr-reader";

        if (!qrRef.current) {
          qrRef.current = new Html5Qrcode(qrRegionId);
        }

        if (isRunningRef.current) return;

        setStatus("📷 Avvio fotocamera...");
        isRunningRef.current = true;

        await qrRef.current.start(
          { facingMode: "environment" }, // FORZA CAMERA POSTERIORE
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            disableFlip: true,
          },
          async (decodedText) => {
            setResult(decodedText);
            setStatus("✅ QR letto: " + decodedText);

            // Ferma scanner subito dopo lettura
            if (qrRef.current && isRunningRef.current) {
              isRunningRef.current = false;
              await qrRef.current.stop();
              await qrRef.current.clear();
            }
          },
          () => {}
        );

        setStatus("📷 Inquadra il QR della pedana");
      } catch (err) {
        console.error(err);
        setStatus("❌ Errore fotocamera. Permessi negati o browser non supportato.");
        isRunningRef.current = false;
      }
    };

    startScanner();

    return () => {
      const stopScanner = async () => {
        try {
          if (qrRef.current && isRunningRef.current) {
            isRunningRef.current = false;
            await qrRef.current.stop();
            await qrRef.current.clear();
          }
        } catch (err) {
          console.log("Stop scanner error:", err);
        }
      };

      stopScanner();
    };
  }, []);

  const restartScanner = async () => {
    try {
      setResult(null);
      setStatus("🔄 Riavvio scanner...");

      if (qrRef.current) {
        try {
          await qrRef.current.stop();
          await qrRef.current.clear();
        } catch {}
      }

      qrRef.current = new Html5Qrcode("qr-reader");
      isRunningRef.current = false;

      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "26px", fontWeight: "bold" }}>
        📷 Scanner QR Pedane
      </h1>

      <p style={{ marginTop: "10px", fontSize: "16px" }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div
        style={{
          marginTop: "15px",
          padding: "12px",
          background: "#f4f4f4",
          borderRadius: "10px",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        Stato: {status}
      </div>

      <div style={{ marginTop: "20px" }}>
        <div
          id="qr-reader"
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "2px solid #ddd",
          }}
        ></div>
      </div>

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#d4edda",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "#155724",
          }}
        >
          ✅ Pedana scansionata: {result}
        </div>
      )}

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={restartScanner}
          style={{
            flex: 1,
            padding: "15px",
            borderRadius: "12px",
            border: "none",
            background: "#ff3b30",
            color: "white",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          🔄 Riavvia
        </button>

        <Link
          href="/"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "15px",
            borderRadius: "12px",
            background: "#007aff",
            color: "white",
            fontSize: "18px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          🏠 Home
        </Link>
      </div>
    </div>
  );
}
