import React, { useState, useCallback } from 'react';
import { Activity, Settings, Eye, EyeOff, Database, Upload, Printer, Users, Volume2, TrendingUp, BarChart3, Download, User, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { PersonSelectorImproved as PersonSelector } from './components/PersonSelectorImproved';
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
import { analyzePersonPhonetics, createAggregatePhoneticAnalysis } from './utils/phoneticAnalysis';
import apiService from './services/api';
import { OverviewPanel } from './components/OverviewPanel';
import { PersonComparison } from './components/PersonComparison';
import { PhoneticAnalysis } from './components/PhoneticAnalysis';
import { PhoneticComparison } from './components/PhoneticComparison';
import { NotificationContainer } from './components/NotificationToast';
import { useNotifications } from './hooks/useNotifications';



function App() {
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIndividualCurves, setShowIndividualCurves] = useState(true);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'files'>('database');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  // États pour les modules principaux
  const [showWordStats, setShowWordStats] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showPhonetics, setShowPhonetics] = useState(false);

  // États pour les sous-modules de résultats
  const [showGlobalStats, setShowGlobalStats] = useState(true);
  const [showMainChart, setShowMainChart] = useState(true);
  const [showResponseTime, setShowResponseTime] = useState(true);
  const [showTimeVsAccuracy, setShowTimeVsAccuracy] = useState(true);
  const [showTestDetails, setShowTestDetails] = useState(true);

  // États pour le workflow par étapes
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepCompleted, setIsStepCompleted] = useState([false, false, false]);


  const [availablePersons, setAvailablePersons] = useState<Person[]>([]);

  // Système de notifications
  const { notifications, showSuccess, showError, removeNotification } = useNotifications();

  // Fonctions pour gérer le workflow par étapes
  const markStepCompleted = (stepIndex: number) => {
    const newCompleted = [...isStepCompleted];
    newCompleted[stepIndex] = true;
    setIsStepCompleted(newCompleted);
  };

  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Vérifier si les conditions pour passer à l'étape suivante sont remplies
  const canProceedToStep2 = () => {
    return (dataSource === 'database' && selectedPersons.length > 0) || 
           (dataSource === 'files' && uploadStatuses.some(s => s.status === 'success'));
  };

  const canProceedToStep3 = () => {
    return showWordStats || showComparison || showPhonetics;
  };

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

  // Automatiser les transitions d'étapes
  React.useEffect(() => {
    if (canProceedToStep2() && !isStepCompleted[0]) {
      markStepCompleted(0);
    }
  }, [selectedPersons, uploadStatuses, dataSource]);

  React.useEffect(() => {
    if (canProceedToStep3() && !isStepCompleted[1]) {
      markStepCompleted(1);
    }
  }, [showWordStats, showComparison, showPhonetics]);

  React.useEffect(() => {
    if (analysisResult && !isStepCompleted[2]) {
      markStepCompleted(2);
    }
  }, [analysisResult]);

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
        {/* 1. VUE D'ENSEMBLE - Toujours visible en haut */}
        <section id="overview">
          <OverviewPanel />
        </section>
        
        {/* Navigation par étapes */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Assistant d'analyse RSB</h1>
            <div className="flex items-center space-x-4">
              {[
                { num: 1, label: "Participants" },
                { num: 2, label: "Analyses" }, 
                { num: 3, label: "Résultats" }
              ].map((step, index) => (
                <div key={step.num} className="flex items-center">
                  <div className="text-center">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all cursor-pointer ${
                        currentStep === step.num 
                          ? 'bg-primary-500 text-white shadow-lg' 
                          : isStepCompleted[step.num - 1]
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                      onClick={() => {
                        if (step.num <= currentStep || isStepCompleted[step.num - 1]) {
                          setCurrentStep(step.num);
                        }
                      }}
                    >
                      {isStepCompleted[step.num - 1] ? <CheckCircle className="w-6 h-6" /> : step.num}
                    </div>
                    <div className="text-xs mt-1 font-medium text-gray-600">{step.label}</div>
                  </div>
                  {step.num < 3 && (
                    <ArrowRight className={`w-5 h-5 mx-4 ${
                      isStepCompleted[step.num - 1] ? 'text-green-500' : 'text-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* ÉTAPE 1: Sélection des participants */}
          {currentStep === 1 && (
            <section id="step1">
              <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    🧑‍⚕️ Étape 1: Sélection des participants
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Choisissez la source de vos données et sélectionnez les participants à analyser
                  </p>
                </div>

                {/* Source de données */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-blue-900 mb-6 flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Source de données</span>
                  </h3>
                  <div className="flex items-center space-x-6 justify-center">
                    <button
                      onClick={() => {
                        setDataSource('database');
                        setAnalysisResult(null);
                        setSelectedPersons([]);
                        setUploadStatuses([]);
                      }}
                      className={`flex items-center space-x-4 px-8 py-6 rounded-xl transition-all transform hover:scale-105 ${
                        dataSource === 'database'
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-300'
                      }`}
                    >
                      <Database className="w-8 h-8" />
                      <div className="text-left">
                        <div className="font-bold text-lg">Base de données</div>
                        <div className="text-sm opacity-80">Participants enregistrés</div>
                      </div>
                    </button>
                    <div className="text-gray-400 font-bold text-2xl">OU</div>
                    <button
                      onClick={() => {
                        setDataSource('files');
                        setAnalysisResult(null);
                        setSelectedPersons([]);
                        setUploadStatuses([]);
                      }}
                      className={`flex items-center space-x-4 px-8 py-6 rounded-xl transition-all transform hover:scale-105 ${
                        dataSource === 'files'
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-300'
                      }`}
                    >
                      <Upload className="w-8 h-8" />
                      <div className="text-left">
                        <div className="font-bold text-lg">Fichiers locaux</div>
                        <div className="text-sm opacity-80">CSV ou Excel</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sélection/Upload selon la source */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  {dataSource === 'database' ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Sélection des participants</span>
                      </h3>
                      <PersonSelector
                        onPersonsSelected={handlePersonsSelected}
                        selectedPersons={selectedPersons}
                        onRemovePerson={handleRemovePerson}
                        onShowSuccess={showSuccess}
                        onShowError={showError}
                      />
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Upload className="w-5 h-5" />
                        <span>Import de fichiers</span>
                      </h3>
                      <FileUpload
                        onFilesSelected={handleFilesSelected}
                        uploadStatuses={uploadStatuses}
                        onRemoveFile={handleRemoveFile}
                        onShowSuccess={showSuccess}
                        onShowError={showError}
                      />
                    </>
                  )}
                </div>

                {/* Bouton Suivant */}
                <div className="flex justify-end">
                  <button
                    onClick={goToNextStep}
                    disabled={!canProceedToStep2()}
                    className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                      canProceedToStep2()
                        ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg transform hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Continuer vers la sélection des analyses</span>
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ÉTAPE 2: Sélection des analyses */}
          {currentStep === 2 && (
            <section id="step2">
              <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    🔬 Étape 2: Choix des analyses
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Sélectionnez les types d'analyses à inclure dans votre rapport
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-6">Modules d'analyse disponibles</h3>
                
                {/* Section Résultats de base */}
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Analyses de base</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showGlobalStats}
                          onChange={(e) => setShowGlobalStats(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Statistiques globales</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showMainChart}
                          onChange={(e) => setShowMainChart(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Courbe RSB principale</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showResponseTime}
                          onChange={(e) => setShowResponseTime(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Temps de réponse</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showTimeVsAccuracy}
                          onChange={(e) => setShowTimeVsAccuracy(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Précision vs Temps</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showTestDetails}
                          onChange={(e) => setShowTestDetails(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Détails des tests</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showWordStats}
                          onChange={(e) => setShowWordStats(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Statistiques par mot</span>
                      </label>
                    </div>
                  </div>

                  {/* Section Comparaisons */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Analyses comparatives</span>
                    </h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showComparison}
                          onChange={(e) => setShowComparison(e.target.checked)}
                          disabled={dataSource !== 'database' || connectionStatus !== 'connected'}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                        />
                        <span className={dataSource !== 'database' || connectionStatus !== 'connected' ? 'text-gray-400' : ''}>
                          Comparaison RSB entre participants
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Section Phonétique simplifiée */}
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-pink-900 mb-3 flex items-center space-x-2">
                      <Volume2 className="w-4 h-4" />
                      <span>Analyse des erreurs phonétiques</span>
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={showPhonetics}
                          onChange={(e) => setShowPhonetics(e.target.checked)}
                          disabled={selectedPersons.length === 0 && !uploadStatuses.some(s => s.status === 'success')}
                          className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 disabled:opacity-50"
                        />
                        <span className={selectedPersons.length === 0 && !uploadStatuses.some(s => s.status === 'success') ? 'text-gray-400' : ''}>
                          Inclure l'analyse phonétique
                        </span>
                      </label>
                      
                      {showPhonetics && (
                        <div className="bg-white rounded-lg p-3 border border-pink-200">
                          <p className="text-xs text-pink-700 mb-2 font-medium">🔊 Votre rapport contiendra :</p>
                          <div className="space-y-1 text-xs text-pink-600">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                              <span>Analyse des confusions phonémiques les plus fréquentes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                              <span>Erreurs par catégorie (voyelles, consonnes, nasales...)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                              <span>Analyse par position dans le mot (début, milieu, fin)</span>
                            </div>
                            {analysisResult && analysisResult.files.length >= 2 && (
                              <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                <span>Comparaison entre participants (1vs1 et 1vsTous)</span>
                              </div>
                            )}
                            {analysisResult && analysisResult.files.length > 1 && (
                              <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span>Vue d'ensemble de tous les participants</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Boutons de navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      onClick={goToPreviousStep}
                      className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-800 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Retour</span>
                    </button>
                    <button
                      onClick={goToNextStep}
                      disabled={!canProceedToStep3()}
                      className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                        canProceedToStep3()
                          ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg transform hover:scale-105'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>Générer les résultats</span>
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ÉTAPE 3: Affichage des résultats */}
          {currentStep === 3 && (
            <section id="step3">
              <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    📊 Étape 3: Résultats de l'analyse
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Voici les résultats de votre analyse RSB
                  </p>
                </div>

                {!analysisResult ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Génération de l'analyse en cours...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Bouton retour */}
                    <div className="flex justify-start">
                      <button
                        onClick={goToPreviousStep}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-800 transition-all"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Modifier les analyses</span>
                      </button>
                    </div>

                    {/* Résultats des analyses */}
                    {showGlobalStats && <GlobalStatisticsPanel result={analysisResult} />}
                    {showMainChart && <ResultsChart result={analysisResult} />}
                    {showResponseTime && <ResponseTimeChart result={analysisResult} />}
                    {showTimeVsAccuracy && <TimeVsAccuracyChart result={analysisResult} />}
                    {showTestDetails && <TestDetailsPanel result={analysisResult} />}
                    {showWordStats && <WordStatsChart />}
                    {showComparison && <PersonComparison persons={availablePersons} />}
                    {showPhonetics && (
                      <div className="space-y-6">
                        <PhoneticAnalysis 
                          analysis={createAggregatePhoneticAnalysis(
                            analysisResult.files.map(fileData => analyzePersonPhonetics(fileData))
                          )} 
                        />
                      </div>
                    )}

                    {/* Export */}
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-teal-900 mb-4 flex items-center space-x-2">
                        <Download className="w-5 h-5" />
                        <span>Export des résultats</span>
                      </h3>
                      <ExportPanel result={analysisResult} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Message si aucune étape n'est active */}
          {!currentStep && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                  <Activity className="w-12 h-12 text-white/70" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  Prêt pour l'analyse
                </h3>
                <p className="text-primary-200">
                  Suivez les étapes pour commencer votre analyse RSB
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Container de notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </div>
  );
}

export default App;
                onPersonsSelected={handlePersonsSelected}
                selectedPersons={selectedPersons}
                onRemovePerson={handleRemovePerson}
                onShowSuccess={showSuccess}
                onShowError={showError}
              />

              {isProcessing && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700 font-medium">
                      Analyse des participants en cours...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {dataSource === 'files' && (
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Upload className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Import de fichiers</h2>
                  <p className="text-sm text-gray-600">Importez vos fichiers CSV/Excel contenant les données RSB</p>
                </div>
              </div>
              
              <FileUpload
                onFilesSelected={handleFilesSelected}
                uploadStatuses={uploadStatuses}
                onRemoveFile={handleRemoveFile}
                onShowSuccess={showSuccess}
                onShowError={showError}
              />

              {isProcessing && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-orange-700 font-medium">
                      Traitement des fichiers en cours...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          </section>

          {/* 4. RÉSULTATS PRINCIPAUX - Affichage des analyses de base */}
          <section id="results">
          {analysisResult && (
            <>
              {/* Statistiques globales de la base - Contexte général */}
              {analysisResult.globalStatistics && showGlobalStats && (
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Statistiques globales</h2>
                      <p className="text-sm text-gray-600">Vue d'ensemble de la base de données complète</p>
                    </div>
                  </div>
                  <GlobalStatisticsPanel globalStatistics={analysisResult.globalStatistics} />
                </div>
              )}

              {/* Statistiques de l'analyse actuelle */}
              {showGlobalStats && (
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Résumé de l'analyse</h2>
                      <p className="text-sm text-gray-600">Statistiques des données sélectionnées</p>
                    </div>
                  </div>
                  <StatisticsPanel result={analysisResult} />
                </div>
              )}

              {/* Graphique principal RSB */}
              {showMainChart && (
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Courbes de performance RSB</h2>
                      <p className="text-sm text-gray-600">Graphique principal de reconnaissance vocale dans le bruit</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
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
                
                <ResultsChart
                  result={analysisResult}
                  showIndividualCurves={showIndividualCurves}
                  showConfidenceInterval={showConfidenceInterval}
                />
                </div>
              )}

              {/* Graphiques complémentaires */}
              {(showResponseTime || showTimeVsAccuracy) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {showResponseTime && (
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Activity className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Temps de réponse</h3>
                          <p className="text-sm text-gray-600">Analyse temporelle par niveau RSB</p>
                        </div>
                      </div>
                      <ResponseTimeChart result={analysisResult} />
                    </div>
                  )}
                  
                  {showTimeVsAccuracy && (
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Précision vs Temps</h3>
                          <p className="text-sm text-gray-600">Corrélation performance/vitesse</p>
                        </div>
                      </div>
                      <TimeVsAccuracyChart result={analysisResult} />
                    </div>
                  )}
                </div>
              )}

              {/* Détails des tests */}
              {showTestDetails && (
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Détails des tests</h2>
                      <p className="text-sm text-gray-600">Informations techniques et paramètres</p>
                    </div>
                  </div>
                  <TestDetailsPanel result={analysisResult} />
                </div>
              )}
            </>
          )}
          </section>

          {/* 5. ANALYSES SPÉCIALISÉES - Modules optionnels activés */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Statistiques des mots */}
              {showWordStats && (
                <section id="word-stats">
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Statistiques des mots</h2>
                      <p className="text-sm text-gray-600">Analyse détaillée par mot testé</p>
                    </div>
                  </div>
                  <WordStatsChart />
                  </div>
                </section>
              )}

              {/* Comparaison de participants */}
              {showComparison && connectionStatus === 'connected' && (
                <section id="comparison">
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                  <PersonComparison persons={availablePersons} />
                  </div>
                </section>
              )}

              {/* Analyse phonétique simplifiée */}
              {showPhonetics && analysisResult && analysisResult.files.length > 0 && (
                <section id="phonetics">
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 border-l-4 border-l-pink-500">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Volume2 className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">🔊 Analyse phonétique complète</h2>
                        <p className="text-sm text-gray-600">
                          Analyse détaillée des erreurs de reconnaissance phonémique
                          {analysisResult.files.length > 1 && ` - ${analysisResult.files.length} participant${analysisResult.files.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Vue d'ensemble (si plusieurs participants) */}
                      {analysisResult.files.length > 1 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span>Vue d'ensemble - Tous les participants</span>
                          </h3>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                            <PhoneticAnalysis 
                              analysis={createAggregatePhoneticAnalysis(
                                analysisResult.files.map(fileData => analyzePersonPhonetics(fileData))
                              )} 
                            />
                          </div>
                        </div>
                      )}

                      {/* Comparaison entre participants (si 2+) */}
                      {analysisResult.files.length >= 2 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Comparaison entre participants</span>
                          </h3>
                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                            <PhoneticComparison analysisResult={analysisResult} />
                          </div>
                        </div>
                      )}

                      {/* Analyses par participant */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          <span>Analyse détaillée par participant</span>
                        </h3>
                        <div className="space-y-6">
                          {analysisResult.files.map((fileData, index) => {
                            const phoneticAnalysis = analyzePersonPhonetics(fileData);
                            return (
                              <div key={index} className="bg-pink-50 border border-pink-200 rounded-xl p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="p-2 bg-pink-200 rounded-lg">
                                    <User className="w-5 h-5 text-pink-700" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold text-pink-900">
                                      {fileData.file}
                                      {analysisResult.files.length > 1 && (
                                        <span className="text-sm font-normal text-pink-600 ml-2">
                                          (Participant {index + 1}/{analysisResult.files.length})
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-pink-600">Erreurs phonémiques individuelles</p>
                                  </div>
                                </div>
                                <PhoneticAnalysis analysis={phoneticAnalysis} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Message d'info pour l'analyse phonétique */}
              {showPhonetics && (!analysisResult || analysisResult.files.length === 0) && (
                <section id="phonetics">
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Volume2 className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Analyse phonétique activée</h2>
                        <p className="text-sm text-gray-600">
                          {selectedPersons.length > 0 || uploadStatuses.some(s => s.status === 'success')
                            ? "Lancez l'analyse de vos données pour voir l'analyse phonétique détaillée."
                            : "Sélectionnez des participants ou importez des fichiers, puis lancez l'analyse pour voir l'analyse phonétique."
                          }
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-pink-200">
                      <h3 className="font-medium text-gray-900 mb-2">🔬 Ce que vous verrez :</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Analyse agrégée</strong> : Vue d'ensemble des erreurs phonémiques de tous les participants</li>
                        <li>• <strong>Analyses individuelles</strong> : Détail des erreurs par participant</li>
                        <li>• <strong>Matrice de confusion</strong> : Confusions phonémiques les plus fréquentes</li>
                        <li>• <strong>Erreurs par catégorie</strong> : Voyelles, consonnes, nasales, etc.</li>
                        <li>• <strong>Erreurs par position</strong> : Début, milieu, fin de mot</li>
                      </ul>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 6. EXPORT - Outils d'exportation en fin de workflow */}
          {analysisResult && (
            <section id="export">
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Download className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Export des résultats</h2>
                  <p className="text-sm text-gray-600">Téléchargez vos analyses en différents formats</p>
                </div>

              </div>
              <ExportPanel result={analysisResult} />
              </div>
            </section>
          )}

          {/* 7. ÉTAT VIDE - Message d'accueil */}
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

      {/* Container de notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </div>
  );
}

export default App;