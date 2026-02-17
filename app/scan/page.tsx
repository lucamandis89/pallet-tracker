"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

export default function ScannerPage() {
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0], // solo camera
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setResult(decodedText);
        scanner.clear(); // ferma scanner dopo lettura
      },
      (error) => {
        // ignora errori continui, serve solo debug
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>📷 Scanner QR Pedane</h1>

      <p>Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.</p>

      <div
        id="reader"
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "20px auto",
          borderRadius: "15px",
          overflow: "hidden",
        }}
      />

      {result && (
        <div
          style={{
            background: "#d4edda",
            padding: "15px",
            borderRadius: "10px",
            marginTop: "20px",
          }}
        >
          <h3>✅ QR letto:</h3>
          <p style={{ fontSize: "18px", fontWeight: "bold" }}>{result}</p>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "blue" }}>
          ⬅ Torna alla Home
        </Link>
      </div>
    </div>
  );
}
