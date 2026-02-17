"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

type Camera = { id: string; label: string };

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const config = useMemo(
    () => ({
      fps: 12,
      // qrbox più grande = più facile leggere (poi avvicini/allontani tu)
      qrbox: { width: 280, height: 280 },
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

      // prova a scegliere la camera “back” se esiste
      const back = list.find((c) => /back|rear|posteriore|environment/i.test(c.label));
      setCameraId((prev) => prev || back?.id || list[0]?.id || "");
    } catch (e: any) {
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
      console.error(e);
    }
  }

  async function start() {
    if (!cameraId) {
      setStatus("⚠️ Nessuna camera selezionata.");
      return;
    }

    try {
      if (!qrRef.current) qrRef.current = new Html5Qrcode(readerId);

      // se già running, non ripartire
      const state = qrRef.current.getState?.();
      if (state === Html5QrcodeScannerState.SCANNING) return;

      setStatus("🔎 Scansione in corso...");
      await qrRef.current.start(
        // camera specifica
        { deviceId: { exact: cameraId } },
        config,
        (decodedText) => {
          setLastResult(decodedText);
          setStatus("✅ QR letto correttamente!");
          // se vuoi che continui a leggere più volte, COMMENTA la riga sotto
          stop().catch(() => {});
        },
        () => {}
      );

      setIsRunning(true);
    } catch (e: any) {
      console.error(e);

      // fallback: prova facingMode environment se deviceId fallisce
      try {
        setStatus("⚠️ Riprovo con camera posteriore...");
        await qrRef.current?.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setLastResult(decodedText);
            setStatus("✅ QR letto correttamente!");
            stop().catch(() => {});
          },
          () => {}
        );
        setIsRunning(true);
      } catch (e2: any) {
        console.error(e2);
        setStatus("❌ Impossibile avviare la fotocamera (prova Chrome, permessi, o altra camera).");
        setIsRunning(false);
      }
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

  function clearResult() {
    setLastResult("");
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
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: "#f2f2f2",
          marginBottom: 12,
          fontWeight: 600,
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
            fontWeight: 700,
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
            fontWeight: 700,
            cursor: "pointer",
            background: "white",
            flex: "0 0 auto",
          }}
        >
          Svuota
        </button>
      </div>

      {/* CAMERA */}
      <div
        id={readerId}
        style={{
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #e5e5e5",
        }}
      />

      {/* RISULTATO */}
      {lastResult ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: "2px solid #2e7d32",
            background: "#e8f5e9",
            fontWeight: 800,
          }}
        >
          ✅ QR Rilevato:
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>{lastResult}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <a href="/" style={{ fontWeight: 800, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
