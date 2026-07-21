import React from 'react';
import { PORTALS, PortalId } from '@/constants/app';
import { ArrowRight } from 'lucide-react';

interface PortalSelectorProps {
  onSelect: (portalId: PortalId) => void;
}

const PortalSelector: React.FC<PortalSelectorProps> = ({ onSelect }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
          Select Your Login Portal
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Choose the appropriate portal to access the wellness counseling system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <div
              key={portal.id}
              onClick={() => onSelect(portal.id)}
              className="group relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-transparent overflow-hidden"
            >
              {/* Hover gradient background */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{ background: portal.gradientCss }}
              />

              <div className="mb-6 relative z-10">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 transform group-hover:scale-110 transition-transform duration-300"
                  style={{ background: portal.gradientCss }}
                >
                  <Icon size={28} />
                </div>

                <span
                  className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3 bg-${portal.accent}-50 text-${portal.accent}-600 dark:bg-${portal.accent}-500/10 dark:text-${portal.accent}-400 border border-${portal.accent}-200/50 dark:border-${portal.accent}-500/20`}
                >
                  {portal.badge}
                </span>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {portal.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
                  {portal.description}
                </p>
              </div>

              <div
                className="flex items-center text-sm font-bold mt-auto relative z-10"
                style={{ color: 'var(--text)' }}
              >
                <span
                  className="flex-1 opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ color: `var(--${portal.accent})` }}
                >
                  Access Portal
                </span>
                <ArrowRight
                  size={16}
                  className="transform group-hover:translate-x-1 transition-transform"
                  style={{ color: `var(--${portal.accent})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortalSelector;
