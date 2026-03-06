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
      <label className="block text-gold-400 text-sm font-semibold mb-2">
        模式选择
      </label>
      <div className="space-y-2">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onSelect(mode.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              selected === mode.value
                ? "bg-lol-blue/20 border-lol-accent text-lol-accent"
                : "bg-lol-light border-lol-surface text-lol-muted hover:border-gold-400/50 hover:text-gray-200"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
