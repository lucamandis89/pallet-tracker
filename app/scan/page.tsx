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

  // manual
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

  async function applyUpdate() {
    if (!lastResult) return alert("Nessuna pedana letta.");
    const qn = Number(qty);
    if (!Number.isFinite(qn) || qn <= 0) return alert("Quantità non valida.");
    if (!palletType) return alert("Tipo pedana mancante.");

    const finalToId = toId || ensureToId(toKind);
    if (!finalToId) return alert("Seleziona una destinazione.");

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
      note: note.trim() || undefined,
    });

    setStatus(`✅ Aggiornato Stock: ${from.kind} → ${to.kind}`);
    setShowUpdate(false);
  }

  useEffect(() => {
    loadCameras();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // quando cambia tipo destinazione, pre-seleziona il primo
    setToId(ensureToId(toKind));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toKind]);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR della pedana. Se il QR è rovinato puoi inserire il codice manualmente.
      </p>

      <div style={statusBox()}>Stato: {status}</div>

      <div style={{ display: "grid", gap: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={selectStyle()}
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => (isRunning ? stop() : start())} style={btn(isRunning ? "#e53935" : "#1e88e5")}>
            {isRunning ? "Ferma" : "Avvia"}
          </button>
          <button onClick={clearAll} style={btnOutline()}>
            Svuota
          </button>
          <a href="/" style={linkStyle()}>
            ← Torna alla Home
          </a>
        </div>

        <div id={readerId} style={{ width: "100%", borderRadius: 14, overflow: "hidden" }} />

        <div style={box("#fff3e0", "#ffcc80")}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Es: PEDANA-000123"
            style={inputStyle()}
          />
          <button onClick={saveManual} style={{ ...btn("#fb8c00"), marginTop: 10 }}>
            Salva manuale
          </button>
        </div>

        {lastResult ? (
          <div style={box("#e8f5e9", "#81c784")}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>✅ Pedana:</div>
            <div style={{ fontWeight: 900, fontSize: 34, letterSpacing: 1 }}>{lastResult}</div>
          </div>
        ) : null}

        {showUpdate ? (
          <div style={box("#e3f2fd", "#64b5f6")}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={label()}>Tipo pedana</div>
                <select value={palletType} onChange={(e) => setPalletType(e.target.value)} style={selectStyle()}>
                  {PALLET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={label()}>Quantità</div>
                <input
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  type="number"
                  min={1}
                  style={inputStyle()}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={label()}>Dove si trova ORA?</div>
                <select value={toKind} onChange={(e) => setToKind(e.target.value as StockLocationKind)} style={selectStyle()}>
                  <option value="NEGOZIO">Negozio</option>
                  <option value="DEPOSITO">Deposito</option>
                  <option value="AUTISTA">Autista</option>
                </select>
              </div>

              <div>
                <div style={label()}>Seleziona</div>
                <select value={toId} onChange={(e) => setToId(e.target.value)} style={selectStyle()}>
                  {optionsFor(toKind).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={label()}>Note</div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltative" style={inputStyle()} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button onClick={applyUpdate} style={btn("#2e7d32")}>
                Salva aggiornamento
              </button>
              <button onClick={() => setShowUpdate(false)} style={btn("#616161")}>
                Più tardi
              </button>
              <a href="/stock" style={{ ...btn("#6a1b9a"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Apri Stock
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const statusBox = (): React.CSSProperties => ({
  padding: 12,
  borderRadius: 12,
  background: "#f2f2f2",
  marginBottom: 12,
  fontWeight: 700,
});

const box = (bg: string, border: string): React.CSSProperties => ({
  padding: 14,
  borderRadius: 16,
  background: bg,
  border: `2px solid ${border}`,
});

const btn = (bg: string): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: bg,
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  minWidth: 140,
});

const btnOutline = (): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
  minWidth: 140,
});

const selectStyle = (): React.CSSProperties => ({
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  width: "100%",
  background: "white",
  fontWeight: 800,
});

const inputStyle = (): React.CSSProperties => ({
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  width: "100%",
  background: "white",
  fontWeight: 800,
});

const label = (): React.CSSProperties => ({ fontWeight: 900, marginBottom: 6, opacity: 0.85 });

const linkStyle = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
