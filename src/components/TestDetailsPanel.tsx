import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TestDetailsPanelProps {
  result: AnalysisResult;
}

export function TestDetailsPanel({ result }: TestDetailsPanelProps) {
  // État pour gérer l'affichage des détails par fichier et niveau RSB
  const [expandedTests, setExpandedTests] = useState<{ [key: string]: boolean }>({});

  const toggleTestDetails = (fileIndex: number, rsb: number) => {
    const key = `${fileIndex}-${rsb}`;
    setExpandedTests(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mt-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Détails des tests de reconnaissance</h3>
      
      <div className="space-y-6">
        {result.files.map((file, fileIndex) => (
          <div key={fileIndex} className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-800 mb-3">
              {file.file ? 
                file.file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || 
                `Fichier ${fileIndex + 1}` : 
                `Fichier ${fileIndex + 1}`}
            </h4>
            
            <div className="space-y-4">
              {file.rsbPoints.map((rsb, rsbIndex) => {
                // Filtrer les tests de mots pour ce niveau RSB
                const testsForRSB = file.wordTests.filter(test => test.rsb === rsb);
                const key = `${fileIndex}-${rsb}`;
                const isExpanded = expandedTests[key];
                
                return (
                  <div key={rsbIndex} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleTestDetails(fileIndex, rsb)}
                          className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span>RSB {rsb.toFixed(1)} dB</span>
                        </button>
                        <span className="text-xs text-gray-500">
                          ({testsForRSB.filter(t => t.isCorrect).length}/{testsForRSB.length} corrects)
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {file.percentages[rsbIndex].toFixed(1)}% de réussite
                      </span>
                    </div>
                    
                    {/* Détails des mots testés (affichés/masqués) */}
                    {isExpanded && testsForRSB.length > 0 && (
                      <div className="space-y-2 mb-3 border-t pt-3">
                        <h5 className="text-sm font-medium text-gray-700">Mots testés :</h5>
                        <div className="grid grid-cols-1 gap-1">
                          {testsForRSB.map((test, testIndex) => (
                            <div key={testIndex} className="flex items-center justify-between text-sm bg-white rounded px-2 py-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600">Cible:</span>
                                <span className="font-medium">{test.target}</span>
                                <span className="text-gray-600">→</span>
                                <span className="font-medium">{test.response}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {test.isCorrect ? (
                                  <span className="text-green-600 font-bold">✓ OK</span>
                                ) : (
                                  <span className="text-red-600 font-bold">✗</span>
                                )}
                                <span className="text-gray-500 text-xs">
                                  {test.duration.toFixed(0)}ms
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Statistiques du niveau */}
                    <div className="text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Mots corrects :</span>
                          <span className="ml-2 text-green-600">
                            {testsForRSB.filter(t => t.isCorrect).length}/{testsForRSB.length}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Temps moyen :</span>
                          <span className="ml-2 text-blue-600">
                            {file.averageTimes[rsbIndex].toFixed(0)} ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Résumé du fichier */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800">Résumé global</span>
                <div className="text-sm text-blue-600">
                  <span>Moyenne : {(file.percentages.reduce((a, b) => a + b, 0) / file.percentages.length).toFixed(1)}%</span>
                  <span className="ml-4">Temps : {(file.averageTimes.reduce((a, b) => a + b, 0) / file.averageTimes.length).toFixed(0)} ms</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 