import type { Dossier } from './lore';
import archiveUrl from './archive.json?url';

let pending: Promise<Dossier[]> | null = null;

/** Exposed for tests and migration checks. */
export function parseArchive(payload: unknown): Dossier[] {
  if (!payload || typeof payload !== 'object' || !('dossiers' in payload)) {
    throw new Error('INVALID ARCHIVE');
  }
  if (!Array.isArray(payload.dossiers)) throw new Error('INVALID ARCHIVE');
  // Static build asset; shape is checked above.
  const dossiers = payload.dossiers as Dossier[];
  return dossiers;
}

/** Authored archive prose is shipped as a JSON asset, not bundled code. */
export function loadDossiers(): Promise<Dossier[]> {
  if (pending) return pending;
  pending = fetch(archiveUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`ARCHIVE ${response.status}`);
      return response.json() as Promise<unknown>;
    })
    .then((payload) => parseArchive(payload))
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
