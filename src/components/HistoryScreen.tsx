import { useState } from 'react';
import { useAppStore } from '../AppStore.tsx';
import { sessionSummary } from '../services/export.ts';

export function HistoryScreen() {
  const store = useAppStore();
  const [open, setOpen] = useState<string>();
  return <main className="screen scroll-screen">
    <header className="page-header"><div><span className="eyebrow">HISTORY</span><h1>Saved Test History</h1><p>{store.sessions.length} past session{store.sessions.length === 1 ? '' : 's'}</p></div></header>
    {store.sessions.length === 0 ? <section className="empty-state"><div className="empty-icon">◴</div><h2>No saved tests yet</h2><p>Finish a test and save it to see it here.</p></section> : <section className="history-list">
      {store.sessions.map((session) => <article className="history-card" key={session.id}>
        <button className="history-summary" onClick={() => setOpen(open === session.id ? undefined : session.id)}>
          <div><strong>{session.title}</strong><small>{new Date(session.timestampMs).toLocaleString()} · {session.testType === 'yoyoIR1' ? 'Yo-Yo IR1' : 'Beep Test'}</small></div>
          <div className="history-stats"><span>Max {session.maxDistanceAchieved} m</span><span>{session.results.length} athletes</span></div>
        </button>
        <div className="history-buttons"><button onClick={() => void navigator.clipboard?.writeText(sessionSummary(session))}>Copy</button><button className="text-danger" onClick={() => store.deleteSession(session.id)}>Delete</button></div>
        {open === session.id ? <div className="history-results">
          {session.notes ? <p className="notes">{session.notes}</p> : null}
          {session.results.map((r) => <div className="history-result" key={`${session.id}-${r.athleteName}`}><b>#{r.rank} {r.athleteName}</b><span>{r.finalDistanceMeters} m</span><span>Lvl {r.finalLevel}</span><span>VO₂ {r.vo2Max.toFixed(1)}</span></div>)}
        </div> : null}
      </article>)}
    </section>}
  </main>;
}
