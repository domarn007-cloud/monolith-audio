import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Track, RepeatMode, TasteProfile } from "../types";
import {
  api,
  getCachedTrackBlobFromIDB,
  cacheTrackBlobInIDB,
} from "../services/api";

const STORAGE_QUEUE_KEY = "monolith_queue_v1";
const STORAGE_CURRENT_TRACK_KEY = "monolith_current_track_v1";
const STORAGE_VOLUME_KEY = "monolith_volume_v1";
const STORAGE_TASTE_KEY = "monolith_taste_v1";

interface AudioContextValue {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isAcquiring: boolean;
  acquiringLabel: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  stationTitle: string | null;
  tasteProfile: TasteProfile;
  analyser: AnalyserNode | null;
  playTrack: (track: Track, newQueue?: Track[], stationName?: string | null) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  launchStation: (seedTrack: Track) => Promise<void>;
  updateTasteProfile: (profile: TasteProfile) => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const DEFAULT_TASTE: TasteProfile = {
  onboarded: false,
  favoriteGenres: ["Synthwave", "Electronic", "Ambient"],
  favoriteArtists: ["Boards of Canada", "Aphex Twin", "Bicep"],
  updatedAt: Date.now(),
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef< globalThis.AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_TRACK_KEY);
      return raw ? (JSON.parse(raw) as Track) : null;
    } catch {
      return null;
    }
  });

  const [queue, setQueue] = useState<Track[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as Track[]) : [];
    } catch {
      return [];
    }
  });

  const [tasteProfile, setTasteProfile] = useState<TasteProfile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TASTE_KEY);
      return raw ? (JSON.parse(raw) as TasteProfile) : DEFAULT_TASTE;
    } catch {
      return DEFAULT_TASTE;
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [acquiringLabel, setAcquiringLabel] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_VOLUME_KEY);
    return saved ? parseFloat(saved) : 0.85;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("OFF");
  const [stationTitle, setStationTitle] = useState<string | null>(null);
  const [analyserState, setAnalyserState] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.volume = volume;
    audioRef.current = el;

    return () => {
      el.pause();
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
    };
  }, []);

  const ensureWebAudioGraph = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      setAnalyserState(analyser);
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem(STORAGE_CURRENT_TRACK_KEY, JSON.stringify(currentTrack));
    }
  }, [currentTrack]);

  const updateTasteProfile = useCallback((profile: TasteProfile) => {
    setTasteProfile(profile);
    localStorage.setItem(STORAGE_TASTE_KEY, JSON.stringify(profile));
  }, []);

  const playTrack = useCallback(
    async (
      track: Track,
      newQueue?: Track[],
      stationName: string | null = null
    ) => {
      if (!audioRef.current) return;
      ensureWebAudioGraph();

      if (newQueue) {
        setQueue(newQueue);
      } else {
        setQueue((prev) =>
          prev.some((t) => t.id === track.id) ? prev : [track, ...prev]
        );
      }

      if (stationName !== undefined) {
        setStationTitle(stationName);
      }

      setIsAcquiring(true);
      setAcquiringLabel(`LOCKING SIGNAL // ${track.artist} - ${track.title}`);

      try {
        let resolvedTrack = track;
        const offlineBlob = await getCachedTrackBlobFromIDB(track.id);

        if (activeObjectUrlRef.current) {
          URL.revokeObjectURL(activeObjectUrlRef.current);
          activeObjectUrlRef.current = null;
        }

        if (offlineBlob) {
          const blobUrl = URL.createObjectURL(offlineBlob);
          activeObjectUrlRef.current = blobUrl;
          audioRef.current.src = blobUrl;
          resolvedTrack = { ...track, is_cached: true, is_offline_blob: true };
        } else {
          if (!track.is_cached) {
            const acquired = await api.acquireTrack(
              track.source_id || `${track.artist} - ${track.title}`,
              track.genre
            );
            resolvedTrack = acquired.track;
          }
          audioRef.current.src = api.getStreamUrl(resolvedTrack.id);
        }

        setCurrentTrack(resolvedTrack);
        setIsAcquiring(false);
        setAcquiringLabel(null);

        await audioRef.current.play();
        setIsPlaying(true);

        api.recordPlay(resolvedTrack.id).catch(() => {});

        if (!offlineBlob) {
          fetch(api.getStreamUrl(resolvedTrack.id))
            .then((r) => (r.ok ? r.blob() : null))
            .then((b) => {
              if (b) cacheTrackBlobInIDB(resolvedTrack, b).catch(() => {});
            })
            .catch(() => {});
        }
      } catch (err) {
        setIsAcquiring(false);
        setAcquiringLabel(null);
        setIsPlaying(false);
        console.error("Playback acquisition error:", err);
      }
    },
    [ensureWebAudioGraph]
  );

  const togglePlayPause = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    ensureWebAudioGraph();

    if (!el.src && currentTrack) {
      playTrack(currentTrack);
      return;
    }

    if (el.paused) {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, ensureWebAudioGraph, playTrack]);

  const nextTrack = useCallback(() => {
    if (!queue.length || !currentTrack) return;
    if (repeat === "ONE") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (shuffle && queue.length > 1) {
      const candidates = queue.filter((t) => t.id !== currentTrack.id);
      const randomTrack =
        candidates[Math.floor(Math.random() * candidates.length)];
      playTrack(randomTrack);
      return;
    }

    const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = currentIdx + 1;
    if (nextIdx < queue.length) {
      playTrack(queue[nextIdx]);
    } else if (repeat === "ALL") {
      playTrack(queue[0]);
    } else {
      setIsPlaying(false);
    }
  }, [queue, currentTrack, repeat, shuffle, playTrack]);

  const prevTrack = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (!queue.length || !currentTrack) return;
    const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : queue.length - 1;
    playTrack(queue[prevIdx]);
  }, [queue, currentTrack, playTrack]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, audioRef.current.duration || seconds));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_VOLUME_KEY, String(clamped));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      if (clamped > 0) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === "OFF" ? "ALL" : prev === "ALL" ? "ONE" : "OFF"));
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const launchStation = useCallback(
    async (seedTrack: Track) => {
      setIsAcquiring(true);
      setAcquiringLabel(`SYNTHESIZING TELEMETRY STATION // ${seedTrack.title}`);
      try {
        let ensuredSeed = seedTrack;
        if (!seedTrack.is_cached) {
          const acq = await api.acquireTrack(
            seedTrack.source_id || `${seedTrack.artist} - ${seedTrack.title}`,
            seedTrack.genre
          );
          ensuredSeed = acq.track;
        }
        const station = await api.createStation(
          ensuredSeed.id,
          tasteProfile.favoriteGenres,
          tasteProfile.favoriteArtists
        );
        await playTrack(
          station.seed_track,
          station.queue,
          station.station_name
        );
      } catch (err) {
        setIsAcquiring(false);
        setAcquiringLabel(null);
        console.error("Station synthesis failed:", err);
      }
    },
    [playTrack, tasteProfile]
  );

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const handleLoadedMetadata = () =>
      setDuration(
        Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : currentTrack?.duration || 0
      );
    const handleEnded = () => nextTrack();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
    };
  }, [nextTrack, currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "MONOLITH FIELD ARCHIVE",
      artwork: currentTrack.cover_url
        ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
    navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        seek(details.seekTime);
      }
    });
  }, [currentTrack, togglePlayPause, prevTrack, nextTrack, seek]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        nextTrack();
      } else if (e.code === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        prevTrack();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(currentTime + 5);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(currentTime - 5);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, nextTrack, prevTrack, seek, currentTime, toggleMute]);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        isAcquiring,
        acquiringLabel,
        currentTime,
        duration: duration || currentTrack?.duration || 0,
        volume,
        isMuted,
        shuffle,
        repeat,
        stationTitle,
        tasteProfile,
        analyser: analyserState,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,
        moveQueueItem,
        launchStation,
        updateTasteProfile,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudio must be used inside an AudioProvider");
  }
  return ctx;
}
