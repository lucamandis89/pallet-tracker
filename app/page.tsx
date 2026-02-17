"use client";

export default function HomePage() {
  const btnStyle = (bg: string) => ({
    width: "100%",
    padding: "18px 16px",
    borderRadius: 18,
    border: "none",
    fontWeight: 900 as const,
    fontSize: 18,
    cursor: "pointer",
    color: "white",
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    textDecoration: "none",
  });

  const cardStyle = {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    border: "1px solid #e6e6e6",
    background: "white",
  };

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 38 }}>📦</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 34 }}>Pallet Tracker</h1>
          <div style={{ opacity: 0.8, fontWeight: 700 }}>Gestione pedane e tracking con QR + GPS.</div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <a href="/scan" style={btnStyle("#0b1220")}>📷 Scansiona QR Pedana</a>
        <a href="/pallets" style={btnStyle("#2e7d32")}>🧱 Registro Pedane</a>
        <a href="/stock" style={btnStyle("#6a1b9a")}>📦 Giacenze (Stock)</a>
        <a href="/drivers" style={btnStyle("#1e88e5")}>🚚 Gestione Autisti</a>
        <a href="/shops" style={btnStyle("#1b9a4a")}>🏪 Gestione Negozi</a>
        <a href="/depots" style={btnStyle("#fb8c00")}>🏭 Depositi</a>
        <a href="/history" style={btnStyle("#6a1b9a")}>📌 Storico Scansioni</a>
        <a href="/missing" style={btnStyle("#e53935")}>🚨 Pedane Mancanti</a>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>✅ Moduli pronti:</div>
        <div style={{ lineHeight: 1.6 }}>
          ✅ Scansione QR + inserimento manuale se QR rovinato<br />
          ✅ Salvataggio GPS + Storico scansioni (Export CSV)<br />
          ✅ Registro pedane (tipo, note, posizione, stato)<br />
          ✅ Stock per negozio/deposito/autista + movimenti (Export CSV)<br />
          ✅ Anagrafiche: autisti, negozi, depositi<br />
          ✅ Pedane mancanti (flag + lista)
        </div>
      </div>
    </div>
  );
}
