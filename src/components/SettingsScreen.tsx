import { useAppStore } from '../AppStore.tsx';

export function SettingsScreen() {
  const store = useAppStore();
  return <main className="screen scroll-screen">
    <header className="page-header"><div><span className="eyebrow">SETTINGS</span><h1>Settings</h1><p>Audio, preferences and Android integration.</p></div></header>

    <section className="panel settings-card">
      <div className="settings-row"><div><strong>Audio Volume Boost</strong><small>WebAudio gain keeps playback and timing on the same clock.</small></div><label className="switch"><input type="checkbox" checked={store.boostEnabled} onChange={(e) => store.setBoostEnabled(e.target.checked)} /><span /></label></div>
      {store.boostEnabled ? <div className="slider-row"><input type="range" min="1" max="3" step="0.5" value={store.volumeBoost} onChange={(e) => store.setVolumeBoost(Number(e.target.value))} /><b>{Math.round(store.volumeBoost * 100)}%</b></div> : null}
      {store.volumeBoost > 2 && store.boostEnabled ? <p className="warning-note">High gain can distort on some devices or speakers.</p> : null}
    </section>

    <section className="panel settings-card">
      <div className="settings-row"><div><strong>Nearby Remote Controller</strong><small>The Flutter app used Google Nearby Connections, which requires native Android code.</small></div><span className="status-badge native">NATIVE BRIDGE</span></div>
      <p className="muted">The web/Tauri port isolates this behind a mobile-plugin boundary. The core tracker does not depend on Rust. A Kotlin Nearby plugin can be attached without moving protocol or UI logic into Rust.</p>
    </section>

    <section className="panel settings-card">
      <div className="settings-row"><div><strong>Protocol safety changes in this port</strong></div><span className="status-badge good">ENABLED</span></div>
      <ul className="safe-list"><li>Correct Yo-Yo IR1 speed progression.</li><li>Beep Test consecutive-miss handling.</li><li>Natural protocol completion finalizes all remaining athletes.</li><li>Muting never pauses the protocol audio clock.</li><li>Saved sessions persist the test type.</li></ul>
    </section>
  </main>;
}
