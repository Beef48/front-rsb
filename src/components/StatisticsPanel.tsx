import React from 'react';
import { AnalysisResult } from '../types';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

interface StatisticsPanelProps {
  result: AnalysisResult;
}

export function StatisticsPanel({ result }: StatisticsPanelProps) {
  // Calculer quelques statistiques utiles
  const totalFiles = result.files.length;
  const averageValidWords = result.files.reduce((sum, file) => sum + file.validWords, 0) / totalFiles;
  const totalWordsProcessed = result.files.reduce((sum, file) => sum + file.validWords, 0);
  
  // Utiliser les statistiques globales si disponibles
  const globalStats = result.globalStatistics;
  
  // Trouver les RSB avec le meilleur et le pire taux de réussite
  const bestRSBIndex = result.average.percentages.indexOf(Math.max(...result.average.percentages));
  const worstRSBIndex = result.average.percentages.indexOf(Math.min(...result.average.percentages));
  
  const bestRSB = result.average.rsbGrid[bestRSBIndex];
  const bestPercentage = result.average.percentages[bestRSBIndex];
  const worstRSB = result.average.rsbGrid[worstRSBIndex];
  const worstPercentage = result.average.percentages[worstRSBIndex];

  const stats = [
    {
      icon: FileText,
      label: 'Fichiers analysés',
      value: totalFiles.toString(),
      color: 'text-primary-600',
      bgColor: 'bg-primary-50'
    },
    {
      icon: Users,
      label: 'Mots traités au total',
      value: totalWordsProcessed.toLocaleString(),
      color: 'text-success-600',
      bgColor: 'bg-success-50'
    },
    {
      icon: TrendingUp,
      label: globalStats ? 'Moyenne globale' : 'Meilleur RSB',
      value: globalStats ? `${(globalStats.means.reduce((a, b) => a + b, 0) / globalStats.means.length).toFixed(1)}%` : `${bestRSB} dB (${bestPercentage.toFixed(1)}%)`,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50'
    },
    {
      icon: BarChart3,
      label: globalStats ? 'Écart-type global' : 'Pire RSB',
      value: globalStats ? `±${(globalStats.standardDeviations.reduce((a, b) => a + b, 0) / globalStats.standardDeviations.length).toFixed(1)}%` : `${worstRSB} dB (${worstPercentage.toFixed(1)}%)`,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        {globalStats ? 'Statistiques de l\'analyse (avec données globales)' : 'Statistiques de l\'analyse'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="p-4 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Détails par fichier</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fichier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mots valides
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plage RSB
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meilleur score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result.files.map((file, index) => {
                const maxPercentage = Math.max(...file.percentages);
                const maxIndex = file.percentages.indexOf(maxPercentage);
                const bestRSBForFile = file.rsbPoints[maxIndex];
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {file.file}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {file.validWords} / {file.totalExpected}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Math.min(file.rsbStart, file.rsbEnd)} à {Math.max(file.rsbStart, file.rsbEnd)} dB
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {maxPercentage.toFixed(1)}% à {bestRSBForFile} dB
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}