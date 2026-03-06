"use client";

interface Props {
  title: string;
  icon: string;
  description: string;
  color: "blue" | "gold" | "green";
}

const colorMap = {
  blue: {
    border: "border-lol-blue/30",
    bg: "bg-lol-blue/10",
    title: "text-lol-blue",
    icon: "bg-lol-blue/15",
  },
  gold: {
    border: "border-gold-400/30",
    bg: "bg-gold-400/10",
    title: "text-gold-400",
    icon: "bg-gold-400/15",
  },
  green: {
    border: "border-lol-accent/30",
    bg: "bg-lol-accent/10",
    title: "text-lol-accent",
    icon: "bg-lol-accent/15",
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
