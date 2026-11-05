import React, { useState } from "react";
import { TasteProfile } from "../types";

interface OnboardingModalProps {
  initialProfile: TasteProfile;
  onSave: (profile: TasteProfile) => void;
  onClose: () => void;
}

const AVAILABLE_GENRES = [
  "Synthwave",
  "Electronic",
  "Ambient",
  "Industrial",
  "Post-Punk",
  "Hip-Hop",
  "Jazz",
  "Rock",
];

const SUGGESTED_ARTISTS = [
  "Aphex Twin",
  "Boards of Canada",
  "Bicep",
  "Four Tet",
  "Nine Inch Nails",
  "Kavinsky",
  "Brian Eno",
  "Joy Division",
  "Nujabes",
  "Tame Impala",
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  onSave,
  onClose,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialProfile.favoriteGenres
  );
  const [selectedArtists, setSelectedArtists] = useState<string[]>(
    initialProfile.favoriteArtists
  );
  const [customArtist, setCustomArtist] = useState("");

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleArtist = (artist: string) => {
    setSelectedArtists((prev) =>
      prev.includes(artist)
        ? prev.filter((a) => a !== artist)
        : [...prev, artist]
    );
  };

  const handleAddCustomArtist = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customArtist.trim();
    if (!trimmed) return;
    if (!selectedArtists.includes(trimmed)) {
      setSelectedArtists((prev) => [...prev, trimmed]);
    }
    setCustomArtist("");
  };

  const handleSave = () => {
    onSave({
      onboarded: true,
      favoriteGenres: selectedGenres.length ? selectedGenres : ["Electronic"],
      favoriteArtists: selectedArtists.length ? selectedArtists : ["Aphex Twin"],
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-basalt border border-etched shadow-2xl">
        <div className="px-6 py-4 bg-obsidian border-b border-hairline flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-signal tracking-widest uppercase">
              INITIALIZATION SEQUENCE // ACOUSTIC TELEMETRY
            </div>
            <h2 className="font-sans text-lg font-bold text-ivory">
              CALIBRATE TASTE BIAS & STATION GENERATOR
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-ash hover:text-ivory px-2.5 py-1 border border-hairline"
          >
            CLOSE
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Genres */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ash mb-2">
              1. SELECT PRIMARY GENRE FREQUENCIES
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 font-mono text-xs border transition ${
                      active
                        ? "bg-signal text-obsidian border-signal font-bold"
                        : "bg-obsidian text-ivory border-hairline hover:border-etched"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Artists */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ash mb-2">
              2. SEED REFERENCE ARTISTS FOR RADIO STATIONS
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_ARTISTS.map((artist) => {
                const active = selectedArtists.includes(artist);
                return (
                  <button
                    key={artist}
                    type="button"
                    onClick={() => toggleArtist(artist)}
                    className={`px-3 py-1.5 font-mono text-xs border transition ${
                      active
                        ? "bg-amber text-obsidian border-amber font-bold"
                        : "bg-obsidian text-ivory border-hairline hover:border-etched"
                    }`}
                  >
                    {artist}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddCustomArtist} className="flex gap-2">
              <input
                type="text"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                placeholder="Add custom artist seed..."
                className="flex-1 bg-obsidian border border-hairline px-3 py-2 font-mono text-xs text-ivory focus:outline-none focus:border-signal"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-chassis border border-hairline font-mono text-xs text-ivory hover:border-amber"
              >
                + ADD SEED
              </button>
            </form>
          </div>
        </div>

        <div className="px-6 py-4 bg-obsidian border-t border-hairline flex items-center justify-between">
          <span className="font-mono text-[11px] text-ash">
            STORED IN CLIENT LOCALSTORAGE // ZERO EXTERNAL TRACKING
          </span>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-ivory text-obsidian font-mono text-xs font-bold tracking-wider uppercase hover:bg-signal transition"
          >
            COMMIT CALIBRATION
          </button>
        </div>
      </div>
    </div>
  );
};
