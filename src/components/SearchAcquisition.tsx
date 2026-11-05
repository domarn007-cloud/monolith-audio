import React, { useState } from "react";
import { Track } from "../types";
import { api } from "../services/api";
import { useAudio } from "../context/AudioContext";

export const SearchAcquisition: React.FC = () => {
  const { playTrack, addToQueue, launchStation } = useAudio();
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<Track[]>([]);
  const [remoteResults, setRemoteResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [acquiringIds, setAcquiringIds] = useState<Record<string, boolean>>({});
  const [statusLog, setStatusLog] = useState<string>(
    "READY // ENTER QUERY, ARTIST, OR EXTERNAL MEDIA URL"
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setStatusLog(`SCANNING LOCAL WAL INDEX & REMOTE STREAMS FOR "${query.toUpperCase()}"...`);

    try {
      const res = await api.search(query.trim(), true);
      setLocalResults(res.local);
      setRemoteResults(res.remote);
      setStatusLog(
        `FOUND ${res.local.length} INDEXED LOCAL TRACKS & ${res.remote.length} REMOTE ACQUISITION TARGETS.`
      );
    } catch (err) {
      setStatusLog(
        `ERROR // UNABLE TO REACH AUDIO DAEMON. VERIFY CLOUDFLARE TUNNEL ENDPOINT.`
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstantAcquireAndPlay = async (track: Track) => {
    setAcquiringIds((prev) => ({ ...prev, [track.id]: true }));
    setStatusLog(
      `TRANSCODING & TAGGING ID3 METADATA FOR "${track.artist} - ${track.title}"...`
    );
    try {
      const res = await api.acquireTrack(
        track.source_id || `${track.artist} - ${track.title}`,
        track.genre
      );
      await playTrack(res.track);
      setLocalResults((prev) => [
        res.track,
        ...prev.filter((t) => t.id !== res.track.id),
      ]);
      setRemoteResults((prev) => prev.filter((t) => t.id !== res.track.id));
      setStatusLog(`STREAM LOCKED // PLAYING "${res.track.title}"`);
    } catch (err) {
      setStatusLog(`ACQUISITION FAILED // ${(err as Error).message}`);
    } finally {
      setAcquiringIds((prev) => ({ ...prev, [track.id]: false }));
    }
  };

  const handleDirectUrlAcquire = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setStatusLog(`DIRECT EXTRACTION INITIATED FOR "${query.trim()}"...`);
    try {
      const res = await api.acquireTrack(query.trim());
      await playTrack(res.track);
      setLocalResults((prev) => [res.track, ...prev]);
      setStatusLog(`ACQUIRED & INDEXED "${res.track.title}"`);
    } catch (err) {
      setStatusLog(`DIRECT ACQUISITION FAILED // ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Input Console */}
      <div className="bg-basalt border border-hairline p-6 shadow-tactile">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs uppercase tracking-widest text-ash">
            MODULE 02 // SIGNAL SEARCH & ON-THE-FLY ACQUISITION
          </span>
          <span className="font-mono text-[11px] text-amber">
            YT-DLP + FFMPEG + MUTAGEN ID3
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search track, artist, or paste external stream URL..."
            className="flex-1 bg-obsidian border border-hairline px-4 py-3 font-mono text-sm text-ivory placeholder:text-ash focus:outline-none focus:border-signal shadow-recessed"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-ivory text-obsidian font-mono text-xs font-bold tracking-wider uppercase hover:bg-signal hover:text-obsidian transition disabled:opacity-50"
          >
            {isSearching ? "SCANNING..." : "SEARCH CATALOG"}
          </button>
          <button
            type="button"
            onClick={handleDirectUrlAcquire}
            disabled={isSearching}
            className="px-5 py-3 bg-chassis border border-hairline text-amber font-mono text-xs font-bold tracking-wider uppercase hover:border-amber transition disabled:opacity-50"
          >
            INSTANT PULL & PLAY
          </button>
        </form>

        <div className="mt-3 px-3 py-2 bg-obsidian border border-hairline font-mono text-xs text-ash flex items-center justify-between">
          <span className="truncate">{statusLog}</span>
          {isSearching && (
            <span className="text-signal animate-pulse ml-2 shrink-0">
              [WORKING]
            </span>
          )}
        </div>
      </div>

      {/* Local Indexed Matches */}
      {localResults.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <h2 className="font-mono text-xs tracking-widest uppercase text-ivory">
              LOCAL WAL DATABASE MATCHES ({localResults.length})
            </h2>
            <span className="font-mono text-[10px] text-phosphor">
              INSTANT ZERO-LATENCY STREAM
            </span>
          </div>

          <div className="divide-y divide-hairline border border-hairline bg-basalt">
            {localResults.map((track) => (
              <div
                key={track.id}
                className="p-3 flex items-center justify-between gap-4 hover:bg-chassis transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    className="w-11 h-11 object-cover bg-obsidian border border-hairline grayscale"
                  />
                  <div className="min-w-0">
                    <div className="font-sans text-sm font-medium text-ivory truncate">
                      {track.title}
                    </div>
                    <div className="font-mono text-xs text-ash truncate">
                      {track.artist} // {track.genre}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <button
                    onClick={() => playTrack(track, localResults)}
                    className="px-3 py-1.5 bg-signal text-obsidian font-bold hover:opacity-90"
                  >
                    PLAY
                  </button>
                  <button
                    onClick={() => addToQueue(track)}
                    className="px-2.5 py-1.5 bg-obsidian border border-hairline text-ivory hover:border-ivory"
                  >
                    +QUEUE
                  </button>
                  <button
                    onClick={() => launchStation(track)}
                    className="px-2.5 py-1.5 bg-obsidian border border-hairline text-amber hover:border-amber"
                  >
                    RADIO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Remote Acquisition Results */}
      {remoteResults.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <h2 className="font-mono text-xs tracking-widest uppercase text-ivory">
              EXTERNAL ACQUISITION CANDIDATES ({remoteResults.length})
            </h2>
            <span className="font-mono text-[10px] text-amber">
              AUTO-TRANSCODE TO 192KBPS MP3 + ID3
            </span>
          </div>

          <div className="divide-y divide-hairline border border-hairline bg-basalt">
            {remoteResults.map((track) => {
              const busy = !!acquiringIds[track.id];
              return (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between gap-4 hover:bg-chassis transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-11 h-11 object-cover bg-obsidian border border-hairline grayscale"
                    />
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-medium text-ivory truncate">
                        {track.title}
                      </div>
                      <div className="font-mono text-xs text-ash truncate">
                        {track.artist} // {track.genre} //{" "}
                        {track.duration
                          ? `${Math.floor(track.duration / 60)}:${String(
                              track.duration % 60
                            ).padStart(2, "0")}`
                          : "LIVE"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <button
                      onClick={() => handleInstantAcquireAndPlay(track)}
                      disabled={busy}
                      className={`px-3 py-1.5 font-bold border ${
                        busy
                          ? "bg-amber text-obsidian border-amber animate-pulse"
                          : "bg-ivory text-obsidian border-ivory hover:bg-signal hover:border-signal"
                      }`}
                    >
                      {busy ? "INGESTING..." : "ACQUIRE & STREAM"}
                    </button>
                    <button
                      onClick={() => launchStation(track)}
                      disabled={busy}
                      className="px-2.5 py-1.5 bg-obsidian border border-hairline text-amber hover:border-amber"
                    >
                      STATION
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
