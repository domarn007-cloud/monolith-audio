export interface Track {
  id: string;
  source_id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  file_path?: string;
  cover_url: string;
  bitrate?: number;
  play_count: number;
  last_played?: number;
  is_cached?: boolean;
  is_offline_blob?: boolean;
}

export interface TasteProfile {
  onboarded: boolean;
  favoriteGenres: string[];
  favoriteArtists: string[];
  updatedAt: number;
}

export interface PlayHistoryItem {
  track: Track;
  playedAt: number;
}

export interface StationResponse {
  station_name: string;
  seed_track: Track;
  queue: Track[];
}

export interface SearchResponse {
  query: string;
  local: Track[];
  remote: Track[];
}

export interface FeedResponse {
  jump_back_in: Track[];
  heavy_rotation: Track[];
  taste_curated: Track[];
  total_library_count: number;
}

export interface DaemonHealth {
  status: string;
  daemon: string;
  uptime_seconds: number;
  indexed_tracks: number;
  wal_mode: boolean;
}

export type RepeatMode = "OFF" | "ALL" | "ONE";
export type ActiveView = "FEED" | "SEARCH" | "LIBRARY" | "STATION";