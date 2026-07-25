import React from 'react';

interface StatsGridWidgetProps {
  title: string;
  subtitle?: string;
  properties: {
    metrics?: Array<{ label: string; value: string | number; change?: string; color?: string }>;
  };
}

export default function StatsGridWidget({ title, subtitle, properties }: StatsGridWidgetProps) {
  const metrics = properties.metrics || [];

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm space-y-4 text-left">
      <div>
        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-450 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1"
          >
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {metric.label}
            </span>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-base font-black ${metric.color || 'text-slate-850 dark:text-white'}`}
              >
                {metric.value}
              </span>
              {metric.change && (
                <span className="text-[9px] font-mono text-emerald-500 font-bold">
                  {metric.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
