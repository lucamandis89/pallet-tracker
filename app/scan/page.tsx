// app/scan/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import {
  addHistory,
  getDefaultDepot,
  getDrivers,
  getShopOptions,
  movePalletViaScan,
  setLastScan,
  StockLocationKind,
  getDepotOptions,
} from "../lib/storage";

type Camera = { id: string; label: string };

const PALLET_TYPES = ["EUR / EPAL", "CHEP", "LPR", "IFCO", "ALTRO"];

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [status, setStatus] = useState("Pronto");
  const [isRunning, setIsRunning] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState("");

  const [lastResult, setLastResult] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);

  const [manualCode, setManualCode] = useState("");

  const [palletType, setPalletType] = useState(PALLET_TYPES[0]);
  const [qty, setQty] = useState<number>(1);

  const [toKind, setToKind] = useState<StockLocationKind>("NEGOZIO");
  const [toId, setToId] = useState("");

  const [note, setNote] = useState("");

  const hasCamera = useMemo(() => {
    return !(typeof navigator === "undefined" || !navigator.mediaDevices);
  }, []);

  async function loadCameras() {
    if (!hasCamera) {
      setStatus("⚠️ Camera non disponibile su questo dispositivo/browser.");
      return;
    }
    try {
      const devices = await Html5Qrcode.getCameras();
      const mapped: Camera[] = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
      setCameras(mapped);
      setCameraId(mapped[0]?.id || "");
    } catch {
      setStatus("⚠️ Permessi camera non concessi o camera non disponibile.");
    }
  }

  async function start() {
    if (isRunning) return;
    if (!cameraId) {
      setStatus("⚠️ Seleziona una camera.");
      return;
    }
    try {
      const qr = new Html5Qrcode(readerId);
      qrRef.current = qr;

      setStatus("Avvio scanner...");
      await qr.start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          const clean = decodedText.trim();
          if (!clean) return;
          await onGotCode(clean, "qr");
        },
        () => {}
      );

      setIsRunning(true);
      setStatus("Scanner attivo: inquadra il QR.");
    } catch (e: any) {
      setStatus("❌ Errore avvio scanner: " + (e?.message || "sconosciuto"));
      setIsRunning(false);
    }
  }

  async function stop() {
    try {
      const qr = qrRef.current;
      if (qr && qr.getState() === Html5QrcodeScannerState.SCANNING) {
        await qr.stop();
      }
      qrRef.current = null;
    } catch {
      // ignore
    } finally {
      setIsRunning(false);
      setStatus("Fermato.");
    }
  }

  function clearAll() {
    setLastResult("");
    setShowUpdate(false);
    setManualCode("");
    setNote("");
    setStatus("Pronto");
  }

  function optionsFor(kind: StockLocationKind) {
    if (kind === "NEGOZIO") return getShopOptions();
    if (kind === "DEPOSITO") return getDepotOptions();
    return getDrivers().map((d) => ({ id: d.id, label: d.name }));
  }

  function ensureToId(kind: StockLocationKind) {
    const opts = optionsFor(kind);
    if (opts.length > 0) return opts[0].id;

    // fallback intelligenti
    if (kind === "NEGOZIO") return getShopOptions()[0]?.id || "";
    if (kind === "DEPOSITO") return getDefaultDepot().id;
    return "";
  }

  async function getGps(): Promise<{ lat?: number; lng?: number; accuracy?: number }> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return {};
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  }

  async function onGotCode(code: string, source: "qr" | "manual") {
    setLastResult(code);
    setLastScan(code);
    setShowUpdate(true);
    setStatus(source === "qr" ? "✅ QR letto" : "✅ Codice inserito");

    // Preseleziona destinazione se mancante
    const initial = ensureToId(toKind);
    if (!toId && initial) setToId(initial);
  }

  async function saveManual() {
    const clean = manualCode.trim();
    if (!clean) {
      setStatus("⚠️ Inserisci un codice pedana.");
      return;
    }
    await onGotCode(clean, "manual");
  }

  async function applyUpdate() {
    if (!lastResult) return alert("Nessuna pedana letta.");
    const qn = Number(qty);
    if (!Number.isFinite(qn) || qn <= 0) return alert("Quantità non valida.");
    if (!palletType) return alert("Tipo pedana mancante.");

    const finalToId = toId || ensureToId(toKind);
    if (!finalToId) return alert("Seleziona una destinazione.");

    try {
      const { from, to } = movePalletViaScan({
        code: lastResult,
        palletType,
        qty: qn,
        toKind,
        toId: finalToId,
        note: note.trim() || undefined,
      });

      const gps = await getGps();
      addHistory({
        code: lastResult,
        ts: Date.now(),
        lat: gps.lat,
        lng: gps.lng,
        accuracy: gps.accuracy,
        source: "qr",
        declaredKind: to.kind,
        declaredId: to.id,
        palletType,
        qty: qn,
      });

      setStatus(`✅ Aggiornato Stock: ${from.kind} → ${to.kind}`);
      setShowUpdate(false);
      setNote("");
    } catch (e: any) {
      alert("Errore aggiornamento: " + (e?.message || "sconosciuto"));
    }
  }

  useEffect(() => {
    loadCameras();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const opts = optionsFor(toKind);
    if (!opts.find((o) => o.id === toId)) setToId(opts[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toKind]);

  const input: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  const btn = (bg: string): React.CSSProperties => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card = (bg: string, border: string): React.CSSProperties => ({
    padding: 14,
    borderRadius: 16,
    background: bg,
    border: `2px solid ${border}`,
    marginTop: 12,
  });

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR (o inserisci manualmente). Poi aggiorna subito Stock e posizione.
      </p>

      <div style={{ padding: 12, borderRadius: 12, background: "#f2f2f2", marginBottom: 12, fontWeight: 800 }}>
        Stato: {status}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={{ ...input, flex: "1 1 280px" }}
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

        <button onClick={() => (isRunning ? stop() : start())} style={btn(isRunning ? "#e53935" : "#1e88e5")}>
          {isRunning ? "Ferma" : "Avvia"}
        </button>

        <button onClick={clearAll} style={btn("#616161")}>
          Svuota
        </button>
      </div>

      <div id={readerId} style={{ width: "100%", borderRadius: 18, overflow: "hidden" }} />

      <div style={card("#fff7e6", "#ffd28a")}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Es: PEDANA-000123"
            style={{ ...input, flex: "1 1 240px" }}
          />
          <button onClick={saveManual} style={btn("#fb8c00")}>
            Salva manuale
          </button>
        </div>
      </div>

      {lastResult ? (
        <div style={card("#e8f5e9", "#2e7d32")}>
          <div style={{ fontWeight: 900 }}>✅ Pedana:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{lastResult}</div>
        </div>
      ) : null}

      {showUpdate ? (
        <div style={card("#e3f2fd", "#1e88e5")}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Tipo pedana</div>
              <select value={palletType} onChange={(e) => setPalletType(e.target.value)} style={input}>
                {PALLET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Quantità</div>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                style={input}
                inputMode="numeric"
              />
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Dove si trova ORA?</div>
              <select value={toKind} onChange={(e) => setToKind(e.target.value as StockLocationKind)} style={input}>
                <option value="DEPOSITO">Deposito</option>
                <option value="NEGOZIO">Negozio</option>
                <option value="AUTISTA">Autista</option>
              </select>
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Seleziona</div>
              <select value={toId} onChange={(e) => setToId(e.target.value)} style={input}>
                {optionsFor(toKind).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                ✅ Se non hai ancora creato negozi, usa “Negozio Principale” (default).
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltative" style={input} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={applyUpdate} style={btn("#2e7d32")}>
              Salva aggiornamento
            </button>
            <button onClick={() => setShowUpdate(false)} style={btn("#616161")}>
              Più tardi
            </button>
            <a href="/stock" style={{ ...btn("#6a1b9a"), textDecoration: "none", display: "inline-flex" }}>
              Apri Stock
            </a>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/stock" style={{ textDecoration: "none", fontWeight: 900 }}>
          📦 Stock
        </a>
        <a href="/" style={{ textDecoration: "none", fontWeight: 900 }}>
          ← Home
        </a>
      </div>
    </div>
  );
}
