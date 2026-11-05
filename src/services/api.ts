import {
  Track,
  FeedResponse,
  SearchResponse,
  StationResponse,
  DaemonHealth,
} from "../types";

const ENDPOINT_STORAGE_KEY = "monolith_daemon_endpoint";
const DEFAULT_LOCAL_ENDPOINT = "http://127.0.0.1:8765";

const IDB_NAME = "monolith_offline_vault";
const IDB_VERSION = 1;
const IDB_AUDIO_STORE = "audio_blobs";

function openAudioVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_AUDIO_STORE)) {
        db.createObjectStore(IDB_AUDIO_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTrackBlobInIDB(track: Track, blob: Blob): Promise<void> {
  const db = await openAudioVault();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_AUDIO_STORE, "readwrite");
    const store = tx.objectStore(IDB_AUDIO_STORE);
    store.put({
      id: track.id,
      track,
      blob,
      cachedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedTrackBlobFromIDB(trackId: string): Promise<Blob | null> {
  try {
    const db = await openAudioVault();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_AUDIO_STORE, "readonly");
      const store = tx.objectStore(IDB_AUDIO_STORE);
      const req = store.get(trackId);
      req.onsuccess = () => {
        resolve(req.result ? (req.result.blob as Blob) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function listOfflineVaultTracks(): Promise<Track[]> {
  try {
    const db = await openAudioVault();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_AUDIO_STORE, "readonly");
      const store = tx.objectStore(IDB_AUDIO_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        resolve(
          rows.map((r: { track: Track }) => ({
            ...r.track,
            is_cached: true,
            is_offline_blob: true,
          }))
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export function getDaemonEndpoint(): string {
  const saved = localStorage.getItem(ENDPOINT_STORAGE_KEY);
  if (saved && saved.trim().length > 0) {
    return saved.trim().replace(/\/+$/, "");
  }
  return DEFAULT_LOCAL_ENDPOINT;
}

export function setDaemonEndpoint(url: string): string {
  const cleaned = url.trim().replace(/\/+$/, "");
  localStorage.setItem(ENDPOINT_STORAGE_KEY, cleaned);
  return cleaned;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const primary = getDaemonEndpoint();
  try {
    const res = await fetch(`${primary}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (
      primary !== DEFAULT_LOCAL_ENDPOINT &&
      window.location.protocol === "http:"
    ) {
      const fallbackRes = await fetch(`${DEFAULT_LOCAL_ENDPOINT}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
      });
      if (fallbackRes.ok) {
        return (await fallbackRes.json()) as T;
      }
    }
    throw err;
  }
}

export const api = {
  checkHealth: (): Promise<DaemonHealth> => requestJson<DaemonHealth>("/api/health"),

  getFeed: (genres: string[], artists: string[]): Promise<FeedResponse> => {
    const params = new URLSearchParams();
    if (genres.length) params.set("genres", genres.join(","));
    if (artists.length) params.set("artists", artists.join(","));
    return requestJson<FeedResponse>(`/api/feed?${params.toString()}`);
  },

  getAllTracks: (): Promise<{ tracks: Track[] }> =>
    requestJson<{ tracks: Track[] }>("/api/tracks"),

  search: (query: string, includeRemote = true): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      include_remote: String(includeRemote),
    });
    return requestJson<SearchResponse>(`/api/search?${params.toString()}`);
  },

  acquireTrack: (
    queryOrId: string,
    genreHint?: string
  ): Promise<{ status: string; track: Track }> =>
    requestJson<{ status: string; track: Track }>("/api/acquire", {
      method: "POST",
      body: JSON.stringify({
        query_or_id: queryOrId,
        genre_hint: genreHint,
      }),
    }),

  recordPlay: (trackId: string): Promise<{ track: Track }> =>
    requestJson<{ track: Track }>(`/api/tracks/${encodeURIComponent(trackId)}/play`, {
      method: "POST",
      body: JSON.stringify({ completed: true }),
    }),

  createStation: (
    seedTrackId: string,
    tasteGenres: string[],
    tasteArtists: string[]
  ): Promise<StationResponse> =>
    requestJson<StationResponse>("/api/station", {
      method: "POST",
      body: JSON.stringify({
        seed_track_id: seedTrackId,
        taste_genres: tasteGenres,
        taste_artists: tasteArtists,
      }),
    }),

  getStreamUrl: (trackId: string): string =>
    `${getDaemonEndpoint()}/api/stream/${encodeURIComponent(trackId)}`,

  pinTrackOffline: async (track: Track): Promise<void> => {
    const streamUrl = `${getDaemonEndpoint()}/api/stream/${encodeURIComponent(track.id)}`;
    const res = await fetch(streamUrl);
    if (!res.ok) throw new Error("Failed to download audio stream for offline vault");
    const blob = await res.blob();
    await cacheTrackBlobInIDB(track, blob);
  },
};
