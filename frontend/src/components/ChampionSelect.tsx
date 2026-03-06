"use client";

import { useState, useMemo } from "react";
import { Champion } from "@/lib/api";

interface Props {
  champions: Champion[];
  selected: string;
  onSelect: (name: string) => void;
}

export default function ChampionSelect({
  champions,
  selected,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return champions;
    const q = search.toLowerCase();
    return champions.filter(
      (c) =>
        c.name.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.roles.some((r) => r.includes(q))
    );
  }, [champions, search]);

  const selectedChamp = champions.find((c) => c.name === selected);

  return (
    <div className="relative">
      <label className="block text-brand-300 text-sm font-semibold mb-2">
        选择英雄
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-lol-light/60 border border-lol-surface/50 rounded-lg px-4 py-3 text-left hover:border-brand-400/50 transition-colors"
      >
        <span className={selected ? "text-white" : "text-lol-muted"}>
          {selectedChamp
            ? `${selectedChamp.name} (${selectedChamp.nameEn})`
            : "点击选择英雄..."}
        </span>
        <svg
          className={`w-4 h-4 text-brand-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-lol-darker border border-lol-surface/50 rounded-lg shadow-2xl shadow-black/40 max-h-60 md:max-h-72 overflow-hidden">
          <div className="p-2 border-b border-lol-light/60">
            <input
              type="text"
              placeholder="搜索英雄名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-lol-light/60 border border-lol-surface/50 rounded px-3 py-2.5 md:py-2 text-sm text-white placeholder-lol-muted focus:outline-none focus:border-brand-400/60"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48 md:max-h-56">
            {filtered.map((champ) => (
              <button
                key={champ._id}
                onClick={() => {
                  onSelect(champ.name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full flex items-center justify-between px-4 py-3 md:py-2.5 min-h-[44px] text-sm hover:bg-brand-500/15 active:bg-brand-500/25 transition-colors ${
                  selected === champ.name
                    ? "bg-brand-500/20 text-brand-300"
                    : "text-gray-200"
                }`}
              >
                <span>
                  {champ.name}{" "}
                  <span className="text-lol-muted">({champ.nameEn})</span>
                </span>
                <span className="text-xs text-lol-muted">
                  {champ.roles.join(" / ")}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-lol-muted text-center">
                未找到匹配的英雄
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
