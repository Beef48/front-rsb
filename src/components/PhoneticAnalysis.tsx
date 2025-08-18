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
  PieChart,
  Pie,
  Cell,
  Treemap
} from 'recharts';
import { 
  Volume2, 
  TrendingDown, 
  AlertTriangle, 
  PieChart as PieChartIcon,
  BarChart3,
  Target
} from 'lucide-react';
import { PhoneticAnalysisResult, PhonemeConfusion } from '../types';
import { ExplanationTooltip } from './ExplanationTooltip';
import { getPhoneticExplanation } from '../utils/phoneticExplanations';

interface PhoneticAnalysisProps {
  analysis: PhoneticAnalysisResult;
}

export function PhoneticAnalysis({ analysis }: PhoneticAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'confusion' | 'categories' | 'position'>('overview');

  // Préparer les données pour les graphiques
  const accuracyChartData = useMemo(() => {
    return analysis.rsbLevels.map((rsb, index) => ({
      rsb,
      phoneticAccuracy: analysis.phoneticAccuracyByRsb[index],
      globalAccuracy: analysis.analysisByRsb[rsb] ? 
        (analysis.analysisByRsb[rsb].correctPhonemes / analysis.analysisByRsb[rsb].totalPhonemes) * 100 : 0
    }));
  }, [analysis]);

  const categoryErrorsData = useMemo(() => {
    const categories = analysis.totalAnalysis.errorsByCategory;
    return [
      { name: 'Voyelles', count: categories.voyelles.length, color: '#3b82f6' },
      { name: 'Consonnes', count: categories.consonnes.length, color: '#ef4444' },
      { name: 'Nasales', count: categories.nasales.length, color: '#f59e0b' },
      { name: 'Occlusives', count: categories.occlusives.length, color: '#10b981' },
      { name: 'Fricatives', count: categories.fricatives.length, color: '#8b5cf6' }
    ].filter(item => item.count > 0);
  }, [analysis]);

  const positionErrorsData = useMemo(() => {
    const positions = analysis.totalAnalysis.errorsByPosition;
    return [
      { name: 'Début', count: positions.debut.length, color: '#06b6d4' },
      { name: 'Milieu', count: positions.milieu.length, color: '#f59e0b' },
      { name: 'Fin', count: positions.fin.length, color: '#ef4444' }
    ].filter(item => item.count > 0);
  }, [analysis]);

  const topConfusions = useMemo(() => {
    return analysis.totalAnalysis.confusionMatrix
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(confusion => ({
        confusion: `${confusion.targetPhoneme} → ${confusion.responsePhoneme}`,
        count: confusion.count,
        percentage: confusion.percentage.toFixed(1),
        avgRsb: confusion.avgRsb.toFixed(1)
      }));
  }, [analysis]);

  const confusionMatrixData = useMemo(() => {
    // Créer une matrice de confusion simplifiée pour visualisation
    const matrix = analysis.totalAnalysis.confusionMatrix;
    const targetPhonemes = [...new Set(matrix.map(c => c.targetPhoneme))];
    const responsePhonemes = [...new Set(matrix.map(c => c.responsePhoneme))];
    
    return targetPhonemes.map(target => {
      const targetData: any = { target };
      responsePhonemes.forEach(response => {
        const confusion = matrix.find(c => c.targetPhoneme === target && c.responsePhoneme === response);
        targetData[response] = confusion ? confusion.count : 0;
      });
      return targetData;
    });
  }, [analysis]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316'];

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Volume2 className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Analyse phonétique - {analysis.personName}
          </h2>
          <ExplanationTooltip {...getPhoneticExplanation('phoneticAccuracy')}>
            <p className="text-gray-600">
              Précision phonétique globale: {analysis.totalAnalysis.phoneticAccuracy.toFixed(1)}%
            </p>
          </ExplanationTooltip>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <ExplanationTooltip {...getPhoneticExplanation('phoneticAccuracy')}>
          <div className="bg-blue-50 p-4 rounded-lg text-center cursor-help">
            <div className="text-2xl font-bold text-blue-600">
              {analysis.totalAnalysis.phoneticAccuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-800">Précision phonétique</div>
          </div>
        </ExplanationTooltip>
        
        <ExplanationTooltip {...getPhoneticExplanation('phoneticErrors')}>
          <div className="bg-red-50 p-4 rounded-lg text-center cursor-help">
            <div className="text-2xl font-bold text-red-600">
              {analysis.totalAnalysis.errors.length}
            </div>
            <div className="text-sm text-red-800">Erreurs phonétiques</div>
          </div>
        </ExplanationTooltip>
        
        <ExplanationTooltip {...getPhoneticExplanation('phoneticDistance')}>
          <div className="bg-orange-50 p-4 rounded-lg text-center cursor-help">
            <div className="text-2xl font-bold text-orange-600">
              {analysis.totalAnalysis.phoneticDistanceAvg.toFixed(1)}
            </div>
            <div className="text-sm text-orange-800">Distance moyenne</div>
          </div>
        </ExplanationTooltip>
        
        <ExplanationTooltip {...getPhoneticExplanation('confusionTypes')}>
          <div className="bg-green-50 p-4 rounded-lg text-center cursor-help">
            <div className="text-2xl font-bold text-green-600">
              {analysis.totalAnalysis.confusionMatrix.length}
            </div>
            <div className="text-sm text-green-800">Types de confusions</div>
          </div>
        </ExplanationTooltip>
      </div>

      {/* Onglets */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'confusion', label: 'Confusions', icon: AlertTriangle },
          { id: 'categories', label: 'Catégories', icon: PieChartIcon },
          { id: 'position', label: 'Position', icon: Target }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Précision phonétique par RSB */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <ExplanationTooltip {...getPhoneticExplanation('rsbEvolution')}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center cursor-help">
                <TrendingDown className="w-5 h-5 mr-2" />
                Précision phonétique par niveau RSB
              </h3>
            </ExplanationTooltip>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="rsb" 
                    label={{ value: 'RSB (dB)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Précision (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${value.toFixed(1)}%`,
                      name === 'phoneticAccuracy' ? 'Précision phonétique' : 'Précision globale'
                    ]}
                    labelFormatter={(rsb: number) => `RSB: ${rsb} dB`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="phoneticAccuracy"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    name="Précision phonétique"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'confusion' && (
        <div className="space-y-8">
          {/* Top confusions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <ExplanationTooltip {...getPhoneticExplanation('confusionMatrix')}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 cursor-help">
                Top 10 des confusions phonétiques
              </h3>
            </ExplanationTooltip>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Confusion</th>
                    <ExplanationTooltip 
                      title="Occurrences" 
                      explanation="Nombre de fois où cette confusion phonétique s'est produite dans l'ensemble des tests."
                    >
                      <th className="text-right py-2 px-4 cursor-help">Occurrences</th>
                    </ExplanationTooltip>
                    <ExplanationTooltip 
                      title="Pourcentage" 
                      explanation="Fréquence relative de cette confusion par rapport au nombre total de phonèmes testés."
                    >
                      <th className="text-right py-2 px-4 cursor-help">Pourcentage</th>
                    </ExplanationTooltip>
                    <ExplanationTooltip 
                      title="RSB moyen" 
                      explanation="Niveau moyen de rapport signal/bruit auquel cette confusion se produit. Plus la valeur est faible, plus la confusion survient dans des conditions difficiles."
                    >
                      <th className="text-right py-2 px-4 cursor-help">RSB moyen</th>
                    </ExplanationTooltip>
                  </tr>
                </thead>
                <tbody>
                  {topConfusions.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4 font-mono text-lg">{item.confusion}</td>
                      <td className="text-right py-2 px-4">{item.count}</td>
                      <td className="text-right py-2 px-4">{item.percentage}%</td>
                      <td className="text-right py-2 px-4">{item.avgRsb} dB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graphique des confusions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Distribution des confusions
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topConfusions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="confusion" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      value,
                      name === 'count' ? 'Occurrences' : name
                    ]}
                  />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Erreurs par catégorie - Graphique en barres */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <ExplanationTooltip {...getPhoneticExplanation('consonants')}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 cursor-help">
                Erreurs par catégorie phonétique
              </h3>
            </ExplanationTooltip>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryErrorsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Erreurs par catégorie - Camembert */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Répartition des erreurs
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryErrorsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryErrorsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'position' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Erreurs par position - Graphique en barres */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <ExplanationTooltip {...getPhoneticExplanation('wordBeginning')}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 cursor-help">
                Erreurs par position dans le mot
              </h3>
            </ExplanationTooltip>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionErrorsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Erreurs par position - Camembert */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Répartition par position
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={positionErrorsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {positionErrorsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Résumé textuel */}
      <div className="mt-8 bg-gray-50 p-6 rounded-xl">
        <ExplanationTooltip {...getPhoneticExplanation('phoneticProfile')}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 cursor-help">Résumé de l'analyse</h3>
        </ExplanationTooltip>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Performance générale</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Phonèmes corrects: {analysis.totalAnalysis.correctPhonemes}/{analysis.totalAnalysis.totalPhonemes}</li>
              <li>• Précision phonétique: {analysis.totalAnalysis.phoneticAccuracy.toFixed(1)}%</li>
              <li>• Distance phonétique moyenne: {analysis.totalAnalysis.phoneticDistanceAvg.toFixed(1)}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Erreurs principales</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Total des erreurs: {analysis.totalAnalysis.errors.length}</li>
              <li>• Confusions uniques: {analysis.totalAnalysis.confusionMatrix.length}</li>
              <li>• RSB le plus difficile: {analysis.rsbLevels[analysis.phoneticAccuracyByRsb.indexOf(Math.min(...analysis.phoneticAccuracyByRsb))]} dB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}