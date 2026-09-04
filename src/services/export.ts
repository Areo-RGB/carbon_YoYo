import type { Athlete, TestSession } from '../domain/models.ts';

export function makeCsv(athletes: Athlete[]): string {
  const q = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Rank', 'Athlete', 'Distance (m)', 'Level', 'VO2max', 'Warning Distance (m)']];
  for (const a of athletes.filter((x) => x.finalDistanceMeters !== undefined).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))) {
    rows.push([
      String(a.rank ?? ''), a.name, String(a.finalDistanceMeters ?? 0), a.finalLevel ?? '',
      (a.vo2Max ?? 0).toFixed(1), String(a.warningDistanceMeters ?? '')
    ]);
  }
  return rows.map((r) => r.map(q).join(',')).join('\n');
}

export function sessionSummary(session: TestSession): string {
  const lines = [
    `${session.testType === 'yoyoIR1' ? 'Yo-Yo IR1' : 'Beep Test'}: ${session.title}`,
    new Date(session.timestampMs).toLocaleString(),
    session.notes ? `Notes: ${session.notes}` : '',
    '---'
  ].filter(Boolean);
  for (const r of [...session.results].sort((a, b) => a.rank - b.rank)) {
    lines.push(`${r.rank}. ${r.athleteName}: ${r.finalDistanceMeters} m (Lvl ${r.finalLevel}, VO2max ${r.vo2Max.toFixed(1)})`);
  }
  return lines.join('\n');
}
