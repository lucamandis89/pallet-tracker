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
  upsertPallet,
} from "../lib/storage";

type Camera = { id: string; label: string };

const PALLET_TYPES = [
  "EUR / EPAL",
  "CHEP",
  "LPR",
  "IFCO",
  "CP1 (Plastica)",
  "CP2 (Plastica)",
  "Altro",
];

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // manual entry (QR rovinato)
  const [manual, setManual] = useState("");

  // update stock form
  const [palletType, setPalletType] = useState(PALLET_TYPES[0]);
  const [qty, setQty] = useState<number>(1);
  const [whereKind, setWhereKind] = useState<StockLocationKind>("NEGOZIO");
  const [whereId, setWhereId] = useState<string>(getShopOptions()[0]?.id || "");
  const [note, setNote] = useState<string>("");

  const shopOptions = useMemo(() => getShopOptions(), []);
  const driverOptions = useMemo(() => getDrivers(), []);
  const depotDefault = useMemo(() => getDefaultDepot(), []);

  // mantiene whereId valido quando cambi "kind"
  useEffect(() => {
    if (whereKind === "NEGOZIO") setWhereId(getShopOptions()[0]?.id || "");
    if (whereKind === "AUTISTA") setWhereId(getDrivers()[0]?.id || "");
    if (whereKind === "DEPOSITO") setWhereId(getDefaultDepot()?.id || "");
  }, [whereKind]);

  const config = useMemo(
    () => ({
      fps: 12,
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

      const back = list.find((c) => /back|rear|posteriore|environment/i.test(c.label));
      setCameraId((prev) => prev || back?.id || list[0]?.id || "");
    } catch (e: any) {
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
      console.error(e);
    }
  }

  function saveHistoryAndGps(qr: string) {
    // salva subito “senza GPS” (poi se arriva GPS aggiorniamo note)
    addHistory(qr);
    setLastScan(qr);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addHistory(qr, pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // se GPS negato non blocchiamo nulla
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
        (decodedText) => {
          setLastResult(decodedText);
          setStatus("✅ QR letto correttamente!");
          saveHistoryAndGps(decodedText);

          // registra pedana se non esiste (almeno per storico)
          upsertPallet({ id: decodedText, type: palletType, lastSeenTs: Date.now() });

          stop().catch(() => {});
        },
        () => {}
      );

      setIsRunning(true);
    } catch (e: any) {
      console.error(e);
      try {
        setStatus("⚠️ Riprovo con camera posteriore...");
        await qrRef.current?.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setLastResult(decodedText);
            setStatus("✅ QR letto correttamente!");
            saveHistoryAndGps(decodedText);
            upsertPallet({ id: decodedText, type: palletType, lastSeenTs: Date.now() });
            stop().catch(() => {});
          },
          () => {}
        );
        setIsRunning(true);
      } catch (e2: any) {
        console.error(e2);
        setStatus("❌ Impossibile avviare la fotocamera (controlla permessi / Chrome).");
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

  function saveManual() {
    const code = manual.trim();
    if (!code) return;
    setLastResult(code);
    setStatus("✅ Salvato manualmente!");
    saveHistoryAndGps(code);
    upsertPallet({ id: code, type: palletType, lastSeenTs: Date.now() });
    setManual("");
  }

  function saveUpdate() {
    if (!lastResult) {
      alert("Prima scansiona (o inserisci) una pedana.");
      return;
    }
    if (!whereId) {
      alert("Seleziona dove si trova ORA (negozio/autista/deposito).");
      return;
    }

    movePalletViaScan({
      palletId: lastResult,
      palletType,
      qty,
      toKind: whereKind,
      toId: whereId,
      note: note.trim() || undefined,
    });

    setStatus("✅ Aggiornamento salvato (posizione + stock).");
  }

  useEffect(() => {
    loadCameras();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectOptions =
    whereKind === "NEGOZIO"
      ? shopOptions
      : whereKind === "AUTISTA"
      ? driverOptions
      : [{ id: depotDefault?.id || "depot_1", name: depotDefault?.name || "Deposito" }];

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR della pedana. Lo storico salva anche GPS (se permesso).
      </p>

      <div style={statusBox()}>
        <b>Stato:</b> {status}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={selectStyle()}
          disabled={isRunning}
        >
          {cameras.length === 0 ? <option value="">Nessuna camera</option> : null}
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <button onClick={() => (isRunning ? stop() : start())} style={btn(isRunning ? "#e53935" : "#1e88e5")}>
          {isRunning ? "Ferma" : "Avvia"}
        </button>

        <button onClick={clearResult} style={btnOutline()}>
          Svuota
        </button>
      </div>

      <div id={readerId} style={{ width: "100%", maxWidth: 520, margin: "0 auto" }} />

      {/* manual */}
      <div style={warnBox()}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Es: PEDANA-000123"
          style={inputStyle()}
        />
        <button onClick={saveManual} style={btn("#fb8c00")}>
          Salva manuale
        </button>
      </div>

      {lastResult ? (
        <div style={okBox()}>
          <div style={{ fontWeight: 900 }}>✅ Pedana:</div>
          <div style={{ fontSize: 34, fontWeight: 1000, marginTop: 4 }}>{lastResult}</div>
        </div>
      ) : null}

      {/* update */}
      <div style={blueBox()}>
        <div style={{ fontWeight: 1000, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={lbl()}>Tipo pedana</div>
            <select value={palletType} onChange={(e) => setPalletType(e.target.value)} style={selectStyle()}>
              {PALLET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={lbl()}>Quantità</div>
            <input
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
              style={inputStyle()}
            />
          </div>

          <div>
            <div style={lbl()}>Dove si trova ORA?</div>
            <select value={whereKind} onChange={(e) => setWhereKind(e.target.value as StockLocationKind)} style={selectStyle()}>
              <option value="NEGOZIO">Negozio</option>
              <option value="AUTISTA">Autista</option>
              <option value="DEPOSITO">Deposito</option>
            </select>
          </div>

          <div>
            <div style={lbl()}>Seleziona</div>
            <select value={whereId} onChange={(e) => setWhereId(e.target.value)} style={selectStyle()}>
              {selectOptions.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              {selectOptions.length === 0 ? <option value="">(Nessuna voce)</option> : null}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={lbl()}>Note</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltative" style={inputStyle()} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={saveUpdate} style={btn("#2e7d32")}>
            Salva aggiornamento
          </button>
          <a href="/stock" style={{ ...btn("#6a1b9a"), textDecoration: "none", display: "inline-block" }}>
            Apri Stock
          </a>
          <a href="/history" style={{ ...btn("#5e35b1"), textDecoration: "none", display: "inline-block" }}>
            Apri Storico
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <a href="/" style={homeLink()}>
          ← Torna alla Home
        </a>
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

const selectStyle = (): React.CSSProperties => ({
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  width: "100%",
});

const inputStyle = (): React.CSSProperties => ({
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  width: "100%",
  marginBottom: 10,
  fontWeight: 800,
});

const btn = (bg: string): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  fontWeight: 900,
  cursor: "pointer",
  background: bg,
  color: "white",
});

const btnOutline = (): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  fontWeight: 900,
  cursor: "pointer",
  background: "white",
});

const homeLink = (): React.CSSProperties => ({
  fontWeight: 900,
  textDecoration: "none",
  color: "#1e88e5",
});

const warnBox = (): React.CSSProperties => ({
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  border: "2px solid #f5c27a",
  background: "#fff3e0",
});

const okBox = (): React.CSSProperties => ({
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  border: "2px solid #2e7d32",
  background: "#e8f5e9",
});

const blueBox = (): React.CSSProperties => ({
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  border: "2px solid #1976d2",
  background: "#e3f2fd",
});

const lbl = (): React.CSSProperties => ({ fontWeight: 900, marginBottom: 6 });
