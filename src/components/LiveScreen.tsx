import { useAppStore } from '../AppStore.tsx';
import { getProtocol } from '../domain/protocol.ts';

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LiveScreen() {
  const store = useAppStore();
  const p = getProtocol(store.selectedTestType);
  const running = store.athletes.filter((a) => a.isSelected && a.status === 'running').length;
  const warned = store.athletes.filter((a) => a.isSelected && a.status === 'warned').length;

  return <main className="screen live-screen">
    <header className="live-header">
      <div><span className={`state-dot ${store.testState}`}></span><b>{store.testState.toUpperCase()}</b> · {p.displayName}</div>
      <div className="live-header-actions">
        <span>{formatTime(store.elapsedMs)}</span>
        <button className="icon-button" onClick={store.toggleSound}>{store.soundEnabled ? '🔊' : '🔇'}</button>
      </div>
    </header>

    <section className="meter-card">
      <div className="distance-number">{store.runtime.currentDistanceMeters.toLocaleString()}</div>
      <div className="meters-label">METERS</div>
      <div className="progress-track"><span style={{ width: `${Math.max(1, (store.runtime.currentDistanceMeters / p.maxDistanceMeters) * 100)}%` }} /></div>
      <div className="stats-grid">
        <div><small>LEVEL</small><strong>{store.runtime.shuttle.levelDisplay}</strong></div>
        <div><small>SPEED</small><strong>{store.runtime.shuttle.speedKmh.toFixed(1)}</strong><em>km/h</em></div>
        <div><small>SHUTTLE</small><strong>{store.runtime.shuttle.shuttleNumber}</strong><em>/{p.shuttles.length}</em></div>
        <div className={store.runtime.phase === 'recovery' ? 'rest-stat' : ''}><small>{store.runtime.phase === 'running' ? 'RUN TIME' : 'REST TIME'}</small><strong>{store.runtime.phaseRemainingSeconds.toFixed(1)}</strong><em>s</em></div>
      </div>
    </section>

    <section className="live-summary-row">
      <span><b>{running}</b> running</span><span className="warning-text"><b>{warned}</b> warned</span><span><b>{store.selectedAthletes.length - running - warned}</b> finished</span>
    </section>

    <section className="athlete-grid live-athletes">
      {store.athletes.filter((a) => a.isSelected).map((a) => <article className={`athlete-card status-${a.status}`} key={a.id}>
        <div className="athlete-card-top"><span className="avatar-fallback">{a.name.slice(0, 2).toUpperCase()}</span><div><strong>{a.name}</strong><small>{a.status === 'warned' ? 'WARNING' : a.status === 'eliminated' ? `${a.finalDistanceMeters ?? 0} m · Lvl ${a.finalLevel ?? '-'}` : 'RUNNING'}</small></div>{a.rank ? <span className="rank">#{a.rank}</span> : null}</div>
        {a.status !== 'eliminated' ? <div className="athlete-actions">
          <button className="warn-button" onClick={() => store.markAthleteMiss(a.id)}>{a.status === 'warned' ? 'MISS AGAIN' : 'MISS / WARN'}</button>
          <button className="eliminate-button" onClick={() => store.eliminateAthlete(a.id)}>FINISH</button>
        </div> : <div className="final-metrics"><span>VO₂max <b>{a.vo2Max?.toFixed(1)}</b></span></div>}
      </article>)}
    </section>

    <div className="live-controls">
      {store.undoDescription ? <button className="secondary" onClick={store.undoLastAction}>↶ UNDO</button> : null}
      {store.testState === 'running' ? <button className="secondary" onClick={store.pauseTest}>Ⅱ PAUSE</button> : null}
      {store.testState === 'paused' ? <button className="primary" onClick={() => void store.resumeTest()}>▶ RESUME</button> : null}
      {(store.testState === 'running' || store.testState === 'paused') ? <button className="danger" onClick={store.stopAndFinishTest}>■ FINISH TEST</button> : null}
    </div>
  </main>;
}
