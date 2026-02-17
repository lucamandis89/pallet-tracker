"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

type Camera = { id: string; label: string };

type Driver = { id: string; name: string; phone: string; licensePlate?: string; note?: string; createdAt: string };
type Shop = { id: string; name: string; address: string; phone?: string; note?: string; createdAt: string };
type Depot = { id: string; name: string; address: string; note?: string; createdAt: string };

type HistoryItem = {
  id: string;
  pedanaCode: string;
  ts: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  driverId?: string;
  driverName?: string;
  shopId?: string;
  shopName?: string;
  depotId?: string;
  depotName?: string;
};

type PalletStatus = "IN_DEPOSITO" | "IN_TRANSITO" | "IN_NEGOZIO";
type Pallet = {
  id: string;
  code: string;
  type: string;
  status: PalletStatus;
  locationLabel: string;
  updatedAt: string;
  createdAt: string;
};

const STORAGE_HISTORY = "pallet_history";
const STORAGE_DRIVERS = "pallet_drivers";
const STORAGE_SHOPS = "pallet_shops";
const STORAGE_DEPOTS = "pallet_depots";
const STORAGE_PALLETS = "pallet_registry";

function uid() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Anagrafiche
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  // Selezioni movimento (scegline UNA sola)
  const [selDriverId, setSelDriverId] = useState<string>("");
  const [selShopId, setSelShopId] = useState<string>("");
  const [selDepotId, setSelDepotId] = useState<string>("");

  // GPS
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("📍 GPS non ancora acquisito");

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

  function loadMasters() {
    setDrivers(safeParse<Driver[]>(localStorage.getItem(STORAGE_DRIVERS), []));
    setShops(safeParse<Shop[]>(localStorage.getItem(STORAGE_SHOPS), []));
    setDepots(safeParse<Depot[]>(localStorage.getItem(STORAGE_DEPOTS), []));
  }

  function acquireGPS(): Promise<void> {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setGpsStatus("❌ GPS non disponibile sul browser");
        resolve();
        return;
      }

      setGpsStatus("📡 Acquisizione GPS in corso...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAccuracy(pos.coords.accuracy ?? null);
          setGpsStatus(`✅ GPS OK (±${Math.round(pos.coords.accuracy ?? 0)}m)`);
          resolve();
        },
        () => {
          setGpsStatus("❌ GPS negato o non disponibile (attiva posizione e riprova)");
          resolve();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  async function start() {
    if (!cameraId) {
      setStatus("⚠️ Nessuna camera selezionata.");
      return;
    }

    try {
      if (!qrRef.current) qrRef.current = new Html5Qrcode(readerId);

      const st = qrRef.current.getState?.();
      if (st === Html5QrcodeScannerState.SCANNING) return;

      setStatus("🔎 Scansione in corso...");
      await qrRef.current.start(
        { deviceId: { exact: cameraId } },
        config,
        async (decodedText) => {
          setLastResult(decodedText);
          setStatus("✅ QR letto correttamente!");
          stop().catch(() => {});
          await acquireGPS();
        },
        () => {}
      );

      setIsRunning(true);
    } catch (e) {
      console.error(e);
      setStatus("❌ Impossibile avviare la fotocamera (permessi/camera).");
      setIsRunning(false);
    }
  }

  async function stop() {
    try {
      if (!qrRef.current) return;
      const st = qrRef.current.getState?.();
      if (st === Html5QrcodeScannerState.NOT_STARTED) return;

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
    setLat(null);
    setLng(null);
    setAccuracy(null);
    setGpsStatus("📍 GPS non ancora acquisito");
    setSelDriverId("");
    setSelShopId("");
    setSelDepotId("");
  }

  function validateSingleDestination(): { kind: "AUTISTA" | "NEGOZIO" | "DEPOSITO"; id: string } | null {
    const chosen = [
      selDriverId ? { kind: "AUTISTA" as const, id: selDriverId } : null,
      selShopId ? { kind: "NEGOZIO" as const, id: selShopId } : null,
      selDepotId ? { kind: "DEPOSITO" as const, id: selDepotId } : null,
    ].filter(Boolean) as { kind: "AUTISTA" | "NEGOZIO" | "DEPOSITO"; id: string }[];

    if (chosen.length === 0) {
      alert("Seleziona almeno 1 destinazione: Autista oppure Negozio oppure Deposito.");
      return null;
    }
    if (chosen.length > 1) {
      alert("Seleziona SOLO 1 destinazione (Autista oppure Negozio oppure Deposito).");
      return null;
    }
    return chosen[0];
  }

  function updatePalletRegistry(pedanaCode: string, dest: { kind: "AUTISTA" | "NEGOZIO" | "DEPOSITO"; id: string }) {
    const now = new Date().toLocaleString();
    const registry = safeParse<Pallet[]>(localStorage.getItem(STORAGE_PALLETS), []);

    const driver = drivers.find((d) => d.id === dest.id);
    const shop = shops.find((s) => s.id === dest.id);
    const depot = depots.find((d) => d.id === dest.id);

    let newStatus: PalletStatus = "IN_DEPOSITO";
    let newLocation = "Deposito: —";

    if (dest.kind === "AUTISTA") {
      newStatus = "IN_TRANSITO";
      newLocation = `Autista: ${driver?.name ?? "—"}`;
    } else if (dest.kind === "NEGOZIO") {
      newStatus = "IN_NEGOZIO";
      newLocation = `Negozio: ${shop?.name ?? "—"}`;
    } else {
      newStatus = "IN_DEPOSITO";
      newLocation = `Deposito: ${depot?.name ?? "—"}`;
    }

    const idx = registry.findIndex((p) => p.code.toLowerCase() === pedanaCode.toLowerCase());

    if (idx >= 0) {
      const updated = registry.map((p, i) =>
        i === idx
          ? { ...p, status: newStatus, locationLabel: newLocation, updatedAt: now }
          : p
      );
      localStorage.setItem(STORAGE_PALLETS, JSON.stringify(updated));
      return;
    }

    // Se non esiste, la creo (tipo default: "N/D")
    const newPallet: Pallet = {
      id: uid(),
      code: pedanaCode,
      type: "N/D",
      status: newStatus,
      locationLabel: newLocation,
      createdAt: now,
      updatedAt: now,
    };
    localStorage.setItem(STORAGE_PALLETS, JSON.stringify([newPallet, ...registry]));
  }

  function saveToHistoryAndUpdateRegistry() {
    const code = lastResult.trim();
    if (!code) return alert("Prima scansiona un QR.");

    const dest = validateSingleDestination();
    if (!dest) return;

    const driver = drivers.find((d) => d.id === selDriverId);
    const shop = shops.find((s) => s.id === selShopId);
    const depot = depots.find((d) => d.id === selDepotId);

    const item: HistoryItem = {
      id: uid(),
      pedanaCode: code,
      ts: new Date().toLocaleString(),
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      accuracy: accuracy ?? undefined,
      driverId: driver?.id,
      driverName: driver?.name,
      shopId: shop?.id,
      shopName: shop?.name,
      depotId: depot?.id,
      depotName: depot?.name,
    };

    const prev = safeParse<HistoryItem[]>(localStorage.getItem(STORAGE_HISTORY), []);
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify([item, ...prev]));

    // ✅ aggiorna/crea anche la pedana nel registro
    updatePalletRegistry(code, dest);

    alert("✅ Salvato nello storico + aggiornato registro pedane!");
    clearAll();
  }

  useEffect(() => {
    loadCameras();
    loadMasters();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = (bg: string, border: string) => ({
    padding: 14,
    borderRadius: 16,
    border: `2px solid ${border}`,
    background: bg,
    marginTop: 12,
  });

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontSize: 16,
    background: "white",
  };

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scan → GPS → scegli 1 destinazione (Autista/Negozio/Deposito) → salva → aggiorna anche Registro Pedane.
      </p>

      <div style={{ padding: 12, borderRadius: 12, background: "#f2f2f2", marginBottom: 12, fontWeight: 700 }}>
        Stato: {status}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 280px" }}
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

        <button
          onClick={clearAll}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            fontWeight: 900,
            cursor: "pointer",
            background: "white",
          }}
        >
          Svuota
        </button>
      </div>

      <div id={readerId} style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #eee" }} />

      {lastResult ? (
        <div style={box("#e8f5e9", "#2e7d32")}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>✅ QR Rilevato:</div>
          <div style={{ fontWeight: 900, fontSize: 22, marginTop: 6 }}>{lastResult}</div>
        </div>
      ) : null}

      <div style={box("#e3f2fd", "#1565c0")}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>📍 GPS</div>
        <div style={{ marginTop: 6 }}>{gpsStatus}</div>
        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Lat: {lat ?? "-"} <br />
          Lng: {lng ?? "-"} <br />
          Accuracy: {accuracy ? `±${Math.round(accuracy)}m` : "-"}
        </div>
        <button onClick={acquireGPS} style={{ ...btn("#1565c0"), marginTop: 10 }}>
          Riprova GPS
        </button>
      </div>

      <div style={box("#fff3e0", "#fb8c00")}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>📌 Destinazione (scegline 1)</div>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <select style={inputStyle} value={selDriverId} onChange={(e) => setSelDriverId(e.target.value)}>
            <option value="">🚚 Autista</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.phone}
              </option>
            ))}
          </select>

          <select style={inputStyle} value={selShopId} onChange={(e) => setSelShopId(e.target.value)}>
            <option value="">🏪 Negozio</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.address}
              </option>
            ))}
          </select>

          <select style={inputStyle} value={selDepotId} onChange={(e) => setSelDepotId(e.target.value)}>
            <option value="">🏭 Deposito</option>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.address}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={saveToHistoryAndUpdateRegistry} style={btn("#2e7d32")}>
            ✅ Salva movimento
          </button>

          <a
            href="/history"
            style={{ ...btn("#6a1b9a"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            📄 Storico
          </a>

          <a
            href="/pallets"
            style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            🧱 Registro Pedane
          </a>

          <a
            href="/"
            style={{ ...btn("#455a64"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            ← Home
          </a>
        </div>
      </div>
    </div>
  );
}
