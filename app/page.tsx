// app/scan/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import Link from "next/link";

import {
  addHistory,
  getDefaultDepot,
  getDefaultShop,
  getDrivers,
  getShopOptions,
  movePalletViaScan,
  setLastScan,
  upsertPallet,
  StockLocationKind,
} from "../lib/storage";

type Camera = { id: string; label: string };

const PALLET_TYPES = ["EUR / EPAL", "CHEP", "LPR", "IFCO", "DUSS", "ROOL", "Altro"];

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");

  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [manualCode, setManualCode] = useState<string>("");

  // update form
  const [showUpdate, setShowUpdate] = useState(false);
  const [palletType, setPalletType] = useState(PALLET_TYPES[0]);
  const [qty, setQty] = useState<number>(1);
  const [toKind, setToKind] = useState<StockLocationKind>("NEGOZIO");
  const [toId, setToId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const drivers = useMemo(() => getDrivers(), []);
  const shops = useMemo(() => getShopOptions(), []);
  const depot = useMemo(() => getDefaultDepot(), []);
  const defaultShop = useMemo(() => getDefaultShop(), []);

  const config = useMemo(
    () => ({
      fps: 12,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
      disableFlip: false,
    }),
    []
  );

  async function getGps(): Promise<{ lat?: number; lng?: number; accuracy?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    });
  }

  function optionsFor(kind: StockLocationKind) {
    if (kind === "DEPOSITO") return [{ id: depot.id, label: depot.name }];
    if (kind === "AUTISTA") return drivers.map((d) => ({ id: d.id, label: d.name }));
    return shops.map((s) => ({ id: s.id, label: s.name }));
  }

  function ensureToId(kind: StockLocationKind) {
    const opts = optionsFor(kind);
    // default negozio: usa defaultShop se c’è
    if (kind === "NEGOZIO" && defaultShop?.id) return defaultShop.id;
    return opts[0]?.id || "";
  }

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
    } catch (e) {
      console.error(e);
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
    }
  }

  async function persistBasicScan(code: string, source: "qr" | "manual") {
    const clean = (code || "").trim();
    if (!clean) return;

    const gps = await getGps();
    const ts = Date.now();

    addHistory({
      code: clean,
      ts,
      lat: gps.lat,
      lng: gps.lng,
      accuracy: gps.accuracy,
      source,
    });

    setLastScan(clean);

    upsertPallet({
      code: clean,
      lastSeenTs: ts,
      lastLat: gps.lat,
      lastLng: gps.lng,
      lastAccuracy: gps.accuracy,
      lastSource: source,
    });
  }

  async function onGotCode(code: string, source: "qr" | "manual") {
    const clean = (code || "").trim();
    if (!clean) return;

    setLastResult(clean);
    setStatus(source === "qr" ? "✅ QR letto correttamente!" : "✅ Salvato manualmente!");
    await persistBasicScan(clean, source);

    setShowUpdate(true);
    setToId((prev) => prev || ensureToId(toKind));
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
      await qrRef.current.start(
        { deviceId: { exact: cameraId } },
        config,
        async (decodedText) => {
          const clean = (decodedText || "").trim();
          if (!clean) return;

          await onGotCode(clean, "qr");
          stop().catch(() => {});
        },
        () => {}
      );

      setIsRunning(true);
    } catch (e) {
      console.error(e);
      try {
        setStatus("⚠️ Riprovo con camera posteriore...");
        await qrRef.current?.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            const clean = (decodedText || "").trim();
            if (!clean) return;

            await onGotCode(clean, "qr");
            stop().catch(() => {});
          },
          () => {}
        );
        setIsRunning(true);
      } catch (e2) {
        console.error(e2);
        setStatus("❌ Impossibile avviare la fotocamera (controlla permessi/Chrome).");
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

  function clearAll() {
    setLastResult("");
    setStatus("📷 Inquadra il QR della pedana");
    setManualCode("");
    setShowUpdate(false);
    setQty(1);
    setPalletType(PALLET_TYPES[0]);
    setToKind("NEGOZIO");
    setToId("");
    setNote("");
  }

  async function saveManual() {
    const clean = manualCode.trim();
    if (!clean) {
      setStatus("⚠️ Inserisci un codice pedana.");
      return;
    }
    await onGotCode(clean, "manual");
  }

  async function saveUpdate() {
    if (!lastResult) {
      setStatus("⚠️ Nessuna pedana selezionata.");
      return;
    }
    const safeQty = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;

    // movimento: da Deposito -> destinazione scelta
    movePalletViaScan({
      palletCode: lastResult,
      palletType,
      qty: safeQty,
      fromKind: "DEPOSITO",
      fromId: depot.id,
      toKind,
      toId: toId || ensureToId(toKind),
      note: note.trim() || undefined,
    });

    setStatus("✅ Aggiornamento stock salvato!");
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
        Scansiona il QR della pedana. GPS e storico vengono salvati automaticamente.
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: "#f2f2f2",
          marginBottom: 12,
          fontWeight: 700,
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
          onClick={clearAll}
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

      <div
        id={readerId}
        style={{
          width: "100%",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e6e6e6",
          marginBottom: 12,
        }}
      />

      {/* Manual */}
      <div
        style={{
          border: "2px solid #f0c27b",
          background: "#fff7e6",
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Es: PEDANA-000123"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            fontSize: 16,
            marginBottom: 10,
          }}
        />
        <button
          onClick={saveManual}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            background: "#f57c00",
            color: "white",
            width: "100%",
          }}
        >
          Salva manuale
        </button>
      </div>

      {/* Result */}
      {lastResult && (
        <div
          style={{
            border: "2px solid #2e7d32",
            background: "#e8f5e9",
            borderRadius: 16,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 900 }}>✅ Pedana:</div>
          <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: 1 }}>{lastResult}</div>
        </div>
      )}

      {/* Update + Stock */}
      {showUpdate && lastResult && (
        <div
          style={{
            border: "2px solid #1e88e5",
            background: "#e3f2fd",
            borderRadius: 16,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 1000, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Tipo pedana</div>
              <select
                value={palletType}
                onChange={(e) => setPalletType(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
              >
                {PALLET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Quantità</div>
              <input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Dove si trova ORA?</div>
              <select
                value={toKind}
                onChange={(e) => {
                  const k = e.target.value as StockLocationKind;
                  setToKind(k);
                  setToId(ensureToId(k));
                }}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
              >
                <option value="NEGOZIO">Negozio</option>
                <option value="AUTISTA">Autista</option>
                <option value="DEPOSITO">Deposito</option>
              </select>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Seleziona</div>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
              >
                {optionsFor(toKind).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Note</div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Facoltative"
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={saveUpdate}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                cursor: "pointer",
                background: "#2e7d32",
                color: "white",
              }}
            >
              Salva aggiornamento
            </button>

            <button
              onClick={() => setShowUpdate(false)}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                fontWeight: 900,
                cursor: "pointer",
                background: "#616161",
                color: "white",
              }}
            >
              Più tardi
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Link
              href="/stock"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 12,
                fontWeight: 900,
                background: "#6a1b9a",
                color: "white",
                textDecoration: "none",
              }}
            >
              Apri Stock
            </Link>

            <Link
              href="/history"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 12,
                fontWeight: 900,
                background: "#283593",
                color: "white",
                textDecoration: "none",
              }}
            >
              Apri Storico
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800 }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
