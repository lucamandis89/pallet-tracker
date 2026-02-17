export default function HomePage() {
  const cardStyle = (bg: string) => ({
    display: "block",
    width: "100%",
    textAlign: "center" as const,
    padding: "18px",
    borderRadius: 18,
    background: bg,
    color: "white",
    fontWeight: 900,
    fontSize: 18,
    textDecoration: "none",
    marginTop: 12,
  });

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>📦 Pallet Tracker</h1>
      <p style={{ marginTop: 0, opacity: 0.85, fontSize: 16 }}>
        Gestione pedane e tracking con QR + GPS in tempo reale.
      </p>

      <a href="/scan" style={cardStyle("#0b1220")}>
        📷 Scansiona QR Pedana
      </a>

      <a href="/history" style={cardStyle("#6a1b9a")}>
        📌 Storico Pedane
      </a>

      <div style={{ marginTop: 14 }}>
        <div style={cardStyle("#1e88e5")}>🚚 Gestione Autisti (PROSSIMAMENTE)</div>
        <div style={cardStyle("#1b9a4b")}>🏪 Gestione Negozi (PROSSIMAMENTE)</div>
        <div style={cardStyle("#f57c00")}>🏬 Depositi (PROSSIMAMENTE)</div>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 14,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>🔥 Funzione principale attiva:</div>
        <div>✅ Scansione QR pedana</div>
        <div>✅ Salvataggio posizione GPS</div>
        <div>✅ Storico scansioni (local)</div>
      </div>
    </div>
  );
}
