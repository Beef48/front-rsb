import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';

interface AgeFilterProps {
  onAgeRangeChange: (minAge: number, maxAge: number) => void;
  availableAges?: number[];
  className?: string;
}

const AgeFilter: React.FC<AgeFilterProps> = ({ 
  onAgeRangeChange, 
  availableAges = [], 
  className = "" 
}) => {
  const [minAge, setMinAge] = useState<number>(0);
  const [maxAge, setMaxAge] = useState<number>(100);
  const [localMinAge, setLocalMinAge] = useState<number>(0);
  const [localMaxAge, setLocalMaxAge] = useState<number>(100);

  // Calculer les âges min/max disponibles
  const actualMinAge = availableAges.length > 0 ? Math.min(...availableAges) : 0;
  const actualMaxAge = availableAges.length > 0 ? Math.max(...availableAges) : 100;

  useEffect(() => {
    setMinAge(actualMinAge);
    setMaxAge(actualMaxAge);
    setLocalMinAge(actualMinAge);
    setLocalMaxAge(actualMaxAge);
  }, [actualMinAge, actualMaxAge]);

  const handleMinAgeChange = (value: number) => {
    const newMinAge = Math.min(value, localMaxAge - 1);
    setLocalMinAge(newMinAge);
    onAgeRangeChange(newMinAge, localMaxAge);
  };

  const handleMaxAgeChange = (value: number) => {
    const newMaxAge = Math.max(value, localMinAge + 1);
    setLocalMaxAge(newMaxAge);
    onAgeRangeChange(localMinAge, newMaxAge);
  };

  const handleReset = () => {
    setLocalMinAge(actualMinAge);
    setLocalMaxAge(actualMaxAge);
    onAgeRangeChange(actualMinAge, actualMaxAge);
  };

  const isFilterActive = localMinAge > actualMinAge || localMaxAge < actualMaxAge;

  return (
    <div className={`bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtre par âge</h3>
        </div>
        {isFilterActive && (
          <button
            onClick={handleReset}
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Affichage de la plage sélectionnée */}
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">
            {localMinAge} - {localMaxAge} ans
          </div>
          <div className="text-sm text-gray-500">
            {availableAges.length > 0 && (
              <span>
                {availableAges.filter(age => age >= localMinAge && age <= localMaxAge).length} 
                participant(s) sur {availableAges.length} total
              </span>
            )}
          </div>
        </div>

        {/* Curseur pour l'âge minimum */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Âge minimum: {localMinAge} ans
          </label>
          <input
            type="range"
            min={actualMinAge}
            max={actualMaxAge}
            value={localMinAge}
            onChange={(e) => handleMinAgeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localMinAge - actualMinAge) / (actualMaxAge - actualMinAge)) * 100}%, #e5e7eb ${((localMinAge - actualMinAge) / (actualMaxAge - actualMinAge)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        {/* Curseur pour l'âge maximum */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Âge maximum: {localMaxAge} ans
          </label>
          <input
            type="range"
            min={actualMinAge}
            max={actualMaxAge}
            value={localMaxAge}
            onChange={(e) => handleMaxAgeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${((localMaxAge - actualMinAge) / (actualMaxAge - actualMinAge)) * 100}%, #3b82f6 ${((localMaxAge - actualMinAge) / (actualMaxAge - actualMinAge)) * 100}%, #3b82f6 100%)`
            }}
          />
        </div>

        {/* Indicateur visuel de la plage */}
        <div className="relative pt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{actualMinAge} ans</span>
            <span>{actualMaxAge} ans</span>
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full">
            <div 
              className="absolute h-2 bg-primary-500 rounded-full"
              style={{
                left: `${((localMinAge - actualMinAge) / (actualMaxAge - actualMinAge)) * 100}%`,
                width: `${((localMaxAge - localMinAge) / (actualMaxAge - actualMinAge)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>


    </div>
  );
};

export default AgeFilter; 