import React, { useState, useEffect } from 'react';

interface BreathingBubbleWidgetProps {
  title: string;
  subtitle?: string;
  properties: {
    defaultBreatheCycle?: string;
    visualBubbleColor?: string;
  };
}

export default function BreathingBubbleWidget({
  title,
  subtitle,
  properties,
}: BreathingBubbleWidgetProps) {
  const [isActive, setIsActive] = useState(false);
  const [breatheState, setBreatheState] = useState<'In' | 'Hold' | 'Out'>('In');
  const [secondsLeft, setSecondsLeft] = useState(4);

  const cycle = properties.defaultBreatheCycle || '4-7-8';
  const color = properties.visualBubbleColor || 'from-teal-400 to-emerald-500';

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (breatheState === 'In') {
            setBreatheState('Hold');
            return 7;
          } else if (breatheState === 'Hold') {
            setBreatheState('Out');
            return 8;
          } else {
            setBreatheState('In');
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, breatheState]);

  const toggleGuide = () => {
    setIsActive(!isActive);
    setBreatheState('In');
    setSecondsLeft(4);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm space-y-4 text-left flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-450 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-col items-center justify-center py-4 space-y-4">
        {/* Animated Circle */}
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} shadow-lg transition-all duration-[4000ms] flex items-center justify-center ${
            isActive && breatheState === 'In'
              ? 'scale-125'
              : isActive && breatheState === 'Out'
                ? 'scale-90'
                : 'scale-100'
          }`}
        >
          <div className="text-center text-white">
            <span className="text-[10px] font-bold tracking-wider uppercase block opacity-85">
              {isActive ? breatheState : 'Ready'}
            </span>
            <span className="text-sm font-black tracking-tight block mt-0.5">
              {isActive ? `${secondsLeft}s` : 'Focus'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleGuide}
          className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition cursor-pointer select-none"
        >
          {isActive ? 'Stop Guided Session' : 'Start Guided Session'}
        </button>
      </div>
    </div>
  );
}
