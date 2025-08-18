import React, { useState, useCallback } from 'react';
import { Activity, Settings, Eye, EyeOff, Database, Upload, Printer, Users, Volume2 } from 'lucide-react';
import { PersonSelector } from './components/PersonSelector';
import { FileUpload } from './components/FileUpload';
import { ResultsChart } from './components/ResultsChart';
import { StatisticsPanel } from './components/StatisticsPanel';
import { GlobalStatisticsPanel } from './components/GlobalStatisticsPanel';
import { ExportPanel } from './components/ExportPanel';
import { ResponseTimeChart } from './components/ResponseTimeChart';
import { TimeVsAccuracyChart } from './components/TimeVsAccuracyChart';
import { TestDetailsPanel } from './components/TestDetailsPanel';
import { WordStatsChart } from './components/WordStatsChart';
import { FileUploadStatus, AnalysisResult } from './types';
import { Person } from './services/api';
import { parseFileData, processRSBData, calculateAverageAndStats } from './utils/dataProcessor';
import { analyzePersonPhonetics } from './utils/phoneticAnalysis';
import apiService from './services/api';
import { OverviewPanel } from './components/OverviewPanel';
import { PersonComparison } from './components/PersonComparison';
import { PhoneticAnalysis } from './components/PhoneticAnalysis';

function App() {
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIndividualCurves, setShowIndividualCurves] = useState(true);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'files'>('database');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showWordStats, setShowWordStats] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [availablePersons, setAvailablePersons] = useState<Person[]>([]);

  // Vérifier la connexion au serveur au montage
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        await apiService.ping();
        setConnectionStatus('connected');
        
        // Charger la liste des personnes pour la comparaison
        try {
          const persons = await apiService.getPersons();
          setAvailablePersons(persons);
        } catch (error) {
          console.error('Erreur lors du chargement des personnes:', error);
        }
      } catch (error) {
        console.error('Erreur de connexion au serveur:', error);
        setConnectionStatus('error');
      }
    };
    checkConnection();
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newStatuses = files.map(file => ({
      file,
      status: 'pending' as const
    }));
    
    setUploadStatuses(prev => [...prev, ...newStatuses]);
    setIsProcessing(true);

    // Traiter chaque fichier
    const processedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = file.name + '_' + file.size;
      
      try {
        // Mettre à jour le statut à "processing"
        setUploadStatuses(prev => prev.map((status) => 
          (status.file.name + '_' + status.file.size) === fileKey ? { ...status, status: 'processing' } : status
        ));

        // Lire le contenu du fichier
        const content = await readFileContent(file);
        
        // Parser les données
        const data = await parseFileData(content, file.name);
        
        // Traiter les données RSB
        const processedData = processRSBData(data, file.name);
        
        if (processedData) {
          // Mettre à jour le statut à "success" et stocker processedData
          setUploadStatuses(prev => prev.map((status) => 
            (status.file.name + '_' + status.file.size) === fileKey ? { ...status, status: 'success', processedData } : status
          ));
        } else {
          throw new Error('Données insuffisantes dans le fichier');
        }
        
      } catch (error) {
        // Log d'erreur détaillé pour le debug
        console.error('Erreur lors du traitement du fichier', file.name, error);
        // Mettre à jour le statut à "error"
        setUploadStatuses(prev => prev.map((status) => 
          (status.file.name + '_' + status.file.size) === fileKey ? { 
            ...status, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          } : status
        ));
      }
    }

    // Calculer les statistiques moyennes sur tous les fichiers uploadés avec succès
    setUploadStatuses(prev => {
      const allProcessedFiles = prev
        .filter(s => s.status === 'success' && s.processedData)
        .map(s => s.processedData!);
      if (allProcessedFiles.length > 0) {
        const result = calculateAverageAndStats(allProcessedFiles);
        setAnalysisResult(result);
      }
      setIsProcessing(false);
      return prev;
    });
  }, [uploadStatuses.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
    
    // Recalculer l'analyse si nécessaire
    const remainingSuccessfulFiles = uploadStatuses
      .filter((status, i) => i !== index && status.status === 'success')
      .map(status => status.file);
    
    if (remainingSuccessfulFiles.length === 0) {
      setAnalysisResult(null);
    }
  }, [uploadStatuses]);

  const handlePersonsSelected = useCallback(async (persons: Person[]) => {
    setSelectedPersons(persons);
    
    if (persons.length === 0) {
      setAnalysisResult(null);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await apiService.analyzePersonsByName(persons.map(p => p.person_name));
      setAnalysisResult(result);
    } catch (error) {
      console.error('Erreur lors de l\'analyse des personnes:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRemovePerson = useCallback((index: number) => {
    const newPersons = selectedPersons.filter((_, i) => i !== index);
    setSelectedPersons(newPersons);
    
    if (newPersons.length === 0) {
      setAnalysisResult(null);
    } else {
      // Recalculer l'analyse avec les personnes restantes
      handlePersonsSelected(newPersons);
    }
  }, [selectedPersons, handlePersonsSelected]);

  // Nouvelle fonction utilitaire pour lire avec fallback d'encodage et support Excel
  const readFileContent = (file: File): Promise<string | ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        // Lire en ArrayBuffer pour Excel
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier Excel'));
        reader.readAsArrayBuffer(file);
      } else {
        // Lire en texte pour CSV
        const reader = new FileReader();
        reader.onload = (e) => {
          let content = e.target?.result as string;
          const invalidCount = (content.match(/�/g) || []).length;
          if (invalidCount > 5) {
            const reader2 = new FileReader();
            reader2.onload = (e2) => {
              resolve(e2.target?.result as string);
            };
            reader2.onerror = () => reject(new Error('Erreur de lecture du fichier (latin1)'));
            reader2.readAsText(file, 'ISO-8859-1');
          } else {
            resolve(content);
          }
        };
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier (utf-8)'));
        reader.readAsText(file, 'utf-8');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-500 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Analyseur RSB
              </h1>
              <p className="text-primary-200 mt-1">
                Reconnaissance vocale dans le bruit - Analyse professionnelle
              </p>
            </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors"
                title="Imprimer / copier l'écran"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 1. OVERVIEW - Toujours visible en haut */}
        <OverviewPanel />
        
        <div className="space-y-8">
          {/* 2. STATS DES MOTS - Optionnel, en haut si activé */}
          {showWordStats && (
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
              <WordStatsChart />
            </div>
          )}

          {/* 2bis. COMPARAISON - Optionnel, en haut si activé */}
          {showComparison && connectionStatus === 'connected' && (
            <PersonComparison persons={availablePersons} />
          )}

          {/* 2ter. ANALYSE PHONÉTIQUE - Optionnel, en haut si activé */}
          {showPhonetics && analysisResult && analysisResult.files.length > 0 && (
            <div className="space-y-6">
              {analysisResult.files.map((fileData, index) => {
                // Calculer l'analyse phonétique pour chaque fichier
                const phoneticAnalysis = analyzePersonPhonetics(fileData);
                
                return (
                  <PhoneticAnalysis 
                    key={index} 
                    analysis={phoneticAnalysis} 
                  />
                );
              })}
            </div>
          )}

          {/* 3. SELECTION DE SOURCE - Contrôles principaux */}
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Configuration de l'analyse
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDataSource('database')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    dataSource === 'database'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Base de données</span>
                </button>
                <button
                  onClick={() => setDataSource('files')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    dataSource === 'files'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Fichiers</span>
                </button>
                <button
                  onClick={() => setShowWordStats(!showWordStats)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    showWordStats
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Stats des mots</span>
                </button>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    showComparison
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Comparaison</span>
                </button>
                <button
                  onClick={() => setShowPhonetics(!showPhonetics)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    showPhonetics
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Phonétique</span>
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {dataSource === 'database' && (
              <div className="mt-4">
                {connectionStatus === 'checking' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Vérification de la connexion...</span>
                  </div>
                )}
                {connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span>Connecté au serveur</span>
                  </div>
                )}
                {connectionStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span>Erreur de connexion au serveur</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. SELECTION DES DONNÉES - Selon la source */}
          {dataSource === 'database' && connectionStatus === 'connected' && (
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
              <PersonSelector
                onPersonsSelected={handlePersonsSelected}
                selectedPersons={selectedPersons}
                onRemovePerson={handleRemovePerson}
              />

              {isProcessing && (
                <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-primary-700 font-medium">
                      Analyse des données en cours...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {dataSource === 'files' && (
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Settings className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Importation des fichiers
                </h2>
              </div>
              
              <FileUpload
                onFilesSelected={handleFilesSelected}
                uploadStatuses={uploadStatuses}
                onRemoveFile={handleRemoveFile}
              />

              {isProcessing && (
                <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-primary-700 font-medium">
                      Traitement des fichiers en cours...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. RÉSULTATS - Affichage principal des analyses */}
          {analysisResult && (
            <>
              {/* Statistiques globales - EN PREMIER, contexte global */}
              {analysisResult.globalStatistics && (
                <GlobalStatisticsPanel globalStatistics={analysisResult.globalStatistics} />
              )}

              {/* Statistiques de l'analyse - Résumé des données sélectionnées */}
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                <StatisticsPanel result={analysisResult} />
              </div>

              {/* Graphique principal - Le plus important */}
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Performance RSB</h3>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showIndividualCurves}
                        onChange={(e) => setShowIndividualCurves(e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center space-x-1">
                        {showIndividualCurves ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>Courbes individuelles</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showConfidenceInterval}
                        onChange={(e) => setShowConfidenceInterval(e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center space-x-1">
                        {showConfidenceInterval ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>Intervalle de confiance</span>
                      </span>
                    </label>
                  </div>
                </div>
                
                <div className="animate-fade-in">
                  <ResultsChart
                    result={analysisResult}
                    showIndividualCurves={showIndividualCurves}
                    showConfidenceInterval={showConfidenceInterval}
                  />
                </div>
              </div>

              {/* Graphiques secondaires - Analyses approfondies */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ResponseTimeChart result={analysisResult} />
                <TimeVsAccuracyChart result={analysisResult} />
              </div>

              {/* Détails des tests - Informations détaillées */}
              <TestDetailsPanel result={analysisResult} />

              {/* Export - Outil d'exportation - TOUT À LA FIN */}
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                <ExportPanel result={analysisResult} />
              </div>
            </>
          )}

          {/* Word Statistics Chart */}
          {showWordStats && (
            <div className="mb-8">
              <WordStatsChart />
            </div>
          )}

          {/* Empty State */}
          {!analysisResult && uploadStatuses.length === 0 && selectedPersons.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                  <Activity className="w-12 h-12 text-white/70" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  Prêt pour l'analyse
                </h3>
                <p className="text-primary-200">
                  {dataSource === 'database' 
                    ? 'Sélectionnez des participants depuis la base de données pour commencer l\'analyse.'
                    : 'Importez vos fichiers de données RSB pour commencer l\'analyse de reconnaissance vocale dans le bruit.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;