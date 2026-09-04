import { getProtocol, type TestType } from '../domain/protocol.ts';
import { useAppStore } from '../AppStore.tsx';

const protocolOrder: TestType[] = ['yoyoIR1', 'beepTest'];

export function StartupScreen() {
  const store = useAppStore();
  return <main className="screen scroll-screen">
    <section className="hero-card">
      <img src="/assets/logo.png" className="app-logo" alt="Yo-Yo" />
      <div>
        <h1>Yo-Yo Fitness Tracker</h1>
        <p>Select a validated test protocol to start your session.</p>
      </div>
    </section>

    <div className="section-kicker">AVAILABLE TEST PROTOCOLS</div>
    <div className="protocol-grid">
      {protocolOrder.map((type) => {
        const p = getProtocol(type);
        const selected = store.selectedTestType === type;
        return <button key={type} className={`protocol-card ${selected ? 'selected' : ''}`} onClick={() => store.setSelectedTestType(type)}>
          <div className="protocol-card-head">
            <div className="protocol-icon">{type === 'yoyoIR1' ? '↔' : '⏱'}</div>
            <div><h2>{p.displayName}</h2><small>{p.fullName}</small></div>
            <span className="radio-dot">{selected ? '✓' : ''}</span>
          </div>
          <p>{p.description}</p>
          <div className="badge-row">{p.badges.map((x) => <span className="badge" key={x}>{x}</span>)}</div>
          <div className="formula">{p.vo2FormulaLabel}</div>
        </button>;
      })}
    </div>

    <div className="sticky-action">
      <button className="primary large" onClick={() => store.setActiveTab('setup')}>
        PROCEED TO SETUP ({store.selectedAthletes.length} ATHLETES READY)
      </button>
    </div>
  </main>;
}
