import React, { useState } from 'react';

interface SchemaFormGeneratorProps {
  title: string;
  subtitle?: string;
  properties: {
    fields?: Array<{
      name: string;
      label: string;
      type: 'text' | 'textarea' | 'select' | 'checkbox';
      placeholder?: string;
      required?: boolean;
      options?: Array<{ label: string; value: string }>;
    }>;
    submitLabel?: string;
  };
}

export default function SchemaFormGenerator({
  title,
  subtitle,
  properties,
}: SchemaFormGeneratorProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const fields = properties.fields || [];
  const submitLabel = properties.submitLabel || 'Submit Data';

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Form submitted with values: ${JSON.stringify(formData, null, 2)}`);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm space-y-4 text-left">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full min-h-[80px] p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-55/30 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none"
              />
            ) : field.type === 'select' ? (
              <select
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-55/30 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none font-semibold"
              >
                <option value="">Select option...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  required={field.required}
                  className="rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500">{field.placeholder || field.label}</span>
              </div>
            ) : (
              <input
                type="text"
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-55/30 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
