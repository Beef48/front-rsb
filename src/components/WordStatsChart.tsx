import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, TrendingUp, AlertCircle, Loader } from 'lucide-react';
import { WordStats, ErrorStats } from '../services/api';
import apiService from '../services/api';

export function WordStatsChart() {
  const [wordStats, setWordStats] = useState<WordStats[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'success' | 'errors'>('success');
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [words, errors] = await Promise.all([
        apiService.getWordStats(),
        apiService.getErrorStats()
      ]);
      setWordStats(words);
      setErrorStats(errors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const successData = wordStats
    .slice(0, limit)
    .map(stat => ({
      word: stat.word,
      successRate: stat.rate,
      totalAttempts: stat.total,
      successes: stat.success,
      failures: stat.total - stat.success
    }));

  const errorData = errorStats
    .slice(0, limit)
    .map(stat => ({
      word: stat.word,
      errorCount: stat.errors
    }));

  const currentData = viewMode === 'success' ? successData : errorData;

  // Type guards pour TypeScript
  const isSuccessData = (item: any): item is typeof successData[0] => 'successRate' in item;
  const isErrorData = (item: any): item is typeof errorData[0] => 'errorCount' in item;

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Chargement des statistiques des mots...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-3 text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Statistiques des mots
            </h3>
            <p className="text-sm text-gray-600">
              Performance par mot dans la base de données
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Sélecteur de vue */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('success')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'success'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Taux de réussite
            </button>
            <button
              onClick={() => setViewMode('errors')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'errors'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Erreurs
            </button>
          </div>

          {/* Sélecteur de limite */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={20}>Top 20</option>
            <option value={30}>Top 30</option>
          </select>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Mots analysés</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {wordStats.length}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Moyenne réussite</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {wordStats.length > 0 
              ? (wordStats.reduce((sum, stat) => sum + stat.rate, 0) / wordStats.length).toFixed(1)
              : '0'
            }%
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Total tentatives</span>
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {wordStats.reduce((sum, stat) => sum + stat.total, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Graphique */}
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="word"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={viewMode === 'success' ? [0, 100] : [0, 'dataMax + 1']}
              label={{ 
                value: viewMode === 'success' ? 'Taux de réussite (%)' : 'Nombre d\'erreurs', 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Taux de réussite (%)') return [`${Number(value).toFixed(1)}%`, name];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />

            {viewMode === 'success' ? (
              <>
                <Bar
                  dataKey="successRate"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="Taux de réussite (%)"
                />
                <Bar
                  dataKey="successes"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  name="Succès"
                />
                <Bar
                  dataKey="failures"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  name="Échecs"
                />
              </>
            ) : (
              <Bar
                dataKey="errorCount"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                name="Nombre d'erreurs"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau détaillé */}
      <div className="mt-8">
        <h4 className="font-medium text-gray-900 mb-4">
          {viewMode === 'success' ? 'Détail des taux de réussite' : 'Détail des erreurs'}
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mot
                </th>
                {viewMode === 'success' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taux de réussite
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Succès
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre d'erreurs
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.word}
                  </td>
                                     {viewMode === 'success' && isSuccessData(item) ? (
                     <>
                       <td className="px-4 py-3 text-sm text-gray-600">
                         <span className={`font-medium ${
                           item.successRate >= 80 ? 'text-green-600' :
                           item.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                         }`}>
                           {item.successRate}%
                         </span>
                       </td>
                       <td className="px-4 py-3 text-sm text-gray-600">
                         {item.successes}
                       </td>
                       <td className="px-4 py-3 text-sm text-gray-600">
                         {item.totalAttempts}
                       </td>
                     </>
                   ) : viewMode === 'errors' && isErrorData(item) ? (
                     <td className="px-4 py-3 text-sm text-gray-600">
                       <span className="font-medium text-red-600">
                         {item.errorCount}
                       </span>
                     </td>
                   ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 