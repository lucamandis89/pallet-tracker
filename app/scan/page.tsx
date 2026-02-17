"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import Link from "next/link";
import {
  getDefaultDepot,
  getShopOptions,
  movePalletViaScan,
  setLastScan,
  StockLocationKind,
} from "../lib/storage";

type Camera = { id: string; label: string };

const PALLET_TYPES = ["EUR/EPAL", "CHEP", "LPR", "IFCO", "ALTRO"] as const;

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");

  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");

  const [isRunning, setIsRunning] = useState<boolean>(false);

  // form aggiornamento stock/posizione
  const [palletType, setPalletType] = useState<string>("EUR/EPAL");
  const [qty, setQty] = useState<number>(1);

  const [locKind, setLocKind] = useState<StockLocationKind>("shop");
  const [locId, setLocId] = useState<string>("");

  const [note, setNote] = useState<string>("");
  const [altCode, setAltCode] = useState<string>("");

  const [manualCode, setManualCode] = useState<string>("");

  const config = useMemo(
    () => ({
      fps: 12,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
      disableFlip: false,
    }),
    []
  );

  function getGps(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
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
    } catch (e: any) {
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
      console.error(e);
    }
  }

  function ensureDefaultLocation() {
    const { shops, depots, drivers } = getShopOptions();
    if (locKind === "shop") {
      if (!locId) setLocId(shops[0]?.id || "");
    } else if (locKind === "depot") {
      if (!locId) setLocId(depots[0]?.id || getDefaultDepot() || "");
    } else {
      if (!locId) setLocId(drivers[0]?.id || "");
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
      await qrRef.current.start(
        { deviceId: { exact: cameraId } },
        config,
        async (decodedText) => {
          setLastResult(decodedText);
          setLastScan(decodedText);
          setStatus(`✅ QR letto correttamente!`);
          await stop().catch(() => {});
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
          async (decodedText) => {
            setLastResult(decodedText);
            setLastScan(decodedText);
            setStatus(`✅ QR letto correttamente!`);
            await stop().catch(() => {});
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

  async function saveUpdate(source: "qr" | "manual") {
    const code = (source === "qr" ? lastResult : manualCode).trim();
    if (!code) {
      setStatus("⚠️ Inserisci/leggi prima un codice pedana.");
      return;
    }

    ensureDefaultLocation();

    const gps = await getGps();

    movePalletViaScan({
      code,
      source,
      lat: gps.lat,
      lng: gps.lng,
      palletType,
      qty,
      locationKind: locKind,
      locationId: locId || undefined,
      note: note || undefined,
      altCode: altCode || undefined,
    });

    setStatus("✅ Salvato aggiornamento (posizione + stock + storico).");
  }

  useEffect(() => {
    loadCameras();
    ensureDefaultLocation();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ensureDefaultLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locKind]);

  const { shops, depots, drivers } = getShopOptions();
  const locationList = locKind === "shop" ? shops : locKind === "depot" ? depots : drivers;

  const card: React.CSSProperties = {
    borderRadius: 16,
    padding: 14,
    border: "2px solid #ddd",
    background: "white",
    marginBottom: 14,
  };

  const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
  };

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
            ...btn,
            background: isRunning ? "#e53935" : "#1e88e5",
            color: "white",
          }}
        >
          {isRunning ? "Ferma" : "Avvia"}
        </button>

        <button
          onClick={clearResult}
          style={{
            ...btn,
            border: "1px solid #ddd",
            background: "white",
          }}
        >
          Svuota
        </button>
      </div>

      <div id={readerId} style={{ width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 14 }} />

      {/* Manuale (QR rovinato) */}
      <div style={{ ...card, borderColor: "#f1c27b", background: "#fff7e6" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Es: PEDANA-000123"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "2px solid #e6d3a3",
            marginBottom: 10,
            fontWeight: 800,
          }}
        />
        <button
          onClick={() => saveUpdate("manual")}
          style={{ ...btn, background: "#fb8c00", color: "white", width: "100%" }}
        >
          Salva manuale
        </button>
      </div>

      {lastResult ? (
        <div style={{ ...card, borderColor: "#2e7d32", background: "#eaf7ee" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>✅ Pedana:</div>
          <div style={{ fontSize: 34, fontWeight: 950 }}>{lastResult}</div>
        </div>
      ) : null}

      {/* Update posizione/stock */}
      <div style={{ ...card, borderColor: "#1e88e5", background: "#eef6ff" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Tipo pedana</div>
            <select
              value={palletType}
              onChange={(e) => setPalletType(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 800 }}
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
              onChange={(e) => setQty(Number(e.target.value || 1))}
              min={1}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 900 }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Dove si trova ORA?</div>
            <select
              value={locKind}
              onChange={(e) => setLocKind(e.target.value as StockLocationKind)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 800 }}
            >
              <option value="shop">Negozio</option>
              <option value="depot">Deposito</option>
              <option value="driver">Autista</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Seleziona</div>
            <select
              value={locId}
              onChange={(e) => setLocId(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 800 }}
            >
              {locationList.length === 0 ? <option value="">(Nessuna voce)</option> : null}
              {locationList.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Codice alternativo (opz.)</div>
          <input
            value={altCode}
            onChange={(e) => setAltCode(e.target.value)}
            placeholder="Facoltativo"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 800 }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Note</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Facoltative"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px solid #cfe2ff", fontWeight: 800 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            onClick={() => saveUpdate("qr")}
            style={{ ...btn, background: "#2e7d32", color: "white", flex: 1 }}
            disabled={!lastResult}
          >
            Salva aggiornamento
          </button>
          <button
            onClick={() => setStatus("⏭️ Ok, lo fai dopo.")}
            style={{ ...btn, background: "#616161", color: "white", flex: 1 }}
          >
            Più tardi
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <Link
            href="/stock"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px 14px",
              borderRadius: 14,
              fontWeight: 900,
              background: "#6a1b9a",
              color: "white",
              textDecoration: "none",
            }}
          >
            Apri Stock
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900 }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
