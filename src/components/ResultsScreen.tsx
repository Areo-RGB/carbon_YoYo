import { useAppStore } from '../AppStore.tsx';
import { getProtocol } from '../domain/protocol.ts';
import { makeCsv } from '../services/export.ts';

export function ResultsScreen() {
  const store = useAppStore();
  const p = getProtocol(store.selectedTestType);
  const results = store.athletes.filter((a) => a.isSelected && a.finalDistanceMeters !== undefined).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const copyCsv = async () => {
    await navigator.clipboard?.writeText(makeCsv(results));
  };

  return <main className="screen scroll-screen">
    <header className="page-header"><div><span className="eyebrow">LIVE RESULTS</span><h1>{p.displayName} Leaderboard</h1><p>{store.testState === 'completed' ? 'Final session results' : 'Updates as athletes finish'}</p></div></header>
    <section className="leaderboard panel">
      {results.length === 0 ? <div className="empty">No completed athletes yet.</div> : results.map((a) => <div className="leader-row" key={a.id}>
        <div className={`medal rank-${a.rank}`}>{a.rank}</div><strong>{a.name}</strong><span>{a.finalDistanceMeters} m</span><span>Lvl {a.finalLevel}</span><span>VO₂ {a.vo2Max?.toFixed(1)}</span>
      </div>)}
    </section>
    {store.testState === 'completed' ? <section className="panel result-actions">
      <button className="primary" disabled={!!store.sessionSavedId} onClick={() => void store.saveSession()}>{store.sessionSavedId ? 'SAVED TO HISTORY' : 'SAVE TO HISTORY'}</button>
      <button className="secondary" onClick={() => void copyCsv()}>COPY CSV</button>
      <button className="secondary" onClick={() => store.setActiveTab('history')}>VIEW HISTORY</button>
      <button className="danger ghost" onClick={store.resetTest}>NEW TEST</button>
    </section> : <button className="secondary large" onClick={() => store.setActiveTab('live')}>BACK TO LIVE TEST</button>}
  </main>;
}
