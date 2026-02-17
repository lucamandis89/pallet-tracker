"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

export default function ScanPage() {
  const qrRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  const [status, setStatus] = useState("📷 Inquadra il QR della pedana");
  const [result, setResult] = useState<string>("");
  const [debug, setDebug] = useState<string>("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const id = "reader";
    const qr = new Html5Qrcode(id);
    qrRef.current = qr;

    (async () => {
      try {
        setStatus("⏳ Avvio fotocamera...");
        await qr.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 260, height: 260 },
            // IMPORTANTISSIMO su Android: usa BarcodeDetector se c'è
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
            // prova a dare più qualità al video
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => {
            setResult(decodedText);
            setStatus("✅ QR letto!");
            // ferma dopo lettura
            qr.stop().catch(() => {});
          },
          (err) => {
            // non spammare: salva solo ogni tanto
            if (typeof err === "string" && err.toLowerCase().includes("no qr")) return;
            setDebug(String(err).slice(0, 200));
          }
        );

        setStatus("📷 Inquadra il QR della pedana (prova più vicino e senza riflessi)");
      } catch (e: any) {
        setStatus("❌ Errore avvio camera");
        setDebug(e?.message ? String(e.message) : String(e));
      }
    })();

    return () => {
      qrRef.current?.stop().catch(() => {});
      qrRef.current?.clear().catch(() => {});
      qrRef.current = null;
      startedRef.current = false;
    };
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <h1>📷 Scanner QR Pedane</h1>
      <p>Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.</p>

      <div style={{ background: "#f2f2f2", padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <b>Stato:</b> {status}
      </div>

      <div
        id="reader"
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          borderRadius: 16,
          overflow: "hidden",
        }}
      />

      {result && (
        <div style={{ marginTop: 14, background: "#d4edda", padding: 12, borderRadius: 10 }}>
          <b>QR:</b> <div style={{ fontSize: 18, fontWeight: 700 }}>{result}</div>
        </div>
      )}

      {debug && (
        <div style={{ marginTop: 10, background: "#fff3cd", padding: 10, borderRadius: 10 }}>
          <b>Debug:</b> {debug}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href="/" style={{ color: "blue", textDecoration: "none" }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
