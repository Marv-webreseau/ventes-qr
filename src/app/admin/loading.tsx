export default function Chargement() {
  return (
    <main className="page large" aria-busy="true" aria-label="Chargement en cours">
      <div className="sq" style={{ height: 36, width: 220 }} />
      <div className="chiffres">{[0, 1, 2, 3].map((i) => <div key={i} className="sq" style={{ height: 96 }} />)}</div>
      <div className="sq" style={{ height: 240 }} />
    </main>
  );
}
