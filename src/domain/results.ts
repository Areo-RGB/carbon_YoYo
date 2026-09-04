import type { Athlete } from './models.ts';

export function rankAthletes(athletes: Athlete[]): Athlete[] {
  const finished = athletes
    .filter((a) => a.finalDistanceMeters !== undefined)
    .sort((a, b) => {
      const d = (b.finalDistanceMeters ?? 0) - (a.finalDistanceMeters ?? 0);
      if (d !== 0) return d;
      return (b.finishTimestampMs ?? Number.MAX_SAFE_INTEGER) - (a.finishTimestampMs ?? Number.MAX_SAFE_INTEGER);
    });

  let previousDistance: number | undefined;
  let previousRank = 0;
  const ranks = new Map<string, number>();
  finished.forEach((athlete, index) => {
    const distance = athlete.finalDistanceMeters ?? 0;
    const rank = previousDistance === distance ? previousRank : index + 1;
    ranks.set(athlete.id, rank);
    previousDistance = distance;
    previousRank = rank;
  });

  return athletes.map((a) => ({ ...a, rank: ranks.get(a.id) ?? a.rank }));
}
