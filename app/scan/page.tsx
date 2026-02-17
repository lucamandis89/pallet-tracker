"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getDefaultDepot,
  getDefaultShop,
  getDepotOptions,
  getDrivers,
  getShopOptions,
  movePalletViaScan,
  type PalletType,
  type StockLocationKind,
} from "../lib/storage";

type Camera = { id: string; label: string };

const PALLET_TYPES: PalletType[] = ["EUR/EPAL", "CHEP", "LPR", "IFCO", "CP", "ALTRO"];

export default function ScanPage() {
  const [lastCode, setLastCode] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");

  const [palletType, setPalletType] = useState<PalletType>("EUR/EPAL");
  const [qty, setQty] = useState<number>(1);

  const [locKind, setLocKind] = useState<StockLocationKind>("shop");
  const [locId, setLocId] = useState<string>("");

  const [note, setNote] = useState<string>("");

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");

  const scannerRef = useRef<any>(null);
  const divId = "qr-reader";

  const shopOptions = useMemo(() => getShopOptions(), []);
  const depotOptions = useMemo(() => getDepotOptions(), []);
  const driverOptions = useMemo(() => getDrivers().filter((d) => d.active !== false).map((d) => ({ id: d.id, label: d.name })), []);

  const styles = useMemo(() => {
    const box = (border: string, bg: string) =>
      ({
        marginTop: 14,
        padding: 14,
        borderRadius: 18,
        border: `3px solid ${border}`,
        background: bg,
      } as const);

    const input = {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #ddd",
      fontSize: 16,
      outline: "none",
    } as const;

    const btn = (bg: string) =>
      ({
        padding: "14px 16px",
        borderRadius: 14,
        border: "none",
        fontWeight: 900,
        cursor: "pointer",
        background: bg,
        color: "white",
      } as const);

    return { box, input, btn };
  }, []);

  // default location
  useEffect(() => {
    if (locKind === "shop") {
      const def = getDefaultShop();
      if (def && !locId) setLocId(def);
    }
    if (locKind === "depot") {
      const def = getDefaultDepot();
      if (def && !locId) setLocId(def);
    }
    if (locKind === "driver") {
      if (!locId && driverOptions.length) setLocId(driverOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locKind]);

  // list cameras + start scanner
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const mod = await import("html5-qrcode");
        const { Html5Qrcode } = mod as any;

        // cameras
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        const cams: Camera[] = devices.map((d: any) => ({ id: d.id, label: d.label || d.id }));
        setCameras(cams);
        setCameraId((prev) => prev || (cams[0]?.id ?? ""));

        // start
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(divId);
        }

        if (cams[0]?.id) {
          await startScanner(scannerRef.current, prevCamIdOrFirst(prevCamIdFromState(), cams));
        }
      } catch (e) {
        // se non parte, comunque l'inserimento manuale funziona
        console.warn("QR init error", e);
      }
    }

    init();

    return () => {
      mounted = false;
      stopScanner();
    };

    function prevCamIdFromState() {
      return cameraId;
    }
    function prevCamIdOrFirst(prev: string, cams: Camera[]) {
      return prev || (cams[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        const s = scannerRef.current;
        const isScanning = s.getState ? s.getState() === 2 : true;
        if (isScanning && s.stop) await s.stop();
        if (s.clear) await s.clear();
      }
    } catch {
      // ignore
    }
  }

  async function startScanner(scanner: any, camId: string) {
    try {
      await stopScanner();
      setLastCode("");

      await scanner.start(
        { deviceId: { exact: camId } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          const code = (decodedText || "").trim();
          if (!code) return;
          setLastCode(code);
        },
        () => {}
      );
    } catch (e) {
      console.warn("startScanner error", e);
    }
  }

  async function changeCamera(id: string) {
    setCameraId(id);
    if (scannerRef.current) {
      await startScanner(scannerRef.current, id);
    }
  }

  function getLocationLabel(): string {
    if (locKind === "shop") return shopOptions.find((x) => x.id === locId)?.label || "Negozio";
    if (locKind === "depot") return depotOptions.find((x) => x.id === locId)?.label || "Deposito";
    if (locKind === "driver") return driverOptions.find((x) => x.id === locId)?.label || "Autista";
    return "Sconosciuto";
  }

  function save(code: string, mode: "scan" | "manual") {
    const c = (code || "").trim();
    if (!c) return alert("Codice pedana vuoto.");

    const q = Number(qty);
    if (!q || q < 1) return alert("Quantità non valida.");

    // GPS (se disponibile)
    const doMove = (lat?: number, lng?: number) => {
      movePalletViaScan({
        palletCode: c,
        palletType,
        qty: q,
        mode,
        locationKind: locKind,
        locationId: locId || undefined,
        locationLabel: getLocationLabel(),
        lat,
        lng,
        notes: note.trim() || undefined,
      });
      alert("✅ Salvato!");
      setNote("");
    };

    if (!navigator.geolocation) {
      doMove();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => doMove(pos.coords.latitude, pos.coords.longitude),
      () => doMove(),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>📷 Scansione QR Pedana</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>← Home</a>
        <a href="/history" style={{ color: "#6a1b9a", fontWeight: 900, textDecoration: "none" }}>📌 Apri Storico</a>
      </div>

      <div style={styles.box("#f7b24a", "#fff5e6")}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>🛟 QR rovinato? Inserimento manuale</div>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Es: PEDANA-000123"
          style={styles.input}
        />
        <div style={{ marginTop: 10 }}>
          <button onClick={() => save(manualCode, "manual")} style={styles.btn("#fb8c00")}>
            Salva manuale
          </button>
        </div>
      </div>

      <div style={styles.box("#2e7d32", "#eaf7ee")}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>✅ Pedana:</div>
        <div style={{ fontSize: 36, fontWeight: 1000, letterSpacing: 1 }}>
          {lastCode ? lastCode : "—"}
        </div>
      </div>

      <div style={styles.box("#1e88e5", "#e9f4ff")}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>📦 Aggiorna posizione e Stock</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tipo pedana</div>
            <select value={palletType} onChange={(e) => setPalletType(e.target.value as PalletType)} style={styles.input}>
              {PALLET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Quantità</div>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              style={styles.input}
              min={1}
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Dove si trova ORA?</div>
            <select value={locKind} onChange={(e) => { setLocKind(e.target.value as StockLocationKind); setLocId(""); }} style={styles.input}>
              <option value="shop">Negozio</option>
              <option value="depot">Deposito</option>
              <option value="driver">Autista</option>
              <option value="unknown">Sconosciuto</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Seleziona</div>

            {locKind === "shop" ? (
              <select value={locId} onChange={(e) => setLocId(e.target.value)} style={styles.input}>
                <option value="">(Nessuna voce)</option>
                {shopOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            ) : locKind === "depot" ? (
              <select value={locId} onChange={(e) => setLocId(e.target.value)} style={styles.input}>
                <option value="">(Nessuna voce)</option>
                {depotOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            ) : locKind === "driver" ? (
              <select value={locId} onChange={(e) => setLocId(e.target.value)} style={styles.input}>
                <option value="">(Nessuna voce)</option>
                {driverOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            ) : (
              <input value="—" readOnly style={styles.input} />
            )}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltative" style={styles.input} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => save(lastCode, "scan")} style={styles.btn("#2e7d32")}>
            Salva aggiornamento
          </button>
          <button onClick={() => setLastCode("")} style={styles.btn("#616161")}>
            Più tardi
          </button>
          <a href="/stock" style={{ ...styles.btn("#6a1b9a"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Apri Stock
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 18, border: "1px solid #e6e6e6", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>📷 Scanner QR</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Camera:</div>
          <select value={cameraId} onChange={(e) => changeCamera(e.target.value)} style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}>
            {cameras.length === 0 ? (
              <option value="">(Nessuna camera)</option>
            ) : (
              cameras.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)
            )}
          </select>
        </div>

        <div id={divId} style={{ width: "100%", minHeight: 260 }} />
        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
          Se su alcuni telefoni il QR “prende” male, usa l’inserimento manuale sopra.
        </div>
      </div>
    </div>
  );
}
