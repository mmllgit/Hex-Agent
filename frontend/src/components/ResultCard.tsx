"use client";

interface Props {
  title: string;
  icon: string;
  description: string;
  color: "blue" | "cyan" | "indigo";
}

const colorMap = {
  blue: {
    border: "border-brand-400/25",
    bg: "bg-brand-400/8",
    title: "text-brand-300",
    icon: "bg-brand-400/15",
  },
  cyan: {
    border: "border-lol-accent/25",
    bg: "bg-lol-accent/8",
    title: "text-lol-accent",
    icon: "bg-lol-accent/15",
  },
  indigo: {
    border: "border-blue-400/25",
    bg: "bg-blue-400/8",
    title: "text-blue-300",
    icon: "bg-blue-400/15",
  },
};

export default function ResultCard({ title, icon, description, color }: Props) {
  const c = colorMap[color];

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-3 md:p-4 transition-all md:hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-2xl ${c.icon} rounded-lg p-2`}>{icon}</span>
        <h3 className={`font-bold ${c.title}`}>{title}</h3>
      </div>
      <p className="text-sm text-lol-muted leading-relaxed">{description}</p>
    </div>
  );
}
