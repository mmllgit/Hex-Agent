"use client";

interface Props {
  selected: string;
  onSelect: (mode: string) => void;
}

const MODES = [
  { value: "海克斯大乱斗", label: "海克斯大乱斗" },
  { value: "经典大乱斗", label: "经典大乱斗" },
];

export default function ModeSelect({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-brand-300 text-sm font-semibold mb-2">
        模式选择
      </label>
      <div className="space-y-2">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onSelect(mode.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              selected === mode.value
                ? "bg-brand-500/20 border-brand-400/50 text-brand-200"
                : "bg-lol-light/60 border-lol-surface/50 text-lol-muted hover:border-brand-400/30 hover:text-gray-200"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
