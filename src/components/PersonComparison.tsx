import React, { useState, useCallback } from 'react';
import { Users, TrendingUp, BarChart3, ArrowUpDown, Database } from 'lucide-react';
import { PersonComparison as PersonComparisonType, RSBData, ComparisonMetrics } from '../types';
import { ExplanationTooltip } from './ExplanationTooltip';
import { Person } from '../services/api';
import { calculateComparisonMetrics, calculateAverageAndStats } from '../utils/dataProcessor';
import apiService from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

interface PersonComparisonProps {
  persons: Person[];
  preSelectedPerson1?: Person | null;
  preSelectedPerson2?: Person | null;
}

// Option spéciale pour l'utilisateur agrégé
const AGGREGATE_USER: Person = {
  id: -1,
  person_name: '📊 Utilisateur Agrégé (Moyenne utilisateur)',
  age: null,
  test_date: null
};

export function PersonComparison({ persons, preSelectedPerson1, preSelectedPerson2 }: PersonComparisonProps) {
  const [selectedPerson1, setSelectedPerson1] = useState<Person | null>(preSelectedPerson1 || null);
  const [selectedPerson2, setSelectedPerson2] = useState<Person | null>(preSelectedPerson2 || null);
  const [comparison, setComparison] = useState<PersonComparisonType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour créer l'utilisateur agrégé
  const createAggregateUser = async (): Promise<RSBData> => {
    try {
      // Récupérer tous les utilisateurs de la base
      const allPersonsNames = persons.map(p => p.person_name);
      const result = await apiService.analyzePersonsByName(allPersonsNames);
      
      if (result.files.length === 0) {
        throw new Error('Aucune donnée disponible pour l\'agrégation');
      }

      // Calculer les moyennes sur tous les utilisateurs
      const analysisResult = calculateAverageAndStats(result.files);
      
      // Calculer les intervalles de confiance ±1σ et ±2σ
      const confidenceInterval1 = {
        lower: analysisResult.average.percentages.map((mean, i) => 
          Math.max(0, mean - analysisResult.average.standardDeviation[i])
        ),
        upper: analysisResult.average.percentages.map((mean, i) => 
          Math.min(100, mean + analysisResult.average.standardDeviation[i])
        )
      };
      
      const confidenceInterval2 = {
        lower: analysisResult.average.percentages.map((mean, i) => 
          Math.max(0, mean - 2 * analysisResult.average.standardDeviation[i])
        ),
        upper: analysisResult.average.percentages.map((mean, i) => 
          Math.min(100, mean + 2 * analysisResult.average.standardDeviation[i])
        )
      };
      
      // Créer un objet RSBData virtuel basé sur les moyennes
      const aggregateData: RSBData = {
        file: AGGREGATE_USER.person_name,
        rsbPoints: analysisResult.average.rsbGrid,
        percentages: analysisResult.average.percentages,
        averageTimes: analysisResult.average.times,
        rsbStart: Math.max(...result.files.map(f => Math.max(f.rsbStart, f.rsbEnd))),
        rsbEnd: Math.min(...result.files.map(f => Math.min(f.rsbStart, f.rsbEnd))),
        validWords: Math.round(result.files.reduce((sum, f) => sum + f.validWords, 0) / result.files.length),
        totalExpected: Math.round(result.files.reduce((sum, f) => sum + f.totalExpected, 0) / result.files.length),
        wordTests: [], // Les tests de mots individuels ne sont pas pertinents pour l'agrégé
        // Données statistiques pour l'affichage des intervalles de confiance
        standardDeviation: analysisResult.average.standardDeviation,
        confidenceInterval1,
        confidenceInterval2
      };

      return aggregateData;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur agrégé:', error);
      throw error;
    }
  };

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
        let data1: RSBData, data2: RSBData;

        // Gérer l'utilisateur agrégé pour person1
        if (person1.id === AGGREGATE_USER.id) {
          data1 = await createAggregateUser();
        } else {
          const result1 = await apiService.analyzePersonsByName([person1.person_name]);
          data1 = result1.files[0];
          if (!data1) throw new Error(`Données non trouvées pour ${person1.person_name}`);
        }

        // Gérer l'utilisateur agrégé pour person2
        if (person2.id === AGGREGATE_USER.id) {
          data2 = await createAggregateUser();
        } else {
          const result2 = await apiService.analyzePersonsByName([person2.person_name]);
          data2 = result2.files[0];
          if (!data2) throw new Error(`Données non trouvées pour ${person2.person_name}`);
        }

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
      } catch (error) {
        console.error('Erreur lors de la comparaison:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedPerson1, selectedPerson2, persons]);

  // Déclencher automatiquement la comparaison si les personnes sont présélectionnées
  React.useEffect(() => {
    if (preSelectedPerson1 && preSelectedPerson2 && preSelectedPerson1.id !== preSelectedPerson2.id) {
      setSelectedPerson1(preSelectedPerson1);
      setSelectedPerson2(preSelectedPerson2);
      // Déclencher la comparaison automatiquement
      handlePersonSelection(preSelectedPerson1, 'person1');
      handlePersonSelection(preSelectedPerson2, 'person2');
    }
  }, [preSelectedPerson1, preSelectedPerson2, handlePersonSelection]);

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

      const dataPoint: any = {
        rsb,
        person1: idx1 >= 0 ? person1.data.percentages[idx1] : null,
        person2: idx2 >= 0 ? person2.data.percentages[idx2] : null,
      };

      // Ajouter les intervalles de confiance si c'est l'utilisateur agrégé
      if (selectedPerson1?.id === AGGREGATE_USER.id && person1.data.confidenceInterval1 && idx1 >= 0) {
        dataPoint.person1_ci1_lower = person1.data.confidenceInterval1.lower[idx1];
        dataPoint.person1_ci1_upper = person1.data.confidenceInterval1.upper[idx1];
        dataPoint.person1_ci2_lower = person1.data.confidenceInterval2?.lower[idx1];
        dataPoint.person1_ci2_upper = person1.data.confidenceInterval2?.upper[idx1];
      }

      if (selectedPerson2?.id === AGGREGATE_USER.id && person2.data.confidenceInterval1 && idx2 >= 0) {
        dataPoint.person2_ci1_lower = person2.data.confidenceInterval1.lower[idx2];
        dataPoint.person2_ci1_upper = person2.data.confidenceInterval1.upper[idx2];
        dataPoint.person2_ci2_lower = person2.data.confidenceInterval2?.lower[idx2];
        dataPoint.person2_ci2_upper = person2.data.confidenceInterval2?.upper[idx2];
      }

      data.push(dataPoint);
    }

    return data;
  }, [comparison, selectedPerson1, selectedPerson2]);

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Comparaison de participants
          </h2>
        </div>
        <p className="text-sm text-gray-600 ml-14">
          Comparez deux participants individuels ou utilisez l'option "Utilisateur Agrégé" pour comparer avec la moyenne utilisateur
        </p>
      </div>

      {/* Sélection des personnes - masquée si présélectionnées */}
      {!preSelectedPerson1 || !preSelectedPerson2 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personne 1
          </label>
          <select
            value={selectedPerson1?.id || ''}
            onChange={(e) => {
              const personId = e.target.value;
              let person: Person | undefined;
              
              if (personId === AGGREGATE_USER.id.toString()) {
                person = AGGREGATE_USER;
              } else {
                person = persons.find(p => p.id.toString() === personId);
              }
              
              if (person) handlePersonSelection(person, 'person1');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner une personne...</option>
            <option value={AGGREGATE_USER.id} className="bg-blue-50 font-medium">
              📊 {AGGREGATE_USER.person_name}
            </option>
            <optgroup label="Participants individuels">
              {persons.map(person => (
                <option key={person.id} value={person.id}>
                  {person.person_name} {person.age ? `(${person.age} ans)` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personne 2
          </label>
          <select
            value={selectedPerson2?.id || ''}
            onChange={(e) => {
              const personId = e.target.value;
              let person: Person | undefined;
              
              if (personId === AGGREGATE_USER.id.toString()) {
                person = AGGREGATE_USER;
              } else {
                person = persons.find(p => p.id.toString() === personId);
              }
              
              if (person) handlePersonSelection(person, 'person2');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner une personne...</option>
            {selectedPerson1?.id !== AGGREGATE_USER.id && (
              <option value={AGGREGATE_USER.id} className="bg-blue-50 font-medium">
                {AGGREGATE_USER.person_name}
              </option>
            )}
            <optgroup label="Participants individuels">
              {persons
                .filter(p => p.id !== selectedPerson1?.id)
                .map(person => (
                  <option key={person.id} value={person.id}>
                    {person.person_name} {person.age ? `(${person.age} ans)` : ''}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>
      ) : null}

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
            <div className="mt-4 space-y-2">
              <div className="flex justify-center space-x-6 text-sm">
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
              
              {/* Légende des intervalles de confiance */}
              {(selectedPerson1?.id === AGGREGATE_USER.id || selectedPerson2?.id === AGGREGATE_USER.id) && (
                <div className="flex justify-center space-x-6 text-xs text-gray-700 bg-gray-50 p-3 rounded border">
                  <div className="flex items-center">
                    <div className="w-5 h-3 mr-2 rounded" style={{ backgroundColor: '#93c5fd' }}></div>
                    <span className="font-medium">Zone ±1σ (68% des participants)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-3 mr-2 rounded" style={{ backgroundColor: '#bfdbfe' }}></div>
                    <span className="font-medium">Zone ±2σ (95% des participants)</span>
                  </div>
                </div>
              )}
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
                <ComposedChart data={chartData}>
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
                      // Filtrer les données d'intervalles de confiance du tooltip
                      if (name.includes('_ci')) return null;
                      
                      const personName = name === 'person1' ? comparison?.person1.name : comparison?.person2.name;
                      return [
                        value !== null ? `${value.toFixed(1)}%` : 'N/A', 
                        personName || name
                      ];
                    }}
                    labelFormatter={(rsb: number) => `RSB: ${rsb} dB`}
                  />
                  <Legend 
                    formatter={(value: string) => {
                      // Filtrer les données d'intervalles de confiance de la légende
                      if (value.includes('_ci')) return null;
                      return value;
                    }}
                  />
                  
                  {/* Lignes de référence */}
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="2 2" />
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="2 2" />
                  
                  {/* Zones d'écart-type ±2σ (plus large, couleur claire) */}
                  {selectedPerson1?.id === AGGREGATE_USER.id && (
                    <Area
                      type="monotone"
                      dataKey="person1_ci2_upper"
                      stroke="none"
                      fill="#bfdbfe"
                      fillOpacity={0.6}
                      stackId="1"
                    />
                  )}
                  {selectedPerson1?.id === AGGREGATE_USER.id && (
                    <Area
                      type="monotone"
                      dataKey="person1_ci2_lower"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                      stackId="1"
                    />
                  )}
                  
                  {/* Zones d'écart-type ±1σ (plus foncée) */}
                  {selectedPerson1?.id === AGGREGATE_USER.id && (
                    <Area
                      type="monotone"
                      dataKey="person1_ci1_upper"
                      stroke="none"
                      fill="#93c5fd"
                      fillOpacity={0.8}
                      stackId="2"
                    />
                  )}
                  {selectedPerson1?.id === AGGREGATE_USER.id && (
                    <Area
                      type="monotone"
                      dataKey="person1_ci1_lower"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                      stackId="2"
                    />
                  )}
                  
                  {/* Zones d'écart-type pour person2 si c'est l'agrégé */}
                  {selectedPerson2?.id === AGGREGATE_USER.id && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="person2_ci2_upper"
                        stroke="none"
                        fill="#bbf7d0"
                        fillOpacity={0.6}
                        stackId="3"
                      />
                      <Area
                        type="monotone"
                        dataKey="person2_ci2_lower"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        stackId="3"
                      />
                      <Area
                        type="monotone"
                        dataKey="person2_ci1_upper"
                        stroke="none"
                        fill="#86efac"
                        fillOpacity={0.8}
                        stackId="4"
                      />
                      <Area
                        type="monotone"
                        dataKey="person2_ci1_lower"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        stackId="4"
                      />
                    </>
                  )}
                  
                  {/* Courbes principales */}
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
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                {selectedPerson1?.id === AGGREGATE_USER.id && <Database className="w-4 h-4 mr-2" />}
                {comparison.person1.name}
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                {selectedPerson1?.id === AGGREGATE_USER.id ? (
                  <>
                    <div>📊 Données agrégées de {persons.length} participants</div>
                    <div>Moyenne des mots valides: {comparison.person1.data.validWords}/{comparison.person1.data.totalExpected}</div>
                    <div>Plage RSB commune: {comparison.person1.data.rsbStart} à {comparison.person1.data.rsbEnd} dB</div>
                    <div>Points interpolés: {comparison.person1.data.rsbPoints.length}</div>
                  </>
                ) : (
                  <>
                    <div>Mots valides: {comparison.person1.data.validWords}/{comparison.person1.data.totalExpected}</div>
                    <div>Plage RSB: {comparison.person1.data.rsbStart} à {comparison.person1.data.rsbEnd} dB</div>
                    <div>Points de mesure: {comparison.person1.data.rsbPoints.length}</div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                {selectedPerson2?.id === AGGREGATE_USER.id && <Database className="w-4 h-4 mr-2" />}
                {comparison.person2.name}
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                {selectedPerson2?.id === AGGREGATE_USER.id ? (
                  <>
                    <div>📊 Données agrégées de {persons.length} participants</div>
                    <div>Moyenne des mots valides: {comparison.person2.data.validWords}/{comparison.person2.data.totalExpected}</div>
                    <div>Plage RSB commune: {comparison.person2.data.rsbStart} à {comparison.person2.data.rsbEnd} dB</div>
                    <div>Points interpolés: {comparison.person2.data.rsbPoints.length}</div>
                  </>
                ) : (
                  <>
                    <div>Mots valides: {comparison.person2.data.validWords}/{comparison.person2.data.totalExpected}</div>
                    <div>Plage RSB: {comparison.person2.data.rsbStart} à {comparison.person2.data.rsbEnd} dB</div>
                    <div>Points de mesure: {comparison.person2.data.rsbPoints.length}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* État vide - masqué si présélectionné */}
      {!comparison && !isLoading && (!preSelectedPerson1 || !preSelectedPerson2) && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Sélectionnez deux personnes pour commencer la comparaison</p>
        </div>
      )}
    </div>
  );
}