import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area
} from 'recharts';
import { 
  Volume2, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { PhoneticAnalysisResult } from '../types';
import { 
  analyzePersonPhonetics, 
  createAggregatePhoneticAnalysis, 
  comparePhoneticAnalysis 
} from '../utils/phoneticAnalysis';
import { AnalysisResult } from '../types';

interface PhoneticComparisonProps {
  analysisResult: AnalysisResult;
}

type ComparisonMode = '1vs1' | '1vsAll';

export function PhoneticComparison({ analysisResult }: PhoneticComparisonProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('1vs1');
  const [selectedPerson1, setSelectedPerson1] = useState<number>(0);
  const [selectedPerson2, setSelectedPerson2] = useState<number>(1);

  // Générer les analyses phonétiques pour tous les participants
  const phoneticAnalyses = useMemo(() => {
    return analysisResult.files.map(fileData => analyzePersonPhonetics(fileData));
  }, [analysisResult]);

  // Créer l'agrégé de tous les autres participants (pour le mode 1vsAll)
  const createOthersAggregate = (excludeIndex: number): PhoneticAnalysisResult => {
    const othersAnalyses = phoneticAnalyses.filter((_, index) => index !== excludeIndex);
    return createAggregatePhoneticAnalysis(othersAnalyses);
  };

  // Données de comparaison selon le mode
  const comparisonData = useMemo(() => {
    if (phoneticAnalyses.length < 2) return null;

    let analysis1: PhoneticAnalysisResult;
    let analysis2: PhoneticAnalysisResult;
    let comparison1Name: string;
    let comparison2Name: string;

    if (comparisonMode === '1vs1') {
      analysis1 = phoneticAnalyses[selectedPerson1];
      analysis2 = phoneticAnalyses[selectedPerson2];
      comparison1Name = analysis1.personName;
      comparison2Name = analysis2.personName;
    } else {
      // Mode 1vsAll
      analysis1 = phoneticAnalyses[selectedPerson1];
      analysis2 = createOthersAggregate(selectedPerson1);
      comparison1Name = analysis1.personName;
      comparison2Name = `Autres participants (${phoneticAnalyses.length - 1})`;
    }

    const comparison = comparePhoneticAnalysis(analysis1, analysis2);

    return {
      analysis1,
      analysis2,
      comparison1Name,
      comparison2Name,
      comparison
    };
  }, [phoneticAnalyses, comparisonMode, selectedPerson1, selectedPerson2]);

  // Données pour le graphique de précision par RSB
  const accuracyChartData = useMemo(() => {
    if (!comparisonData) return [];

    const { analysis1, analysis2 } = comparisonData;
    const allRsb = [...new Set([...analysis1.rsbLevels, ...analysis2.rsbLevels])].sort((a, b) => a - b);

    return allRsb.map(rsb => {
      const idx1 = analysis1.rsbLevels.findIndex(r => r === rsb);
      const idx2 = analysis2.rsbLevels.findIndex(r => r === rsb);
      
      return {
        rsb,
        person1: idx1 >= 0 ? analysis1.phoneticAccuracyByRsb[idx1] : null,
        person2: idx2 >= 0 ? analysis2.phoneticAccuracyByRsb[idx2] : null,
        difference: idx1 >= 0 && idx2 >= 0 ? 
          analysis1.phoneticAccuracyByRsb[idx1] - analysis2.phoneticAccuracyByRsb[idx2] : null
      };
    });
  }, [comparisonData]);

  // Données pour le graphique des erreurs par catégorie
  const categoryChartData = useMemo(() => {
    if (!comparisonData) return [];

    return comparisonData.comparison.categoryDifferences.map(cat => ({
      category: cat.category,
      person1: cat.person1Errors,
      person2: cat.person2Errors,
      difference: cat.difference
    }));
  }, [comparisonData]);

  if (phoneticAnalyses.length < 2) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <Volume2 className="w-6 h-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Comparaison phonétique</h3>
            <p className="text-sm text-amber-700">
              Il faut au moins 2 participants pour effectuer une comparaison phonétique.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!comparisonData) return null;

  const { comparison1Name, comparison2Name, comparison, analysis1, analysis2 } = comparisonData;

  return (
    <div className="space-y-6">
      {/* En-tête avec sélecteurs */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Volume2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Comparaison phonétique</h2>
              <p className="text-sm text-gray-600">Analyse comparative des erreurs phonémiques</p>
            </div>
          </div>
        </div>

        {/* Sélecteur de mode */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Mode de comparaison</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setComparisonMode('1vs1')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                comparisonMode === '1vs1'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1 vs 1</span>
            </button>
            <button
              onClick={() => setComparisonMode('1vsAll')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                comparisonMode === '1vsAll'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>1 vs Tous</span>
            </button>
          </div>
        </div>

        {/* Sélecteurs de participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {comparisonMode === '1vs1' ? 'Participant 1' : 'Participant à comparer'}
            </label>
            <select
              value={selectedPerson1}
              onChange={(e) => setSelectedPerson1(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {phoneticAnalyses.map((analysis, index) => (
                <option key={index} value={index}>
                  {analysis.personName}
                </option>
              ))}
            </select>
          </div>

          {comparisonMode === '1vs1' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Participant 2</label>
              <select
                value={selectedPerson2}
                onChange={(e) => setSelectedPerson2(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {phoneticAnalyses.map((analysis, index) => (
                  <option key={index} value={index} disabled={index === selectedPerson1}>
                    {analysis.personName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Aperçu de la comparaison */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="font-medium">{comparison1Name}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="font-medium">{comparison2Name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques de comparaison */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métriques comparatives</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {analysis1.totalAnalysis.phoneticAccuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-700 mt-1">Précision {comparison1Name.split(' ')[0]}</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-center space-x-2">
              {analysis1.totalAnalysis.phoneticAccuracy > analysis2.totalAnalysis.phoneticAccuracy ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className="text-lg font-bold text-gray-900">
                {Math.abs(analysis1.totalAnalysis.phoneticAccuracy - analysis2.totalAnalysis.phoneticAccuracy).toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Différence</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">
              {analysis2.totalAnalysis.phoneticAccuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-red-700 mt-1">Précision {comparison2Name.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* Graphique de précision par RSB */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Précision phonétique par niveau RSB
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accuracyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="rsb" 
                label={{ value: 'RSB (dB)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Précision (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: any, name: string) => [
                  value !== null ? `${value.toFixed(1)}%` : 'N/A',
                  name === 'person1' ? comparison1Name : comparison2Name
                ]}
                labelFormatter={(label) => `RSB: ${label} dB`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="person1"
                stroke="#3b82f6"
                strokeWidth={3}
                name={comparison1Name}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="person2"
                stroke="#ef4444"
                strokeWidth={3}
                name={comparison2Name}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphique des erreurs par catégorie */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Erreurs par catégorie phonémique
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis label={{ value: 'Nombre d\'erreurs', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: any, name: string) => [
                  value,
                  name === 'person1' ? comparison1Name : comparison2Name
                ]}
              />
              <Legend />
              <Bar
                dataKey="person1"
                fill="#3b82f6"
                name={comparison1Name}
              />
              <Bar
                dataKey="person2"
                fill="#ef4444"
                name={comparison2Name}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top confusions différentielles */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Principales différences de confusion
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-700 mb-3">Plus d'erreurs chez {comparison1Name.split(' ')[0]}</h4>
            <div className="space-y-2">
              {comparison.confusionDifferences
                .filter(conf => conf.difference > 0)
                .sort((a, b) => b.difference - a.difference)
                .slice(0, 5)
                .map((conf, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">/{conf.phoneme}/</span>
                    <span className="text-sm text-blue-600">+{conf.difference}</span>
                  </div>
                ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-red-700 mb-3">Plus d'erreurs chez {comparison2Name.split(' ')[0]}</h4>
            <div className="space-y-2">
              {comparison.confusionDifferences
                .filter(conf => conf.difference < 0)
                .sort((a, b) => a.difference - b.difference)
                .slice(0, 5)
                .map((conf, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">/{conf.phoneme}/</span>
                    <span className="text-sm text-red-600">+{Math.abs(conf.difference)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Résumé de la comparaison */}
      <div className="bg-gray-50 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la comparaison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">{comparison1Name}</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Erreurs totales: {analysis1.totalAnalysis.errors.length}</li>
              <li>• Précision: {analysis1.totalAnalysis.phoneticAccuracy.toFixed(1)}%</li>
              <li>• Distance phonétique: {analysis1.totalAnalysis.phoneticDistanceAvg.toFixed(1)}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">{comparison2Name}</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Erreurs totales: {analysis2.totalAnalysis.errors.length}</li>
              <li>• Précision: {analysis2.totalAnalysis.phoneticAccuracy.toFixed(1)}%</li>
              <li>• Distance phonétique: {analysis2.totalAnalysis.phoneticDistanceAvg.toFixed(1)}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}