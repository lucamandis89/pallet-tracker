"use client";

import React, { useEffect, useMemo, useState } from "react";

type Id = string;

type Depot = { id: Id; name: string; addr?: string };
type Driver = { id: Id; name: string; phone?: string };
type Store = { id: Id; name: string; addr?: string };

type LocationKind = "DEPOSITO" | "AUTISTA" | "NEGOZIO" | "RITIRATA";

type Location =
  | { kind: "DEPOSITO"; refId: Id }
  | { kind: "AUTISTA"; refId: Id }
  | { kind: "NEGOZIO"; refId: Id }
  | { kind: "RITIRATA" };

type PalletStatus = "IN_DEPOSITO" | "IN_TRANSITO" | "IN_NEGOZIO" | "RITIRATA";

type PalletType = "EPAL" | "LPR" | "DUSS" | "CHEP" | "ROOL" | "GENERICA";

type Pallet = {
  id: Id;
  code: string;
  type: PalletType;
  status: PalletStatus;
  at: Location;
  createdAt: number;
};

type Move = {
  id: Id;
  palletId: Id;
  from: Location;
  to: Location;
  note?: string;
  at: number;
};

type DB = {
  depots: Depot[];
  drivers: Driver[];
  stores: Store[];
  pallets: Pallet[];
  moves: Move[];
};

const STORAGE_KEY = "pallet-tracker-db-v1";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function loadDB(): DB {
  if (typeof window === "undefined") {
    return { depots: [], drivers: [], stores: [], pallets: [], moves: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { depots: [], drivers: [], stores: [], pallets: [], moves: [] };
    const parsed = JSON.parse(raw) as DB;
    // harden fields
    return {
      depots: Array.isArray(parsed.depots) ? parsed.depots : [],
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers : [],
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
      pallets: Array.isArray(parsed.pallets) ? parsed.pallets : [],
      moves: Array.isArray(parsed.moves) ? parsed.moves : [],
    };
  } catch {
    return { depots: [], drivers: [], stores: [], pallets: [], moves: [] };
  }
}

function saveDB(db: DB) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore (quota / private mode)
  }
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

function Btn(props: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "primary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const kind = props.kind ?? "primary";
  const bg =
    kind === "primary" ? "#0f172a" : kind === "danger" ? "#991b1b" : "transparent";
  const color = kind === "ghost" ? "#0f172a" : "#fff";
  const border = kind === "ghost" ? "1px solid #e5e7eb" : "1px solid transparent";
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border,
        background: props.disabled ? "#94a3b8" : bg,
        color: props.disabled ? "#0f172a" : color,
        fontWeight: 800,
        cursor: props.disabled ? "not-allowed" : "pointer",
        width: "100%",
      }}
    >
      {props.children}
    </button>
  );
}

function labelOfLocation(
  loc: Location,
  getDepotName: (id: Id) => string,
  getDriverName: (id: Id) => string,
  getStoreName: (id: Id) => string
): string {
  if (loc.kind === "RITIRATA") return "Ritirata";
  if (loc.kind === "DEPOSITO") return `Deposito: ${getDepotName(loc.refId)}`;
  if (loc.kind === "AUTISTA") return `Autista: ${getDriverName(loc.refId)}`;
  return `Negozio: ${getStoreName(loc.refId)}`;
}

function statusFromLocation(loc: Location): PalletStatus {
  if (loc.kind === "DEPOSITO") return "IN_DEPOSITO";
  if (loc.kind === "AUTISTA") return "IN_TRANSITO";
  if (loc.kind === "NEGOZIO") return "IN_NEGOZIO";
  return "RITIRATA";
}

export default function Home() {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [tab, setTab] = useState<
    "HOME" | "DEPOSITI" | "AUTISTI" | "NEGOZI" | "PEDANE" | "MOVIMENTI"
  >("HOME");

  useEffect(() => {
    saveDB(db);
  }, [db]);

  const stats = useMemo(() => {
    const total = db.pallets.length;
    const by = db.pallets.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<PalletStatus, number>);
    return { total, by };
  }, [db.pallets]);

  const depotName = (id: Id) => db.depots.find((d) => d.id === id)?.name ?? "(sconosciuto)";
  const driverName = (id: Id) => db.drivers.find((d) => d.id === id)?.name ?? "(sconosciuto)";
  const storeName = (id: Id) => db.stores.find((s) => s.id === id)?.name ?? "(sconosciuto)";

  // ---- Depositi
  const [newDepotName, setNewDepotName] = useState("");
  const [newDepotAddr, setNewDepotAddr] = useState("");
  const addDepot = () => {
    const name = newDepotName.trim();
    if (!name) return alert("Inserisci il nome del deposito");
    setDb((prev) => ({
      ...prev,
      depots: [...prev.depots, { id: uid("dep"), name, addr: newDepotAddr.trim() || undefined }],
    }));
    setNewDepotName("");
    setNewDepotAddr("");
  };
  const removeDepot = (id: Id) => {
    if (!confirm("Eliminare questo deposito?")) return;
    setDb((prev) => ({ ...prev, depots: prev.depots.filter((d) => d.id !== id) }));
  };

  // ---- Autisti
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const addDriver = () => {
    const name = newDriverName.trim();
    if (!name) return alert("Inserisci il nome dell'autista");
    setDb((prev) => ({
      ...prev,
      drivers: [...prev.drivers, { id: uid("drv"), name, phone: newDriverPhone.trim() || undefined }],
    }));
    setNewDriverName("");
    setNewDriverPhone("");
  };
  const removeDriver = (id: Id) => {
    if (!confirm("Eliminare questo autista?")) return;
    setDb((prev) => ({ ...prev, drivers: prev.drivers.filter((d) => d.id !== id) }));
  };

  // ---- Negozi
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddr, setNewStoreAddr] = useState("");
  const addStore = () => {
    const name = newStoreName.trim();
    if (!name) return alert("Inserisci il nome del negozio");
    setDb((prev) => ({
      ...prev,
      stores: [...prev.stores, { id: uid("sto"), name, addr: newStoreAddr.trim() || undefined }],
    }));
    setNewStoreName("");
    setNewStoreAddr("");
  };
  const removeStore = (id: Id) => {
    if (!confirm("Eliminare questo negozio?")) return;
    setDb((prev) => ({ ...prev, stores: prev.stores.filter((s) => s.id !== id) }));
  };

  // ---- Pedane (creazione)
  const [newPalletCode, setNewPalletCode] = useState("");
  const [newPalletType, setNewPalletType] = useState<PalletType>("EPAL");
  const [startDepot, setStartDepot] = useState<Id>("");
  const addPallet = () => {
    const code = newPalletCode.trim();
    if (!code) return alert("Inserisci codice pedana (univoco)");
    if (!startDepot) return alert("Seleziona un deposito iniziale");
    const exists = db.pallets.some((p) => p.code.toLowerCase() === code.toLowerCase());
    if (exists) return alert("Codice pedana già presente");

    const at: Location = { kind: "DEPOSITO", refId: startDepot };
    const pallet: Pallet = {
      id: uid("pal"),
      code,
      type: newPalletType,
      at,
      status: statusFromLocation(at),
      createdAt: Date.now(),
    };

    setDb((prev) => ({ ...prev, pallets: [pallet, ...prev.pallets] }));
    setNewPalletCode("");
    setNewPalletType("EPAL");
  };

  const removePallet = (id: Id) => {
    if (!confirm("Eliminare questa pedana? (Cancella anche i movimenti)")) return;
    setDb((prev) => ({
      ...prev,
      pallets: prev.pallets.filter((p) => p.id !== id),
      moves: prev.moves.filter((m) => m.palletId !== id),
    }));
  };

  // ---- Movimenti
  const [movePalletId, setMovePalletId] = useState<Id>("");
  const [moveToKind, setMoveToKind] = useState<LocationKind>("AUTISTA");
  const [moveToRef, setMoveToRef] = useState<Id>("");
  const [moveNote, setMoveNote] = useState("");

  useEffect(() => {
    // reset destinazione quando cambia tipo
    setMoveToRef("");
  }, [moveToKind]);

  const canMove = useMemo(() => {
    if (!movePalletId) return false;
    if (moveToKind === "RITIRATA") return true;
    return Boolean(moveToRef);
  }, [movePalletId, moveToKind, moveToRef]);

  const execMove = () => {
    const pallet = db.pallets.find((p) => p.id === movePalletId);
    if (!pallet) return alert("Seleziona una pedana valida");

    let to: Location;
    if (moveToKind === "RITIRATA") {
      to = { kind: "RITIRATA" };
    } else if (moveToKind === "DEPOSITO") {
      if (!moveToRef) return alert("Seleziona un deposito");
      to = { kind: "DEPOSITO", refId: moveToRef };
    } else if (moveToKind === "AUTISTA") {
      if (!moveToRef) return alert("Seleziona un autista");
      to = { kind: "AUTISTA", refId: moveToRef };
    } else {
      if (!moveToRef) return alert("Seleziona un negozio");
      to = { kind: "NEGOZIO", refId: moveToRef };
    }

    const move: Move = {
      id: uid("mov"),
      palletId: pallet.id,
      from: pallet.at,
      to,
      note: moveNote.trim() || undefined,
      at: Date.now(),
    };

    setDb((prev) => ({
      ...prev,
      pallets: prev.pallets.map((p) =>
        p.id === pallet.id ? { ...p, at: to, status: statusFromLocation(to) } : p
      ),
      moves: [move, ...prev.moves],
    }));

    setMoveNote("");
  };

  const resetDB = () => {
    if (!confirm("Reset totale? Cancella tutti i dati della demo.")) return;
    const empty: DB = { depots: [], drivers: [], stores: [], pallets: [], moves: [] };
    setDb(empty);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const navBtn = (t: typeof tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: tab === t ? "#0f172a" : "#fff",
        color: tab === t ? "#fff" : "#0f172a",
        fontWeight: 900,
        cursor: "pointer",
        minWidth: 92,
      }}
    >
      {label}
    </button>
  );

  const toOptions = () => {
    if (moveToKind === "DEPOSITO") return db.depots.map((d) => ({ id: d.id, label: d.name }));
    if (moveToKind === "AUTISTA") return db.drivers.map((d) => ({ id: d.id, label: d.name }));
    if (moveToKind === "NEGOZIO") return db.stores.map((s) => ({ id: s.id, label: s.name }));
    return [];
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>📦</span>
          <div style={{ fontSize: 28, fontWeight: 1000 }}>Pallet Tracker</div>
        </div>

        <div style={{ width: 160 }}>
          <Btn kind="danger" onClick={resetDB}>
            Reset totale
          </Btn>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {navBtn("HOME", "Home")}
        {navBtn("DEPOSITI", "Depositi")}
        {navBtn("AUTISTI", "Autisti")}
        {navBtn("NEGOZI", "Negozi")}
        {navBtn("PEDANE", "Pedane")}
        {navBtn("MOVIMENTI", "Movimenti")}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
        {tab === "HOME" && (
          <Card title="Dashboard">
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                Totale pedane: <b>{stats.total}</b>
              </div>
              <div>
                In deposito: <b>{stats.by.IN_DEPOSITO || 0}</b>
              </div>
              <div>
                In transito: <b>{stats.by.IN_TRANSITO || 0}</b>
              </div>
              <div>
                In negozio: <b>{stats.by.IN_NEGOZIO || 0}</b>
              </div>
              <div>
                Ritirate: <b>{stats.by.RITIRATA || 0}</b>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Demo locale: i dati restano solo sul dispositivo (localStorage).
            </div>
          </Card>
        )}

        {tab === "DEPOSITI" && (
          <Card title="Depositi">
            <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <input
                value={newDepotName}
                onChange={(e) => setNewDepotName(e.target.value)}
                placeholder="Nome deposito"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <input
                value={newDepotAddr}
                onChange={(e) => setNewDepotAddr(e.target.value)}
                placeholder="Indirizzo (opzionale)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <Btn onClick={addDepot}>Aggiungi deposito</Btn>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {db.depots.length === 0 && <div>Nessun deposito.</div>}
              {db.depots.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <b>{d.name}</b>
                    {d.addr ? <div style={{ fontSize: 12, opacity: 0.7 }}>{d.addr}</div> : null}
                  </div>
                  <div style={{ width: 120 }}>
                    <Btn kind="danger" onClick={() => removeDepot(d.id)}>
                      Elimina
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "AUTISTI" && (
          <Card title="Autisti">
            <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <input
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Nome autista"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <input
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                placeholder="Telefono (opzionale)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <Btn onClick={addDriver}>Aggiungi autista</Btn>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {db.drivers.length === 0 && <div>Nessun autista.</div>}
              {db.drivers.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <b>{d.name}</b>
                    {d.phone ? <div style={{ fontSize: 12, opacity: 0.7 }}>{d.phone}</div> : null}
                  </div>
                  <div style={{ width: 120 }}>
                    <Btn kind="danger" onClick={() => removeDriver(d.id)}>
                      Elimina
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "NEGOZI" && (
          <Card title="Negozi">
            <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <input
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Nome negozio"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <input
                value={newStoreAddr}
                onChange={(e) => setNewStoreAddr(e.target.value)}
                placeholder="Indirizzo (opzionale)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <Btn onClick={addStore}>Aggiungi negozio</Btn>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {db.stores.length === 0 && <div>Nessun negozio.</div>}
              {db.stores.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <b>{s.name}</b>
                    {s.addr ? <div style={{ fontSize: 12, opacity: 0.7 }}>{s.addr}</div> : null}
                  </div>
                  <div style={{ width: 120 }}>
                    <Btn kind="danger" onClick={() => removeStore(s.id)}>
                      Elimina
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "PEDANE" && (
          <Card title="Gestione pedane">
            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              <input
                value={newPalletCode}
                onChange={(e) => setNewPalletCode(e.target.value)}
                placeholder="Codice pedana (univoco)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />

              <select
                value={newPalletType}
                onChange={(e) => setNewPalletType(e.target.value as PalletType)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              >
                <option value="EPAL">EPAL</option>
                <option value="LPR">LPR</option>
                <option value="DUSS">DUSS</option>
                <option value="CHEP">CHEP</option>
                <option value="ROOL">ROOL</option>
                <option value="GENERICA">GENERICA</option>
              </select>

              <select
                value={startDepot}
                onChange={(e) => setStartDepot(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              >
                <option value="">Seleziona deposito iniziale</option>
                {db.depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <Btn onClick={addPallet} disabled={db.depots.length === 0}>
                Aggiungi pedana
              </Btn>

              {db.depots.length === 0 && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Prima crea almeno un Deposito, poi puoi inserire pedane.
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, fontWeight: 900, fontSize: 18 }}>Elenco pedane</div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {db.pallets.length === 0 && <div>Nessuna pedana inserita.</div>}
              {db.pallets.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <b>{p.code}</b> <span style={{ opacity: 0.7 }}>({p.type})</span>
                    </div>
                    <div style={{ width: 120 }}>
                      <Btn kind="danger" onClick={() => removePallet(p.id)}>
                        Elimina
                      </Btn>
                    </div>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    Stato: <b>{p.status}</b>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Posizione:{" "}
                    <b>{labelOfLocation(p.at, depotName, driverName, storeName)}</b>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "MOVIMENTI" && (
          <Card title="Movimenti">
            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              <select
                value={movePalletId}
                onChange={(e) => setMovePalletId(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              >
                <option value="">Seleziona pedana</option>
                {db.pallets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.status}
                  </option>
                ))}
              </select>

              <select
                value={moveToKind}
                onChange={(e) => setMoveToKind(e.target.value as LocationKind)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              >
                <option value="AUTISTA">Verso autista</option>
                <option value="NEGOZIO">Verso negozio</option>
                <option value="DEPOSITO">Verso deposito</option>
                <option value="RITIRATA">Ritirata</option>
              </select>

              {moveToKind !== "RITIRATA" && (
                <select
                  value={moveToRef}
                  onChange={(e) => setMoveToRef(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">Seleziona destinazione</option>
                  {toOptions().map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

              <input
                value={moveNote}
                onChange={(e) => setMoveNote(e.target.value)}
                placeholder="Nota (opzionale)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />

              <Btn onClick={execMove} disabled={!canMove || db.pallets.length === 0}>
                Esegui movimento
              </Btn>

              {db.pallets.length === 0 && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Inserisci prima almeno una pedana in “Pedane”.
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, fontWeight: 900, fontSize: 18 }}>Storico movimenti</div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {db.moves.length === 0 && <div>Nessun movimento.</div>}
              {db.moves.map((m) => {
                const p = db.pallets.find((x) => x.id === m.palletId);
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #eee",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {p?.code ?? "Pedana eliminata"}{" "}
                      <span style={{ fontWeight: 600, opacity: 0.7 }}>
                        — {new Date(m.at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Da: <b>{labelOfLocation(m.from, depotName, driverName, storeName)}</b>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      A: <b>{labelOfLocation(m.to, depotName, driverName, storeName)}</b>
                    </div>
                    {m.note ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Nota: <i>{m.note}</i>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}