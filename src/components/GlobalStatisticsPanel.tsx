import React from 'react';
import { TrendingUp, BarChart3, Users } from 'lucide-react';

interface GlobalStatisticsPanelProps {
  globalStatistics: {
    rsbGrid: number[];
    means: number[];
    standardDeviations: number[];
    lowerLimits: number[];
    upperLimits: number[];
    totalPersons: number;
  };
}

export function GlobalStatisticsPanel({ globalStatistics }: GlobalStatisticsPanelProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Statistiques de l'analyse sélectionnée
          </h3>
          <p className="text-sm text-gray-600">
            Calculées sur les personnes sélectionnées uniquement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne utilisateur */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Moyenne utilisateur</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {(globalStatistics.means.reduce((a, b) => a + b, 0) / globalStatistics.means.length).toFixed(1)}%
          </div>
          <div className="text-xs text-blue-700">
            Performance moyenne
          </div>
        </div>

        {/* Écart-type */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Écart-type</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            ±{(globalStatistics.standardDeviations.reduce((a, b) => a + b, 0) / globalStatistics.standardDeviations.length).toFixed(1)}%
          </div>
          <div className="text-xs text-purple-700">
            Variabilité des performances
          </div>
        </div>

        {/* Limite inférieure */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Limite inférieure</span>
          </div>
          <div className="text-2xl font-bold text-red-900">
            {(globalStatistics.lowerLimits.reduce((a, b) => a + b, 0) / globalStatistics.lowerLimits.length).toFixed(1)}%
          </div>
          <div className="text-xs text-red-700">
            μ - σ (68% des données)
          </div>
        </div>

        {/* Limite supérieure */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Limite supérieure</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {(globalStatistics.upperLimits.reduce((a, b) => a + b, 0) / globalStatistics.upperLimits.length).toFixed(1)}%
          </div>
          <div className="text-xs text-green-700">
            μ + σ (68% des données)
          </div>
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Base de données
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Statistiques calculées sur <strong>{globalStatistics.totalPersons} personne(s) sélectionnée(s)</strong>. 
          Les limites de confiance (μ±σ) représentent l'intervalle dans lequel se trouvent 68% 
          des performances observées pour ce groupe spécifique.
        </p>
      </div>
    </div>
  );
} 