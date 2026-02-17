"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ScanRecord = {
  palletId: string;
  timeISO: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
};

const STORAGE_KEY = "pallet-tracker-scans-v1";

function loadRecords(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records: ScanRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export default function ScanPage() {
  const [status, setStatus] = useState("Premi Avvia fotocamera");
  const [last, setLast] = useState<ScanRecord | null>(null);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [running, setRunning] = useState(false);

  const qrRegionId = "qr-reader";
  const qrRef = useRef<any>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  async function getGPS(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
    if (!("geolocation" in navigator)) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  async function saveScan(decodedText: string) {
    if (lockRef.current) return;
    lockRef.current = true;

    setStatus("QR letto! Recupero GPS...");

    const gps = await getGPS();

    const rec: ScanRecord = {
      palletId: decodedText.trim(),
      timeISO: new Date().toISOString(),
      lat: gps?.lat,
      lng: gps?.lng,
      accuracy: gps?.accuracy,
    };

    setLast(rec);

    const next = [rec, ...loadRecords()].slice(0, 300);
    saveRecords(next);
    setRecords(next);

    setStatus(gps ? "✅ Salvato con GPS" : "⚠️ Salvato ma GPS non disponibile");

    setTimeout(() => {
      lockRef.current = false;
    }, 2000);
  }

  async function startScanner() {
    try {
      setStatus("Avvio fotocamera...");
      setRunning(true);

      const mod = await import("html5-qrcode");
      const Html5Qrcode = (mod as any).Html5Qrcode;

      if (qrRef.current) {
        try {
          await qrRef.current.stop();
        } catch {}
        qrRef.current = null;
      }

      const qr = new Html5Qrcode(qrRegionId);
      qrRef.current = qr;

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText: string) => {
          try {
            await qr.stop();
          } catch {}

          setRunning(false);
          await saveScan(decodedText);
        },
        () => {}
      );

      setStatus("📷 Inquadra il QR della pedana");
    } catch (e) {
      setRunning(false);
      setStatus("❌ Errore avvio fotocamera. Controlla permessi / HTTPS.");
    }
  }

  async function stopScanner() {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        qrRef.current = null;
      }
    } catch {}

    setRunning(false);
    setStatus("Scanner fermato");
  }

  function clearHistory() {
    if (!confirm("Vuoi cancellare tutto lo storico?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setRecords([]);
    setLast(null);
    setStatus("Storico cancellato");
  }

  return (
    <main style={{ padding: 20, fontFamily: "Arial, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: "#0f172a" }}>📷 Scanner QR Pedane</h1>

        <Link href="/" style={{ textDecoration: "none", fontWeight: "bold", color: "#2563eb" }}>
          ← Home
        </Link>
      </div>

      <p style={{ marginTop: 10, color: "#334155" }}>
        Scansiona il QR della pedana. La posizione GPS viene salvata automaticamente nello storico.
      </p>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "white", border: "1px solid #e2e8f0" }}>
        <b>Stato:</b> {status}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        {!running ? (
          <button
            onClick={startScanner}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "#0f172a",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Avvia fotocamera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "#ef4444",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Ferma
          </button>
        )}

        <button
          onClick={clearHistory}
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "white",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Svuota
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "white", border: "1px solid #e2e8f0" }}>
        <div id={qrRegionId} style={{ width: "100%" }} />

        <p style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
          Nota: la fotocamera funziona solo se l’app è pubblicata in HTTPS (Vercel va benissimo).
        </p>
      </div>

      {last && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "white", border: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: "bold" }}>✅ Ultima scansione</h2>

          <div style={{ marginTop: 8, color: "#334155" }}>
            <div><b>Pedana:</b> {last.palletId}</div>
            <div><b>Data:</b> {new Date(last.timeISO).toLocaleString()}</div>

            {typeof last.lat === "number" && typeof last.lng === "number" ? (
              <>
                <div>
                  <b>GPS:</b> {last.lat.toFixed(6)}, {last.lng.toFixed(6)} (±{Math.round(last.accuracy ?? 0)}m)
                </div>

                <a
                  href={`https://www.google.com/maps?q=${last.lat},${last.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 10, color: "#2563eb", fontWeight: "bold" }}
                >
                  Apri su Google Maps →
                </a>
              </>
            ) : (
              <div><b>GPS:</b> non disponibile</div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "white", border: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: "bold" }}>📌 Storico scansioni</h2>

        {records.length === 0 ? (
          <p style={{ marginTop: 8, color: "#64748b" }}>Nessuna scansione salvata.</p>
        ) : (
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {records.slice(0, 20).map((r, idx) => (
              <li key={idx} style={{ marginBottom: 8, color: "#334155" }}>
                <b>{r.palletId}</b> — {new Date(r.timeISO).toLocaleString()}
                {typeof r.lat === "number" && typeof r.lng === "number"
                  ? ` — ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`
                  : " — (no GPS)"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
