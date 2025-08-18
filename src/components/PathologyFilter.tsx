import React, { useMemo } from 'react';
import { Filter } from 'lucide-react';

interface PathologyFilterProps {
  availablePathologies: string[];
  selectedPathologies: string[];
  onChange: (selected: string[]) => void;
  includeNoPathology?: boolean;
  className?: string;
}

const NONE_SENTINEL = '__NONE__';

export function PathologyFilter({
  availablePathologies,
  selectedPathologies,
  onChange,
  includeNoPathology = true,
  className = '',
}: PathologyFilterProps) {
  const items = useMemo(() => {
    const unique = Array.from(
      new Set(
        (availablePathologies || [])
          .map((p) => (typeof p === 'string' ? p.trim() : ''))
          .filter((p) => p.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [availablePathologies]);

  const toggle = (value: string) => {
    const next = selectedPathologies.includes(value)
      ? selectedPathologies.filter((v) => v !== value)
      : [...selectedPathologies, value];
    onChange(next);
  };

  const clearAll = () => onChange([]);

  const selectedCount = selectedPathologies.filter((v) => v !== NONE_SENTINEL).length +
    (selectedPathologies.includes(NONE_SENTINEL) ? 1 : 0);

  return (
    <div className={`bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtre par pathologie</h3>
          {selectedCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {selectedCount}
            </span>
          )}
        </div>
        {selectedPathologies.length > 0 && (
          <button onClick={clearAll} className="text-sm text-primary-600 hover:text-primary-700 underline">
            Réinitialiser
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {includeNoPathology && (
            <button
              type="button"
              onClick={() => toggle(NONE_SENTINEL)}
              className={`px-3 py-1 rounded-full border text-sm ${selectedPathologies.includes(NONE_SENTINEL)
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Sans pathologie
            </button>
          )}
          {items.length === 0 && (
            <span className="text-sm text-gray-500">Aucune pathologie enregistrée.</span>
          )}
          {items.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={`px-3 py-1 rounded-full border text-sm ${selectedPathologies.includes(p)
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PathologyFilter;

export { NONE_SENTINEL };

