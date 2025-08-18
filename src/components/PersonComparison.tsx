import React, { useState, useCallback } from 'react';
import { Users, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react';
import { PersonComparison as PersonComparisonType, RSBData, ComparisonMetrics } from '../types';
import { ExplanationTooltip } from './ExplanationTooltip';
import { Person } from '../services/api';
import { calculateComparisonMetrics } from '../utils/dataProcessor';
import apiService from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PersonComparisonProps {
  persons: Person[];
}

export function PersonComparison({ persons }: PersonComparisonProps) {
  const [selectedPerson1, setSelectedPerson1] = useState<Person | null>(null);
  const [selectedPerson2, setSelectedPerson2] = useState<Person | null>(null);
  const [comparison, setComparison] = useState<PersonComparisonType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonSelection = useCallback(async (person: Person, slot: 'person1' | 'person2') => {
    if (slot === 'person1') {
      setSelectedPerson1(person);
    } else {
      setSelectedPerson2(person);
    }

    // Si on a sélectionné les deux personnes, faire la comparaison
    const person1 = slot === 'person1' ? person : selectedPerson1;
    const person2 = slot === 'person2' ? person : selectedPerson2;

    if (person1 && person2 && person1.id !== person2.id) {
      setIsLoading(true);
      try {
        // Analyser les données des deux personnes
        const result = await apiService.analyzePersonsByName([person1.person_name, person2.person_name]);
        
        if (result.files.length >= 2) {
          const data1 = result.files.find(f => f.file === person1.person_name);
          const data2 = result.files.find(f => f.file === person2.person_name);

          if (data1 && data2) {
            const metrics1 = calculateComparisonMetrics(data1);
            const metrics2 = calculateComparisonMetrics(data2);

            const comparisonData: PersonComparisonType = {
              person1: {
                name: person1.person_name,
                data: data1,
                metrics: metrics1
              },
              person2: {
                name: person2.person_name,
                data: data2,
                metrics: metrics2
              },
              difference: {
                rsb0: metrics1.rsb0 && metrics2.rsb0 ? metrics1.rsb0 - metrics2.rsb0 : null,
                rsb50: metrics1.rsb50 && metrics2.rsb50 ? metrics1.rsb50 - metrics2.rsb50 : null,
                rsb100: metrics1.rsb100 && metrics2.rsb100 ? metrics1.rsb100 - metrics2.rsb100 : null,
                slope50: metrics1.slope50 && metrics2.slope50 ? metrics1.slope50 - metrics2.slope50 : null,
              }
            };

            setComparison(comparisonData);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la comparaison:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedPerson1, selectedPerson2]);

  const formatValue = (value: number | null, unit: string = '', decimals: number = 1): string => {
    if (value === null) return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
  };

  const formatDifference = (value: number | null, unit: string = '', decimals: number = 1): string => {
    if (value === null) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}${unit}`;
  };

  // Préparer les données pour le graphique
  const chartData = React.useMemo(() => {
    if (!comparison) return [];

    const { person1, person2 } = comparison;
    
    const data = [];
    const allRsb = [...new Set([...person1.data.rsbPoints, ...person2.data.rsbPoints])].sort((a, b) => a - b);

    for (const rsb of allRsb) {
      const idx1 = person1.data.rsbPoints.findIndex(r => r === rsb);
      const idx2 = person2.data.rsbPoints.findIndex(r => r === rsb);

      data.push({
        rsb,
        person1: idx1 >= 0 ? person1.data.percentages[idx1] : null,
        person2: idx2 >= 0 ? person2.data.percentages[idx2] : null,
      });
    }

    return data;
  }, [comparison]);

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Comparaison de deux personnes
        </h2>
      </div>

      {/* Sélection des personnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personne 1
          </label>
          <select
            value={selectedPerson1?.id || ''}
            onChange={(e) => {
              const person = persons.find(p => p.id.toString() === e.target.value);
              if (person) handlePersonSelection(person, 'person1');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner une personne...</option>
            {persons.map(person => (
              <option key={person.id} value={person.id}>
                {person.person_name} {person.age ? `(${person.age} ans)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personne 2
          </label>
          <select
            value={selectedPerson2?.id || ''}
            onChange={(e) => {
              const person = persons.find(p => p.id.toString() === e.target.value);
              if (person) handlePersonSelection(person, 'person2');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner une personne...</option>
            {persons
              .filter(p => p.id !== selectedPerson1?.id)
              .map(person => (
                <option key={person.id} value={person.id}>
                  {person.person_name} {person.age ? `(${person.age} ans)` : ''}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Calcul de la comparaison...</span>
        </div>
      )}

      {/* Résultats de la comparaison */}
      {comparison && !isLoading && (
        <div className="space-y-8">
          {/* Métriques clés */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Métriques remarquables
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* RSB 0% */}
              <div className="text-center">
                <ExplanationTooltip 
                  title="RSB pour 0% d'intelligibilité"
                  explanation="Niveau de rapport signal/bruit où la compréhension devient impossible. Plus cette valeur est élevée, plus la personne résiste au bruit avant de perdre complètement l'intelligibilité."
                >
                  <div className="text-sm text-gray-600 mb-2 cursor-help">RSB pour 0% d'intelligibilité</div>
                </ExplanationTooltip>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-blue-600">
                    {formatValue(comparison.person1.metrics.rsb0, ' dB')}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatValue(comparison.person2.metrics.rsb0, ' dB')}
                  </div>
                  <div className="text-sm font-medium text-orange-600">
                    Diff: {formatDifference(comparison.difference.rsb0, ' dB')}
                  </div>
                </div>
              </div>

              {/* RSB 50% */}
              <div className="text-center">
                <ExplanationTooltip 
                  title="RSB pour 50% d'intelligibilité"
                  explanation="Seuil critique où la moitié des mots sont correctement compris. C'est un indicateur clé utilisé en audiologie pour évaluer les performances auditives et définir les stratégies de réhabilitation."
                >
                  <div className="text-sm text-gray-600 mb-2 cursor-help">RSB pour 50% d'intelligibilité</div>
                </ExplanationTooltip>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-blue-600">
                    {formatValue(comparison.person1.metrics.rsb50, ' dB')}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatValue(comparison.person2.metrics.rsb50, ' dB')}
                  </div>
                  <div className="text-sm font-medium text-orange-600">
                    Diff: {formatDifference(comparison.difference.rsb50, ' dB')}
                  </div>
                </div>
              </div>

              {/* RSB 100% */}
              <div className="text-center">
                <ExplanationTooltip 
                  title="RSB pour 100% d'intelligibilité"
                  explanation="Conditions optimales où tous les mots sont correctement compris. Indique le niveau minimal de rapport signal/bruit nécessaire pour une compréhension parfaite."
                >
                  <div className="text-sm text-gray-600 mb-2 cursor-help">RSB pour 100% d'intelligibilité</div>
                </ExplanationTooltip>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-blue-600">
                    {formatValue(comparison.person1.metrics.rsb100, ' dB')}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatValue(comparison.person2.metrics.rsb100, ' dB')}
                  </div>
                  <div className="text-sm font-medium text-orange-600">
                    Diff: {formatDifference(comparison.difference.rsb100, ' dB')}
                  </div>
                </div>
              </div>

              {/* Pente à 50% */}
              <div className="text-center">
                <ExplanationTooltip 
                  title="Pente au RSB 50%"
                  explanation="Vitesse de dégradation de l'intelligibilité autour du seuil de 50%. Une pente forte indique une transition rapide entre compréhension et incompréhension. Mesurée en % d'intelligibilité par dB de RSB."
                >
                  <div className="text-sm text-gray-600 mb-2 cursor-help">Pente au RSB 50%</div>
                </ExplanationTooltip>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-blue-600">
                    {formatValue(comparison.person1.metrics.slope50, '%/dB')}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatValue(comparison.person2.metrics.slope50, '%/dB')}
                  </div>
                  <div className="text-sm font-medium text-orange-600">
                    Diff: {formatDifference(comparison.difference.slope50, '%/dB')}
                  </div>
                </div>
              </div>
            </div>

            {/* Légende */}
            <div className="mt-4 flex justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span>{comparison.person1.name}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span>{comparison.person2.name}</span>
              </div>
              <div className="flex items-center">
                <ArrowUpDown className="w-3 h-3 text-orange-500 mr-2" />
                <span>Différence (P1 - P2)</span>
              </div>
            </div>
          </div>

          {/* Graphique de comparaison */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Courbes de performance RSB
            </h3>
            
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="rsb" 
                    label={{ value: 'RSB (dB)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Intelligibilité (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      const personName = name === 'person1' ? comparison?.person1.name : comparison?.person2.name;
                      return [
                        value !== null ? `${value.toFixed(1)}%` : 'N/A', 
                        personName || name
                      ];
                    }}
                    labelFormatter={(rsb: number) => `RSB: ${rsb} dB`}
                  />
                  <Legend />
                  
                  {/* Lignes de référence */}
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="2 2" />
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="2 2" />
                  
                  <Line
                    type="monotone"
                    dataKey="person1"
                    name={comparison.person1.name}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="person2"
                    name={comparison.person2.name}
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">{comparison.person1.name}</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Mots valides: {comparison.person1.data.validWords}/{comparison.person1.data.totalExpected}</div>
                <div>Plage RSB: {comparison.person1.data.rsbStart} à {comparison.person1.data.rsbEnd} dB</div>
                <div>Points de mesure: {comparison.person1.data.rsbPoints.length}</div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">{comparison.person2.name}</h4>
              <div className="text-sm text-green-700 space-y-1">
                <div>Mots valides: {comparison.person2.data.validWords}/{comparison.person2.data.totalExpected}</div>
                <div>Plage RSB: {comparison.person2.data.rsbStart} à {comparison.person2.data.rsbEnd} dB</div>
                <div>Points de mesure: {comparison.person2.data.rsbPoints.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* État vide */}
      {!comparison && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Sélectionnez deux personnes pour commencer la comparaison</p>
        </div>
      )}
    </div>
  );
}