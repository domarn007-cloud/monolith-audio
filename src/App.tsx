import React, { useEffect, useState, useCallback } from "react";
import { ActiveView, DaemonHealth, Track } from "./types";
import {
  api,
  getDaemonEndpoint,
  setDaemonEndpoint,
} from "./services/api";
import { useAudio } from "./context/AudioContext";
import { HomeFeed } from "./components/HomeFeed";
import { SearchAcquisition } from "./components/SearchAcquisition";
import { PlayerDeck } from "./components/PlayerDeck";
import { OnboardingModal } from "./components/OnboardingModal";

export const App: React.FC = () => {
  const {
    tasteProfile,
    updateTasteProfile,
    playTrack,
    launchStation,
    stationTitle,
    queue,
  } = useAudio();

  const [activeView, setActiveView] = useState<ActiveView>("FEED");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    !tasteProfile.onboarded
  );
  const [showNodeModal, setShowNodeModal] = useState<boolean>(false);
  const [endpointInput, setEndpointInput] = useState<string>(getDaemonEndpoint());
  const [health, setHealth] = useState<DaemonHealth | null>(null);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const verifyNodeHealth = useCallback(async () => {
    try {
      const h = await api.checkHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    verifyNodeHealth();
    const timer = setInterval(verifyNodeHealth, 15000);
    return () => clearInterval(timer);
  }, [verifyNodeHealth]);

  useEffect(() => {
    if (activeView === "LIBRARY") {
      api
        .getAllTracks()
        .then((r) => setLibraryTracks(r.tracks))
        .catch(() => setLibraryTracks([]));
    }
  }, [activeView]);

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = setDaemonEndpoint(endpointInput);
    setEndpointInput(cleaned);
    setShowNodeModal(false);
    verifyNodeHealth();
  };

  const handlePinOffline = async (track: Track) => {
    setPinningId(track.id);
    try {
      await api.pinTrackOffline(track);
      setLibraryTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, is_offline_blob: true } : t
        )
      );
    } finally {
      setPinningId(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-obsidian text-ivory select-none overflow-hidden">
      {/* Top Industrial Telemetry Bar */}
      <header className="h-12 bg-basalt border-b border-hairline px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-signal" />
          <span className="font-mono text-xs font-bold tracking-widest text-ivory">
            MONOLITH // FIELD AUDIO SYSTEM
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] text-ash px-2 py-0.5 bg-obsidian border border-hairline">
            REV 1.0 // SELF-HOSTED
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setShowNodeModal(true)}
            className="px-3 py-1 bg-obsidian border border-hairline flex items-center gap-2 hover:border-signal transition"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health ? "bg-phosphor" : "bg-signal animate-ping"
              }`}
            />
            <span className="text-[11px] text-ivory">
              {health
                ? `TUNNEL ONLINE (${health.indexed_tracks} TRK)`
                : "CONNECT CLOUDFLARE TUNNEL"}
            </span>
          </button>

          <button
            onClick={() => setShowOnboarding(true)}
            className="hidden md:inline-block px-3 py-1 bg-chassis border border-hairline text-ash hover:text-ivory text-[11px]"
          >
            TASTE PROFILE
          </button>
        </div>
      </header>

      {/* Center Workspace: Sidebar + Scrollable Viewport */}
      <div className="flex-1 flex min-h-0">
        {/* Left Tactile Navigation Rail */}
        <aside className="w-16 md:w-56 bg-basalt border-r border-hairline flex flex-col justify-between p-2 md:p-4 shrink-0">
          <nav className="space-y-1.5">
            {(
              [
                { id: "FEED", label: "01 // HOME DECK", short: "01" },
                { id: "SEARCH", label: "02 // ACQUIRE", short: "02" },
                { id: "LIBRARY", label: "03 // WAL INDEX", short: "03" },
                { id: "STATION", label: "04 // TELEMETRY RADIO", short: "04" },
              ] as { id: ActiveView; label: string; short: string }[]
            ).map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full text-left px-3 py-2.5 font-mono text-xs tracking-wider border transition flex items-center justify-between ${
                    active
                      ? "bg-signal text-obsidian border-signal font-bold shadow-tactile"
                      : "bg-obsidian text-ash border-hairline hover:text-ivory"
                  }`}
                >
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden mx-auto">{item.short}</span>
                  {active && <span className="hidden md:inline">&gt;</span>}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:block p-3 bg-obsidian border border-hairline space-y-2 font-mono text-[10px] text-ash">
            <div className="text-ivory font-bold">KEYBOARD MATRIX</div>
            <div>[SPACE] PLAY / PAUSE</div>
            <div>[LEFT/RIGHT] SEEK 5S</div>
            <div>[SHIFT+L/R] PREV / NEXT</div>
            <div>[M] ATTENUATOR MUTE</div>
          </div>
        </aside>

        {/* Main Content Stage */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 hardware-grid">
          <div className="max-w-6xl mx-auto">
            {activeView === "FEED" && (
              <HomeFeed
                onNavigateSearch={() => setActiveView("SEARCH")}
                onOpenOnboarding={() => setShowOnboarding(true)}
              />
            )}

            {activeView === "SEARCH" && <SearchAcquisition />}

            {activeView === "LIBRARY" && (
              <div className="space-y-4">
                <div className="bg-basalt border border-hairline p-5 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-signal">
                      MODULE 03 // COMPLETE SQLITE WAL ARCHIVE
                    </div>
                    <h2 className="font-sans text-xl font-bold text-ivory mt-1">
                      INDEXED AUDIO FILES ({libraryTracks.length})
                    </h2>
                  </div>
                </div>

                <div className="bg-basalt border border-hairline divide-y divide-hairline">
                  {libraryTracks.map((track, i) => (
                    <div
                      key={track.id}
                      className="p-3 flex items-center justify-between gap-4 hover:bg-chassis"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-ash w-6">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-10 h-10 object-cover bg-obsidian border border-hairline grayscale"
                        />
                        <div className="min-w-0">
                          <div className="font-sans text-sm font-medium text-ivory truncate">
                            {track.title}
                          </div>
                          <div className="font-mono text-xs text-ash truncate">
                            {track.artist} // {track.album} // {track.genre}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                        <button
                          onClick={() => playTrack(track, libraryTracks)}
                          className="px-3 py-1.5 bg-ivory text-obsidian font-bold hover:bg-signal"
                        >
                          PLAY
                        </button>
                        <button
                          onClick={() => handlePinOffline(track)}
                          disabled={pinningId === track.id}
                          className="px-2.5 py-1.5 bg-obsidian border border-hairline text-phosphor hover:border-phosphor"
                        >
                          {pinningId === track.id
                            ? "CACHING..."
                            : track.is_offline_blob
                            ? "VAULTED"
                            : "PIN IDB"}
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
              </div>
            )}

            {activeView === "STATION" && (
              <div className="space-y-4">
                <div className="bg-basalt border border-hairline p-6">
                  <div className="font-mono text-xs text-amber uppercase tracking-widest">
                    MODULE 04 // CONTINUOUS STATION GENERATOR
                  </div>
                  <h2 className="font-sans text-xl font-bold text-ivory mt-1">
                    {stationTitle || "NO ACTIVE TELEMETRY STATION"}
                  </h2>
                  <p className="font-mono text-xs text-ash mt-1">
                    Click &ldquo;RADIO&rdquo; on any track to generate an acoustic & genre-matched station queue.
                  </p>
                </div>

                <div className="bg-basalt border border-hairline divide-y divide-hairline">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      className="p-3 flex items-center justify-between hover:bg-chassis"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-signal w-6">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="font-sans text-sm text-ivory">
                            {track.title}
                          </div>
                          <div className="font-mono text-xs text-ash">
                            {track.artist} // {track.genre}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => playTrack(track)}
                        className="px-3 py-1 bg-obsidian border border-hairline font-mono text-xs text-ivory hover:border-signal"
                      >
                        LOCK SIGNAL
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Persistent Docked Hardware Audio Deck */}
      <PlayerDeck />

      {/* Taste Profile Calibration Modal */}
      {showOnboarding && (
        <OnboardingModal
          initialProfile={tasteProfile}
          onSave={updateTasteProfile}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* Cloudflare Tunnel Endpoint Configuration Modal */}
      {showNodeModal && (
        <div className="fixed inset-0 bg-obsidian/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-basalt border border-etched p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="font-mono text-xs font-bold text-ivory uppercase tracking-widest">
                DAEMON ENDPOINT // CLOUDFLARE HTTPS TUNNEL
              </div>
              <button
                onClick={() => setShowNodeModal(false)}
                className="font-mono text-xs text-ash hover:text-ivory"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleSaveEndpoint} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-ash mb-2">
                  PASTE HTTPS://*.TRYCLOUDFLARE.COM OR LOCALHOST URL:
                </label>
                <input
                  type="url"
                  required
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="https://your-tunnel-name.trycloudflare.com"
                  className="w-full bg-obsidian border border-hairline px-3 py-2.5 font-mono text-xs text-ivory focus:outline-none focus:border-signal"
                />
              </div>

              <div className="flex justify-end gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEndpointInput("http://127.0.0.1:8765");
                  }}
                  className="px-3 py-2 bg-obsidian border border-hairline text-ash hover:text-ivory"
                >
                  USE LOCALHOST
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-signal text-obsidian font-bold"
                >
                  BIND ENDPOINT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
