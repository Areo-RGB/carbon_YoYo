import { useMemo, useState } from 'react';
import { useAppStore } from '../AppStore.tsx';

type Mode = 'total' | 'latest';
interface Entry { name: string; total: number; tests: number; best: number; bestLevel: string; avgVo2: number; }

export function TableScreen() {
  const store = useAppStore();
  const [mode, setMode] = useState<Mode>('total');
  const entries = useMemo<Entry[]>(() => {
    if (!store.sessions.length) return [];
    if (mode === 'latest') {
      return store.sessions[0].results.map((r) => ({ name: r.athleteName, total: r.finalDistanceMeters, tests: 1, best: r.finalDistanceMeters, bestLevel: r.finalLevel, avgVo2: r.vo2Max })).sort((a,b) => b.total-a.total);
    }
    const map = new Map<string, Entry>();
    for (const s of store.sessions) for (const r of s.results) {
      const key = r.athleteName.trim().toLowerCase();
      const e = map.get(key);
      if (!e) map.set(key, { name: r.athleteName.trim(), total: r.finalDistanceMeters, tests: 1, best: r.finalDistanceMeters, bestLevel: r.finalLevel, avgVo2: r.vo2Max });
      else {
        const tests = e.tests + 1;
        e.avgVo2 = (e.avgVo2 * e.tests + r.vo2Max) / tests;
        e.tests = tests;
        e.total += r.finalDistanceMeters;
        if (r.finalDistanceMeters > e.best) { e.best = r.finalDistanceMeters; e.bestLevel = r.finalLevel; }
      }
    }
    return [...map.values()].sort((a,b) => b.total-a.total || b.best-a.best || a.name.localeCompare(b.name));
  }, [store.sessions, mode]);

  return <main className="screen scroll-screen">
    <header className="page-header"><div><span className="eyebrow">TABELLE</span><h1>Athlete Performance</h1><p>{mode === 'total' ? 'All-time accumulated results' : 'Most recent saved session'}</p></div><div className="segmented"><button className={mode==='total'?'active':''} onClick={() => setMode('total')}>All time</button><button className={mode==='latest'?'active':''} onClick={() => setMode('latest')}>Latest</button></div></header>
    <section className="panel table-wrap">
      {entries.length === 0 ? <div className="empty">No history to rank yet.</div> : <table><thead><tr><th>#</th><th>Athlete</th><th>{mode === 'total' ? 'Total' : 'Distance'}</th><th>Best</th><th>Best level</th><th>Tests</th><th>Avg VO₂</th></tr></thead><tbody>{entries.map((e,i) => <tr key={e.name}><td>{i+1}</td><td><b>{e.name}</b></td><td>{e.total.toLocaleString()} m</td><td>{e.best.toLocaleString()} m</td><td>{e.bestLevel}</td><td>{e.tests}</td><td>{e.avgVo2.toFixed(1)}</td></tr>)}</tbody></table>}
    </section>
  </main>;
}
