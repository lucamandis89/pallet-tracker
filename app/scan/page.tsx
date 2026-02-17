"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Html5QrcodeScanner,
  Html5QrcodeScanType,
} from "html5-qrcode";

export default function ScanPage() {
  const [status, setStatus] = useState("📷 Inquadra il QR della pedana");
  const [result, setResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const qrRegionId = "qr-reader";

    // Evita doppio mount in dev / refresh
    if (scannerRef.current) return;

    setStatus("📷 Avvio fotocamera...");

    const scanner = new Html5QrcodeScanner(
      qrRegionId,
      {
        fps: 15,
        qrbox: { width: 300, height: 300 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],

        // ⭐️ Questo è IL boost su Android (usa il detector nativo se disponibile)
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },

        // Forza camera posteriore
        videoConstraints: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // Alcuni device accettano advanced:
          advanced: [{ focusMode: "continuous" } as any],
        } as any,
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        setResult(decodedText);
        setStatus("✅ QR letto: " + decodedText);

        // Ferma e rimuovi UI scanner
        try {
          await scanner.clear();
        } catch {}
      },
      () => {
        // ignora errori continui di scan (normale)
      }
    );

    setStatus("📷 Inquadra il QR della pedana");

    return () => {
      (async () => {
        try {
          await scanner.clear();
        } catch {}
      })();
      scannerRef.current = null;
    };
  }, []);

  const reset = async () => {
    setResult(null);
    setStatus("🔄 Riavvio...");

    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }

    // ricarica pulita
    window.location.reload();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: "bold" }}>📷 Scanner QR Pedane</h1>
        <Link href="/" style={{ textDecoration: "none", fontWeight: "bold" }}>← Home</Link>
      </div>

      <p style={{ marginTop: 10, fontSize: 16 }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div
        style={{
          marginTop: 15,
          padding: 12,
          background: "#f4f4f4",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        Stato: {status}
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          id="qr-reader"
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 12,
            overflow: "hidden",
            border: "2px solid #ddd",
            margin: "0 auto",
          }}
        />
      </div>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: "#d4edda",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: "bold",
            color: "#155724",
          }}
        >
          ✅ Pedana scansionata: {result}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button
          onClick={reset}
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 12,
            border: "none",
            background: "#ff3b30",
            color: "white",
            fontSize: 18,
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
            padding: 15,
            borderRadius: 12,
            background: "#007aff",
            color: "white",
            fontSize: 18,
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
