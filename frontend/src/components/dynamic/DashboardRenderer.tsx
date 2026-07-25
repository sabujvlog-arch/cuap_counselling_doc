import React, { useEffect, useState } from 'react';
import { DashboardConfigSchema, WidgetLayout } from '@/types';
import { COMPONENT_REGISTRY } from './ComponentRegistry';

interface DashboardRendererProps {
  config: DashboardConfigSchema;
  userRole: 'student' | 'provider' | 'admin' | 'dept-head';
  userPermissions: string[];
}

const WIDTH_MAP: Record<string, string> = {
  full: 'col-span-12',
  'two-thirds': 'col-span-12 lg:col-span-8',
  half: 'col-span-12 lg:col-span-6',
  third: 'col-span-12 lg:col-span-4',
};

export default function DashboardRenderer({
  config,
  userRole,
  userPermissions,
}: DashboardRendererProps) {
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config.globalFeatureFlags) {
      setFeatureFlags(config.globalFeatureFlags);
    }
  }, [config]);

  // Check Role-Based Access Control before displaying a widget
  const checkRbac = (widget: WidgetLayout): boolean => {
    if (!widget.rbac) return true;
    const { allowedRoles, requiredPermissions } = widget.rbac;

    const roleAllowed = allowedRoles.includes(userRole);
    if (!roleAllowed) return false;

    if (requiredPermissions && requiredPermissions.length > 0) {
      return requiredPermissions.every((p) => userPermissions.includes(p));
    }
    return true;
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      {config.sections.map((section) => (
        <div key={section.id} className="space-y-4 text-left">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {section.sectionTitle}
            </h2>
            {section.sectionSubtitle && (
              <p className="text-xs text-slate-400 mt-1">{section.sectionSubtitle}</p>
            )}
          </div>

          {/* Grid Layout Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {section.widgets
              .filter(checkRbac)
              .sort((a, b) => a.order - b.order)
              .map((widget) => {
                const WidgetComponent = COMPONENT_REGISTRY[widget.type];
                if (!WidgetComponent) {
                  return (
                    <div
                      key={widget.id}
                      className="col-span-12 p-4 border border-dashed border-red-500 text-red-500 rounded-xl text-xs font-bold"
                    >
                      Error: Component Type [{widget.type}] not registered in System registry.
                    </div>
                  );
                }

                const widthClass = WIDTH_MAP[widget.width] || 'col-span-12';

                return (
                  <div key={widget.id} className={`${widthClass} h-full`}>
                    <WidgetComponent
                      title={widget.title}
                      subtitle={widget.subtitle}
                      properties={widget.properties || {}}
                      dataFeed={widget.dataFeed}
                      featureFlags={featureFlags}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
