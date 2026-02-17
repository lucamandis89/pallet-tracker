"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

type Camera = { id: string; label: string };

type HistoryItem = {
  id: string;
  qrCode: string;
  lat: number;
  lng: number;
  date: string;
};

const STORAGE_KEY = "pallet_history";

function readHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: HistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function appendHistory(item: HistoryItem) {
  const arr = readHistory();
  arr.push(item);
  writeHistory(arr);
}

function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocalizzazione non supportata"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");

  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasSavedThisScan, setHasSavedThisScan] = useState<boolean>(false);

  const config = useMemo(
    () => ({
      fps: 12,
      qrbox: { width: 260, height: 260 }, // ottimo per Android
      aspectRatio: 1.0,
      disableFlip: false,
    }),
    []
  );

  async function loadCameras() {
    try {
      const devices = await Html5Qrcode.getCameras();
      const list = (devices || []).map((d) => ({
        id: d.id,
        label: d.label || `Camera ${d.id.slice(0, 6)}`,
      }));
      setCameras(list);

      const back = list.find((c) => /back|rear|posteriore|environment/i.test(c.label));
      setCameraId((prev) => prev || back?.id || list[0]?.id || "");
    } catch (e: any) {
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
      console.error(e);
    }
  }

  async function stop() {
    try {
      if (!qrRef.current) return;
      const state = qrRef.current.getState?.();
      if (state === Html5QrcodeScannerState.NOT_STARTED) return;

      await qrRef.current.stop();
      await qrRef.current.clear();
      setIsRunning(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function onDecoded(decodedText: string) {
    // evita doppie letture finché non fai "Svuota"
    if (hasSavedThisScan) return;

    setLastResult(decodedText);
    setStatus(`✅ QR letto: ${decodedText}`);

    // Ferma scansione subito (stabilità)
    await stop();

    // GPS + salvataggio storico
    try {
      setStatus("📍 Recupero posizione GPS...");
      const g = await getGPS();
      setLat(g.lat);
      setLng(g.lng);

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());

      const item: HistoryItem = {
        id,
        qrCode: decodedText,
        lat: g.lat,
        lng: g.lng,
        date: new Date().toLocaleString(),
      };

      appendHistory(item);
      setHasSavedThisScan(true);
      setStatus("✅ Salvato nello storico!");
    } catch (e) {
      console.error(e);
      setStatus("⚠️ QR letto ma GPS non disponibile (permessi o segnale).");
      // salvataggio senza GPS? Per ora NO, così non sporchi lo storico.
    }
  }

  async function start() {
    if (!cameraId) {
      setStatus("⚠️ Nessuna camera selezionata.");
      return;
    }

    try {
      if (!qrRef.current) qrRef.current = new Html5Qrcode(readerId);

      const state = qrRef.current.getState?.();
      if (state === Html5QrcodeScannerState.SCANNING) return;

      setStatus("🔎 Scansione in corso...");
      setIsRunning(true);

      await qrRef.current.start(
        { deviceId: { exact: cameraId } },
        config,
        (decodedText) => {
          onDecoded(decodedText).catch(() => {});
        },
        () => {}
      );
    } catch (e: any) {
      console.error(e);

      // fallback: prova facingMode environment se deviceId fallisce
      try {
        setStatus("⚠️ Riprovo con camera posteriore...");
        setIsRunning(true);

        await qrRef.current?.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onDecoded(decodedText).catch(() => {});
          },
          () => {}
        );
      } catch (e2: any) {
        console.error(e2);
        setStatus("❌ Impossibile avviare la fotocamera (controlla permessi / prova Chrome).");
        setIsRunning(false);
      }
    }
  }

  async function clearResult() {
    setLastResult("");
    setLat(null);
    setLng(null);
    setHasSavedThisScan(false);
    setStatus("📷 Inquadra il QR della pedana");
  }

  useEffect(() => {
    loadCameras();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800 }}>🏠 Home</span>
          </Link>
          <Link href="/history" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800 }}>📜 Storico</span>
          </Link>
        </div>
      </div>

      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente nello storico.
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: "#f2f2f2",
          marginBottom: 12,
          fontWeight: 700,
          border: "1px solid #ddd",
        }}
      >
        Stato: {status}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", flex: "1 1 280px" }}
          disabled={isRunning}
        >
          {cameras.length === 0 ? (
            <option value="">Nessuna camera</option>
          ) : (
            cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))
          )}
        </select>

        <button
          onClick={() => (isRunning ? stop() : start())}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 800,
            cursor: "pointer",
            background: isRunning ? "#e53935" : "#1e88e5",
            color: "white",
            flex: "0 0 auto",
          }}
        >
          {isRunning ? "Ferma" : "Avvia"}
        </button>

        <button
          onClick={clearResult}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            fontWeight: 800,
            cursor: "pointer",
            background: "white",
          }}
        >
          Svuota
        </button>
      </div>

      {/* QR Reader */}
      <div
        style={{
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #ddd",
          background: "#000",
        }}
      >
        <div id={readerId} />
      </div>

      {/* Risultati */}
      {lastResult && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: "#e9f7ef",
            border: "2px solid #2e7d32",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          ✅ QR Rilevato:
          <div style={{ marginTop: 6, fontWeight: 900 }}>{lastResult}</div>
        </div>
      )}

      {lat !== null && lng !== null && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            background: "#e3f2fd",
            border: "2px solid #1565c0",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          📍 GPS Salvato:
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            Lat: {lat}
            <br />
            Lng: {lng}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Link href="/history" style={{ textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: "#1976d2",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            📜 Apri Storico
          </button>
        </Link>

        <Link href="/" style={{ textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ⬅ Torna alla Home
          </button>
        </Link>
      </div>
    </div>
  );
}
