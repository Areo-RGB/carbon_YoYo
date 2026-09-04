import { useState } from 'react';
import { useAppStore } from '../AppStore.tsx';
import { getProtocol } from '../domain/protocol.ts';

export function SetupScreen() {
  const store = useAppStore();
  const [name, setName] = useState('');
  const protocol = getProtocol(store.selectedTestType);
  return <main className="screen scroll-screen">
    <header className="page-header">
      <div><span className="eyebrow">TEST SETUP</span><h1>{protocol.displayName}</h1><p>Choose the athletes participating in this test.</p></div>
      <div className="count-pill">{store.selectedAthletes.length}/{store.athletes.length}</div>
    </header>

    <section className="panel compact-toolbar">
      <button onClick={store.selectAllAthletes}>Select all</button>
      <button onClick={store.deselectAllAthletes}>Clear</button>
      <button onClick={store.resetRoster}>Reset roster</button>
    </section>

    <section className="athlete-grid setup-grid">
      {store.athletes.map((a) => <article className={`select-athlete ${a.isSelected ? 'checked' : ''}`} key={a.id}>
        <button className="athlete-select-main" onClick={() => store.toggleAthleteSelected(a.id)}>
          <span className="avatar-fallback">{a.name.slice(0, 2).toUpperCase()}</span>
          <span>{a.name}</span><b>{a.isSelected ? '✓' : ''}</b>
        </button>
        <button className="icon-danger" title="Remove athlete" onClick={() => store.removeAthlete(a.id)}>×</button>
      </article>)}
    </section>

    <section className="panel add-athlete">
      <input value={name} maxLength={40} placeholder="Add athlete name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => {
        if (e.key === 'Enter') { store.addAthlete(name); setName(''); }
      }} />
      <button className="secondary" onClick={() => { store.addAthlete(name); setName(''); }}>Add athlete</button>
    </section>

    <section className="protocol-note">
      <strong>Protocol:</strong> {protocol.badges.join(' • ')}. The test clock is synchronized to the protocol audio.
    </section>

    <div className="sticky-action split">
      <button className="secondary large" onClick={() => store.setActiveTab('startup')}>BACK</button>
      <button className="primary large" disabled={!store.selectedAthletes.length} onClick={() => void store.startTest()}>START TEST</button>
    </div>
  </main>;
}
