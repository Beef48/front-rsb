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
          resolve(content);
        };
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier CSV'));
        reader.readAsText(file, 'utf-8');
      }
    });
  };

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
        const parsedData = parseFileData(file.name, content);
        const processedData = processRSBData(parsedData);
        
        processedFiles.push(processedData);
        
        // Mettre à jour le statut à "success"
        setUploadStatuses(prev => prev.map((status) => 
          (status.file.name + '_' + status.file.size) === fileKey ? { ...status, status: 'success' } : status
        ));
        
      } catch (error) {
        console.error(`Erreur lors du traitement du fichier ${file.name}:`, error);
        
        // Mettre à jour le statut à "error"
        setUploadStatuses(prev => prev.map((status) => 
          (status.file.name + '_' + status.file.size) === fileKey ? { ...status, status: 'error', error: error instanceof Error ? error.message : 'Erreur inconnue' } : status
        ));
      }
    }

    // Mettre à jour les résultats d'analyse
    if (processedFiles.length > 0) {
      setAnalysisResult({
        files: processedFiles,
        average: calculateAverageAndStats(processedFiles).average
      });
    }
    
    setIsProcessing(false);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
    
    // Recalculer les résultats sans ce fichier
    const remainingSuccessfulFiles = uploadStatuses
      .filter((_, i) => i !== index)
      .filter(status => status.status === 'success')
      .map(status => status.file);
    
    if (remainingSuccessfulFiles.length === 0) {
      setAnalysisResult(null);
    }
  }, [uploadStatuses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Analyseur RSB</h1>
                <p className="text-sm text-primary-200">Reconnaissance vocale dans le bruit - Analyse professionnelle</p>
              </div>
            </div>
            <button className="text-white/80 hover:text-white transition-colors">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vue d'ensemble */}
        <section id="overview">
          <OverviewPanel 
            connectionStatus={connectionStatus}
            selectedPersons={selectedPersons}
            uploadStatuses={uploadStatuses}
            dataSource={dataSource}
          />
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
                
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Analyses de base */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>Analyses de base</span>
                      </h4>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={showGlobalStats}
                            onChange={(e) => setShowGlobalStats(e.target.checked)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span>Statistiques globales</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={showMainChart}
                            onChange={(e) => setShowMainChart(e.target.checked)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span>Courbe RSB principale</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={showResponseTime}
                            onChange={(e) => setShowResponseTime(e.target.checked)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span>Temps de réponse</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={showWordStats}
                            onChange={(e) => setShowWordStats(e.target.checked)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span>Statistiques par mot</span>
                        </label>
                      </div>
                    </div>

                    {/* Analyses comparatives */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Analyses comparatives</span>
                      </h4>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={showComparison}
                          onChange={(e) => setShowComparison(e.target.checked)}
                          disabled={dataSource !== 'database' || connectionStatus !== 'connected'}
                          className="w-5 h-5 text-purple-600"
                        />
                        <span className={dataSource !== 'database' || connectionStatus !== 'connected' ? 'text-gray-400' : ''}>
                          Comparaison entre participants
                        </span>
                      </label>
                      {dataSource !== 'database' && (
                        <p className="text-xs text-gray-500 mt-2">
                          * Nécessite la base de données
                        </p>
                      )}
                    </div>

                    {/* Analyses phonétiques */}
                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-pink-900 mb-4 flex items-center space-x-2">
                        <Volume2 className="w-5 h-5" />
                        <span>Analyses phonétiques</span>
                      </h4>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={showPhonetics}
                          onChange={(e) => setShowPhonetics(e.target.checked)}
                          className="w-5 h-5 text-pink-600"
                        />
                        <span>Analyse des erreurs phonétiques</span>
                      </label>
                      {showPhonetics && (
                        <div className="mt-3 text-xs text-pink-600">
                          <p>• Confusions phonémiques</p>
                          <p>• Erreurs par catégorie</p>
                          <p>• Position dans le mot</p>
                        </div>
                      )}
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