import React, { useState, useRef } from "react";
import { useAudio } from "../context/AudioContext";
import { Visualizer } from "./Visualizer";

function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const PlayerDeck: React.FC = () => {
  const {
    currentTrack,
    queue,
    isPlaying,
    isAcquiring,
    acquiringLabel,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    stationTitle,
    analyser,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playTrack,
    removeFromQueue,
    moveQueueItem,
    launchStation,
  } = useAudio();

  const [showQueue, setShowQueue] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const effectiveTime = dragProgress !== null ? dragProgress * duration : currentTime;
  const progressPercent =
    duration > 0 ? Math.min(100, (effectiveTime / duration) * 100) : 0;

  const calculateRatio = (clientX: number): number => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragProgress(calculateRatio(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragProgress === null) return;
    setDragProgress(calculateRatio(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragProgress === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    seek(dragProgress * duration);
    setDragProgress(null);
  };

  return (
    <footer className="relative h-28 bg-basalt border-t border-hairline px-4 md:px-6 flex flex-col justify-between select-none z-30">
      {/* Top Linear Hardware Scrubber Rail */}
      <div
        ref={scrubberRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="group relative -mx-4 md:-mx-6 h-3 bg-obsidian border-b border-hairline cursor-ew-resize flex items-center"
      >
        <div
          className="h-full bg-signal transition-[width] duration-75"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-2 bg-ivory border border-obsidian shadow-tactile -translate-x-1/2"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Main Deck Chassis */}
      <div className="flex-1 grid grid-cols-12 items-center gap-4 py-2">
        {/* Left Module: Track Telemetry */}
        <div className="col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 bg-obsidian border border-hairline shrink-0 overflow-hidden relative">
            {currentTrack?.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover grayscale contrast-125"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-ash">
                NO_TAPE
              </div>
            )}
            {currentTrack?.is_offline_blob && (
              <span className="absolute bottom-0 right-0 bg-phosphor text-obsidian font-mono text-[8px] font-bold px-1">
                VAULT
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {isAcquiring ? (
              <div className="font-mono text-xs text-amber animate-pulse truncate">
                {acquiringLabel || "ACQUIRING AUDIO STREAM..."}
              </div>
            ) : currentTrack ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-sm text-ivory truncate">
                    {currentTrack.title}
                  </span>
                </div>
                <div className="font-mono text-xs text-ash truncate">
                  {currentTrack.artist} //{" "}
                  <span className="text-ivory/70">{currentTrack.genre}</span>
                </div>
                {stationTitle && (
                  <div className="font-mono text-[10px] text-signal truncate mt-0.5">
                    [{stationTitle}]
                  </div>
                )}
              </>
            ) : (
              <div className="font-mono text-xs text-ash">
                DECK STANDBY // SELECT OR ACQUIRE SIGNAL
              </div>
            )}
          </div>
        </div>

        {/* Center Module: Tactile Transport Switches + Timecode */}
        <div className="col-span-4 md:col-span-4 flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleShuffle}
              title="Toggle Shuffle"
              className={`px-2 py-1.5 font-mono text-[10px] border transition ${
                shuffle
                  ? "bg-signal text-obsidian border-signal font-bold"
                  : "bg-chassis text-ash border-hairline hover:text-ivory"
              }`}
            >
              SHF
            </button>

            <button
              onClick={prevTrack}
              title="Previous (Shift + Left)"
              className="px-3 py-1.5 bg-chassis border border-hairline shadow-tactile font-mono text-xs text-ivory hover:border-signal active:translate-y-px"
            >
              |&lt;&lt;
            </button>

            <button
              onClick={togglePlayPause}
              title="Play / Pause (Space)"
              className={`px-5 py-1.5 border font-mono text-xs font-bold tracking-wider shadow-tactile active:translate-y-px ${
                isPlaying
                  ? "bg-signal text-obsidian border-signal"
                  : "bg-ivory text-obsidian border-ivory"
              }`}
            >
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>

            <button
              onClick={nextTrack}
              title="Next (Shift + Right)"
              className="px-3 py-1.5 bg-chassis border border-hairline shadow-tactile font-mono text-xs text-ivory hover:border-signal active:translate-y-px"
            >
              &gt;&gt;|
            </button>

            <button
              onClick={cycleRepeat}
              title="Cycle Repeat Mode"
              className={`px-2 py-1.5 font-mono text-[10px] border transition ${
                repeat !== "OFF"
                  ? "bg-amber text-obsidian border-amber font-bold"
                  : "bg-chassis text-ash border-hairline hover:text-ivory"
              }`}
            >
              {repeat === "ONE" ? "R:1" : repeat === "ALL" ? "R:A" : "R:0"}
            </button>
          </div>

          <div className="font-mono text-[11px] tracking-widest text-ash flex items-center gap-2">
            <span className="text-ivory">{formatTimecode(effectiveTime)}</span>
            <span>/</span>
            <span>{formatTimecode(duration)}</span>
            {currentTrack && (
              <button
                onClick={() => launchStation(currentTrack)}
                className="ml-2 px-1.5 py-0.5 text-[9px] bg-obsidian border border-hairline text-amber hover:border-amber"
              >
                +RADIO
              </button>
            )}
          </div>
        </div>

        {/* Right Module: Spectrum Visualizer + Attenuator + Queue Trigger */}
        <div className="col-span-3 md:col-span-4 flex items-center justify-end gap-3">
          <div className="hidden xl:block">
            <Visualizer analyser={analyser} isPlaying={isPlaying} />
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-obsidian border border-hairline px-2.5 py-2 shadow-recessed">
            <button
              onClick={toggleMute}
              className="font-mono text-[10px] text-ash hover:text-ivory w-8 text-left"
            >
              {isMuted || volume === 0 ? "MUTE" : `${Math.round(volume * 100)}%`}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-signal cursor-pointer h-1 bg-chassis"
            />
          </div>

          <button
            onClick={() => setShowQueue((s) => !s)}
            className={`px-3 py-2 border font-mono text-xs tracking-wider shadow-tactile ${
              showQueue
                ? "bg-signal text-obsidian border-signal font-bold"
                : "bg-chassis text-ivory border-hairline hover:border-signal"
            }`}
          >
            Q[{queue.length}]
          </button>
        </div>
      </div>

      {/* Active Queue Popover Drawer */}
      {showQueue && (
        <div className="absolute right-4 bottom-32 w-96 max-h-[420px] bg-basalt border border-etched shadow-2xl flex flex-col z-50">
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between bg-obsidian">
            <div>
              <div className="font-mono text-xs font-bold tracking-widest text-ivory">
                ACTIVE SIGNAL QUEUE
              </div>
              <div className="font-mono text-[10px] text-ash">
                {queue.length} TRACKS SCHEDULED
              </div>
            </div>
            <button
              onClick={() => setShowQueue(false)}
              className="font-mono text-xs text-ash hover:text-signal px-2 py-1 border border-hairline"
            >
              ESC
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {queue.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-ash">
                QUEUE EMPTY
              </div>
            ) : (
              queue.map((item, idx) => {
                const active = currentTrack?.id === item.id;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className={`px-3 py-2.5 flex items-center justify-between gap-2 ${
                      active ? "bg-chassis border-l-2 border-l-signal" : "hover:bg-obsidian/60"
                    }`}
                  >
                    <button
                      onClick={() => playTrack(item)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-sans text-xs font-medium text-ivory truncate">
                        {idx + 1}. {item.title}
                      </div>
                      <div className="font-mono text-[10px] text-ash truncate">
                        {item.artist}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      <button
                        onClick={() => moveQueueItem(idx, idx - 1)}
                        className="px-1.5 py-0.5 bg-obsidian border border-hairline text-ash hover:text-ivory"
                        title="Move Up"
                      >
                        ^
                      </button>
                      <button
                        onClick={() => moveQueueItem(idx, idx + 1)}
                        className="px-1.5 py-0.5 bg-obsidian border border-hairline text-ash hover:text-ivory"
                        title="Move Down"
                      >
                        v
                      </button>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="px-1.5 py-0.5 bg-obsidian border border-hairline text-ash hover:text-signal"
                        title="Remove"
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </footer>
  );
};
