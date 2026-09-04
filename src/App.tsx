import { useAppStore } from './AppStore.tsx';
import { StartupScreen } from './components/StartupScreen.tsx';
import { SetupScreen } from './components/SetupScreen.tsx';
import { LiveScreen } from './components/LiveScreen.tsx';
import { ResultsScreen } from './components/ResultsScreen.tsx';
import { HistoryScreen } from './components/HistoryScreen.tsx';
import { TableScreen } from './components/TableScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import type { AppTab } from './domain/models.ts';

const labels: Record<AppTab, [string, string]> = {
  startup: ['◆', 'Startup'], setup: ['✓', 'Setup'], live: ['↔', 'Live Test'], leaderboard: ['▤', 'Results'],
  tabelle: ['▦', 'Tabelle'], history: ['◴', 'History'], settings: ['⚙', 'Settings']
};

export default function App() {
  const store = useAppStore();
  const liveVisible = store.testState !== 'idle';
  const tabs: AppTab[] = ['startup', 'setup', ...(liveVisible ? ['live', 'leaderboard'] as AppTab[] : []), 'tabelle', 'history', 'settings'];
  const effective = tabs.includes(store.activeTab) ? store.activeTab : 'startup';

  let screen;
  switch (effective) {
    case 'startup': screen = <StartupScreen />; break;
    case 'setup': screen = <SetupScreen />; break;
    case 'live': screen = <LiveScreen />; break;
    case 'leaderboard': screen = <ResultsScreen />; break;
    case 'tabelle': screen = <TableScreen />; break;
    case 'history': screen = <HistoryScreen />; break;
    case 'settings': screen = <SettingsScreen />; break;
  }

  return <div className="app-shell">
    <div className="screen-slot">{screen}</div>
    <nav className="bottom-nav">{tabs.map((tab) => <button key={tab} className={effective === tab ? 'active' : ''} onClick={() => store.setActiveTab(tab)}><span>{labels[tab][0]}</span><small>{labels[tab][1]}</small></button>)}</nav>
  </div>;
}
