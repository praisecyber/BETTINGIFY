import { assetUrl } from './api';

let manifestRequest: Promise<Record<string, string>> | undefined;
let clubCatalogRequest: Promise<{ club: string; country: string; flag: string }[]> | undefined;

async function loadManifest() {
  manifestRequest ??= fetch('/assets/club-badges/manifest.json')
    .then(async (response) => response.ok ? response.json() as Promise<Record<string, string>> : {})
    .catch(() => ({}));
  return manifestRequest;
}

export async function teamBadgeUrl(source?: string) {
  if (!source) return undefined;
  const teamId = source.match(/^\/sports-feed\/sportapi\/teams\/(\d+)\/logo$/)?.[1];
  if (teamId) {
    const manifest = await loadManifest();
    if (manifest[teamId]) return manifest[teamId];
  }
  return assetUrl(source);
}

async function loadClubCatalog() {
  clubCatalogRequest ??= fetch('/assets/worldwide_club_catalog%20(1)/clubs.json')
    .then(async (response) => response.ok
      ? response.json() as Promise<{ club: string; country: string; flag: string }[]>
      : [])
    .catch(() => []);
  return clubCatalogRequest;
}

function normalizeClubName(name: string) {
  return name.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(fc|cf|sc|ac|afc|club)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function clubFlag(name: string) {
  const key = normalizeClubName(name);
  const clubs = await loadClubCatalog();
  const match = clubs.find((club) => normalizeClubName(club.club) === key);
  return match ? { flag: match.flag, country: match.country } : undefined;
}