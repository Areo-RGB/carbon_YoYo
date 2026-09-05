export interface AvatarRecord {
  name: string;
  file: string;
  first: string;
}

export const AVATAR_RECORDS: AvatarRecord[] = [
  { name: 'Alex Moore', file: 'Alex_Moore.png', first: 'alex' },
  { name: 'Arturo Montes Hernandez', file: 'Arturo_Montes_Hernandez.png', first: 'arturo' },
  { name: 'Arvid Lorenz', file: 'Arvid_Lorenz.png', first: 'arvid' },
  { name: 'Finley Charlier', file: 'Finley_Charlier.png', first: 'finley' },
  { name: 'Jakob Merkle', file: 'Jakob_Merkle.png', first: 'jakob' },
  { name: 'Lasse Schmidt', file: 'Lasse_Schmidt.png', first: 'lasse' },
  { name: 'Lennox Niemann', file: 'Lennox_Niemann.png', first: 'lennox' },
  { name: 'Levi Petko', file: 'Levi_Petko.png', first: 'levi' },
  { name: 'Lion Macak', file: 'Lion_Macak.png', first: 'lion' },
  { name: 'Lionel', file: 'Lionel.png', first: 'lionel' },
  { name: 'Milan Wekiaroglou', file: 'Milan_Wekiaroglou.png', first: 'milan' },
  { name: 'Paul Miethe', file: 'Paul_Miethe.png', first: 'paul' },
  { name: 'Peter Grelle', file: 'Peter_Grelle.png', first: 'peter' },
  { name: 'Silas Aldenhoff', file: 'Silas_Aldenhoff.png', first: 'silas' },
  { name: 'Tayo Mohammed', file: 'Tayo_Mohammed.png', first: 'tayo' },
  { name: 'Tommy', file: 'Tommy.png', first: 'tommy' }
];

export function matchAthleteRecord(name: string): AvatarRecord | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const firstWord = normalized.split(/[\s_-]+/)[0];

  // 1. Exact match on full name
  const exact = AVATAR_RECORDS.find((a) => a.name.toLowerCase() === normalized);
  if (exact) return exact;

  // 2. Exact match on first name
  const firstMatch = AVATAR_RECORDS.find((a) => a.first === firstWord);
  if (firstMatch) return firstMatch;

  // 3. Partial / contains match
  const partial = AVATAR_RECORDS.find(
    (a) => a.name.toLowerCase().includes(normalized) || normalized.includes(a.first)
  );
  if (partial) return partial;

  return null;
}

export function getAthleteAvatar(name: string): string | null {
  const record = matchAthleteRecord(name);
  return record ? `/assets/avatars/${record.file}` : null;
}

export function getAthleteFullName(name: string): string | null {
  const record = matchAthleteRecord(name);
  return record ? record.name : null;
}

export function getAthleteInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  const parts = clean.split(/[\s_-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const AVATAR_BG_COLORS = [
  '#0f62fe', // IBM blue-60
  '#0072c3', // cyan-60
  '#007d79', // teal-60
  '#198038', // green-60
  '#8a3ffc', // purple-60
  '#d12771', // magenta-60
  '#fa4d56', // red-50
  '#ba4e00'  // orange-60
];

export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[index];
}
