import React, { useEffect, useState, useCallback } from "react";
import { Track, FeedResponse } from "../types";
import { api, listOfflineVaultTracks } from "../services/api";
import { useAudio } from "../context/AudioContext";

interface HomeFeedProps {
  onNavigateSearch: () => void;
  onOpenOnboarding: () => void;
}

function getContextualGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "NIGHT SHIFT TELEMETRY // 00:00 - 06:00";
  if (hour < 12) return "MORNING SIGNAL CHECK // 06:00 - 12:00";
  if (hour < 18) return "AFTERNOON STUDIO SESSION // 12:00 - 18:00";
  return "EVENING HIGH-BIAS PLAYBACK // 18:00 - 24:00";
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  onNavigateSearch,
  onOpenOnboarding,
}) => {
  const {
    tasteProfile,
    playTrack,
    addToQueue,
    launchStation,
    currentTrack,
  } = useAudio();

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const [remoteFeed, vault] = await Promise.all([
        api
          .getFeed(tasteProfile.favoriteGenres, tasteProfile.favoriteArtists)
          .catch(() => null),
        listOfflineVaultTracks(),
      ]);
      if (remoteFeed) setFeed(remoteFeed);
      setOfflineTracks(vault);
    } finally {
      setLoading(false);
    }
  }, [tasteProfile]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleSeedStarterTracks = async () => {
    setSeeding(true);
    try {
      const seedQueries = [
        `${tasteProfile.favoriteArtists[0] || "Bicep"} official audio`,
        `${tasteProfile.favoriteGenres[0] || "Synthwave"} instrumental track`,
      ];
      for (const q of seedQueries) {
        await api.acquireTrack(q, tasteProfile.favoriteGenres[0]);
      }
      await loadFeed();
    } catch (err) {
      console.error("Failed to seed starter tracks:", err);
    } finally {
      setSeeding(false);
    }
  };

  const renderShelf = (title: string, code: string, tracks: Track[]) => {
    if (!tracks.length) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-hairline pb-2">
          <h2 className="font-mono text-xs font-bold tracking-widest uppercase text-ivory">
            {title}
          </h2>
          <span className="font-mono text-[10px] text-ash">{code}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                className={`bg-basalt border p-3 flex flex-col justify-between transition shadow-tactile ${
                  isCurrent
                    ? "border-signal"
                    : "border-hairline hover:border-etched"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-obsidian border border-hairline shrink-0 overflow-hidden relative">
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-full h-full object-cover grayscale contrast-125"
                    />
                    <span className="absolute top-0 left-0 bg-obsidian/90 text-ivory font-mono text-[9px] px-1">
                      {track.play_count}x
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-sm font-semibold text-ivory truncate">
                      {track.title}
                    </div>
                    <div className="font-mono text-xs text-ash truncate">
                      {track.artist}
                    </div>
                    <div className="mt-1 inline-block px-1.5 py-0.5 bg-obsidian border border-hairline font-mono text-[10px] text-amber">
                      {track.genre}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-hairline flex items-center justify-between font-mono text-[11px]">
                  <button
                    onClick={() => playTrack(track, tracks)}
                    className="px-2.5 py-1 bg-ivory text-obsidian font-bold hover:bg-signal transition"
                  >
                    {isCurrent ? "PLAYING" : "PLAY"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => addToQueue(track)}
                      className="px-2 py-1 bg-obsidian border border-hairline text-ash hover:text-ivory"
                      title="Add to Queue"
                    >
                      +Q
                    </button>
                    <button
                      onClick={() => launchStation(track)}
                      className="px-2 py-1 bg-obsidian border border-hairline text-amber hover:border-amber"
                      title="Launch Track Radio Station"
                    >
                      RADIO
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8">
      {/* Contextual Telemetry Banner */}
      <div className="bg-basalt border border-hairline p-6 shadow-tactile flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-signal tracking-widest uppercase">
            {getContextualGreeting()}
          </div>
          <h1 className="font-sans text-2xl font-bold text-ivory mt-1">
            PERSONAL AUDIO DECK // ARCHIVE OVERVIEW
          </h1>
          <div className="font-mono text-xs text-ash mt-2 flex flex-wrap items-center gap-2">
            <span>BIAS GENRES:</span>
            {tasteProfile.favoriteGenres.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 bg-obsidian border border-hairline text-ivory"
              >
                {g}
              </span>
            ))}
            <button
              onClick={onOpenOnboarding}
              className="text-amber underline ml-2 hover:text-signal"
            >
              [RECALIBRATE TASTE]
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
          <button
            onClick={onNavigateSearch}
            className="px-4 py-2.5 bg-signal text-obsidian font-bold tracking-wider uppercase shadow-tactile"
          >
            + ACQUIRE TRACKS
          </button>
          <button
            onClick={loadFeed}
            className="px-3 py-2.5 bg-chassis border border-hairline text-ivory hover:border-ivory"
          >
            SYNC
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 border border-hairline bg-basalt text-center font-mono text-xs text-ash animate-pulse">
          READING SQLITE WAL INDEX & INDEXEDDB VAULT...
        </div>
      ) : !feed || feed.total_library_count === 0 ? (
        <div className="p-8 border border-hairline bg-basalt space-y-4">
          <div className="font-mono text-xs text-amber uppercase tracking-widest">
            ARCHIVE EMPTY // ZERO LOCAL TRACKS INDEXED
          </div>
          <p className="font-sans text-sm text-ash max-w-xl">
            Your local SQLite WAL catalog is currently empty. Search and acquire any track on the fly, or automatically seed your library using your calibrated Taste Profile.
          </p>
          <div className="flex flex-wrap gap-3 font-mono text-xs">
            <button
              onClick={handleSeedStarterTracks}
              disabled={seeding}
              className="px-5 py-2.5 bg-ivory text-obsidian font-bold hover:bg-signal transition disabled:opacity-50"
            >
              {seeding
                ? "DOWNLOADING & TRANSCODING STARTER SIGNALS..."
                : "AUTO-SEED FROM TASTE PROFILE"}
            </button>
            <button
              onClick={onNavigateSearch}
              className="px-5 py-2.5 bg-chassis border border-hairline text-ivory hover:border-signal"
            >
              OPEN MANUAL ACQUISITION
            </button>
          </div>
        </div>
      ) : (
        <>
          {renderShelf(
            "JUMP BACK IN // RECENT SIGNALS",
            "SEQ_01 // CHRONOLOGICAL",
            feed.jump_back_in
          )}
          {renderShelf(
            "HEAVY ROTATION // WEIGHTED PLAYS",
            "SEQ_02 // DECAY_RANKED",
            feed.heavy_rotation
          )}
          {renderShelf(
            "TASTE-CALIBRATED ARCHIVE",
            "SEQ_03 // AFFINITY_BIAS",
            feed.taste_curated
          )}
          {offlineTracks.length > 0 &&
            renderShelf(
              "INDEXEDDB OFFLINE VAULT // ZERO-NETWORK CACHE",
              "SEQ_04 // BROWSER_BLOB_STORAGE",
              offlineTracks
            )}
        </>
      )}
    </div>
  );
};
