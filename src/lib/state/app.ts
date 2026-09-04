import { writable } from 'svelte/store';
import type { AppTab } from '../../domain/models.ts';
import type { TestType } from '../../domain/protocol.ts';

export const activeTab = writable<AppTab>('startup');
export const selectedTestType = writable<TestType>('yoyoIR1');

export const navItems: Array<{ id: AppTab; label: string; short: string }> = [
  { id: 'startup', label: 'Home', short: 'Home' },
  { id: 'setup', label: 'Roster', short: 'Roster' },
  { id: 'live', label: 'Live Test', short: 'Live' },
  { id: 'leaderboard', label: 'Results', short: 'Results' },
  { id: 'history', label: 'History', short: 'History' },
  { id: 'sync', label: 'Wi-Fi Sync', short: 'Sync' },
  { id: 'settings', label: 'Settings', short: 'Settings' }
];
