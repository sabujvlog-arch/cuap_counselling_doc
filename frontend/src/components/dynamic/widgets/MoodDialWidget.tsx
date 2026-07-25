import React, { useState } from 'react';

interface MoodDialWidgetProps {
  title: string;
  subtitle?: string;
  properties: {
    scaleType?: 'emoji' | 'numerical';
    showHistoryLimit?: number;
  };
}

export default function MoodDialWidget({ title, subtitle, properties }: MoodDialWidgetProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const scaleType = properties.scaleType || 'emoji';

  const moods = [
    { emoji: '', label: 'Joyful' },
    { emoji: '', label: 'Peaceful' },
    { emoji: '', label: 'Okay' },
    { emoji: '', label: 'Stressed' },
    { emoji: '', label: 'Anxious' },
    { emoji: '', label: 'Sad' },
  ];

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm space-y-4 text-left">
      <div>
        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-450 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex justify-around gap-2 pb-2">
        {moods.map((m) => (
          <button
            key={m.label}
            onClick={() => setSelectedMood(m.label)}
            className={`p-3 rounded-2xl border text-xl transition-all hover:scale-110 cursor-pointer select-none ${
              selectedMood === m.label
                ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-slate-800'
                : 'border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20'
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      {selectedMood && (
        <div className="p-3 bg-blue-50/50 dark:bg-slate-950/20 border border-blue-100 dark:border-slate-850 rounded-xl">
          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
            Selected Mood: {selectedMood}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Self-care tip: Take a moment to write down your thoughts or use the guided deep
            breathing widget.
          </p>
        </div>
      )}
    </div>
  );
}
