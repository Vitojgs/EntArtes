import { type LucideIcon } from 'lucide-react';

interface PillProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  badgeCount?: number;
}

export function Pill({ icon: Icon, label, onClick, badgeCount }: PillProps) {
  const hasAlert = (badgeCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
        hasAlert
          ? 'bg-yellow-400 border-yellow-500 text-yellow-900 hover:bg-yellow-300'
          : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
      {hasAlert && (
        <span className="ml-1 text-xs font-bold">({badgeCount})</span>
      )}
    </button>
  );
}
