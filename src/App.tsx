import React, { useState, useCallback } from 'react';
import { Activity, Settings, Eye, EyeOff, Database, Upload, Printer, Users, Volume2, TrendingUp, BarChart3, Download, User, CheckCircle, ArrowRight, ArrowLeft, Home } from 'lucide-react';
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
  
  // États pour la comparaison intégrée
  const [comparisonPerson1, setComparisonPerson1] = useState<Person | null>(null);
  const [comparisonPerson2, setComparisonPerson2] = useState<Person | null>(null);

  // Système de notifications
  const { notifications, showSuccess, showError, removeNotification } = useNotifications();

  // Fonctions pour gérer le workflow par étapes
  const markStepCompleted = (stepIndex: number) => {
    const newCompleted = [...isStepCompleted];
    newCompleted[stepIndex] = true;
    setIsStepCompleted(newCompleted);
  };

  const goToNextStep = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      
      // Si on passe à l'étape 3, déclencher l'analyse si nécessaire
      if (currentStep === 2 && !analysisResult) {
        setIsProcessing(true);
        try {
          if (dataSource === 'database' && selectedPersons.length > 0) {
            const result = await apiService.analyzePersonsByName(selectedPersons.map(p => p.person_name));
            setAnalysisResult(result);
          } else if (dataSource === 'files' && uploadStatuses.some(s => s.status === 'success')) {
            // Les fichiers ont déjà été traités, pas besoin de refaire l'analyse
            const processedFiles = uploadStatuses
              .filter(s => s.status === 'success' && s.processedData)
              .map(s => s.processedData!);
            
            if (processedFiles.length > 0) {
              const result = calculateAverageAndStats(processedFiles);
              setAnalysisResult(result);
            }
          }
        } catch (error) {
          console.error('Erreur lors de l\'analyse:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToHome = () => {
    // Réinitialiser tous les états à leur valeur initiale
    setCurrentStep(1);
    setIsStepCompleted([false, false, false]);
    setSelectedPersons([]);
    setUploadStatuses([]);
    setAnalysisResult(null);
    setShowComparison(false);
    setComparisonPerson1(null);
    setComparisonPerson2(null);
    setDataSource('database');
    
    // Réinitialiser les options d'analyse
    setShowWordStats(false);
    setShowPhonetics(false);
    setShowGlobalStats(true);
    setShowMainChart(true);
    setShowResponseTime(true);
    setShowTimeVsAccuracy(true);
    setShowTestDetails(true);
  };

  // Vérifier si les conditions pour passer à l'étape suivante sont remplies
  const canProceedToStep2 = () => {
    if (showComparison) {
      // Pour la comparaison, il faut avoir sélectionné 2 personnes différentes
      return comparisonPerson1 && comparisonPerson2 && comparisonPerson1.id !== comparisonPerson2.id;
    } else {
      // Pour l'analyse standard
      return (dataSource === 'database' && selectedPersons.length > 0) || 
             (dataSource === 'files' && uploadStatuses.some(s => s.status === 'success'));
    }
  };

  const canProceedToStep3 = () => {
    if (showComparison) {
      // Pour la comparaison, on peut toujours passer à l'étape 3
      return true;
    } else {
      // Pour l'analyse standard, il faut au moins une analyse sélectionnée
      return showGlobalStats || showMainChart || showResponseTime || showTimeVsAccuracy || showTestDetails || showWordStats || showPhonetics;
    }
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
  }, [selectedPersons, uploadStatuses, dataSource, comparisonPerson1, comparisonPerson2, showComparison]);

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
            <div className="flex items-center space-x-4">
              <button
                onClick={goToHome}
                className="text-white/80 hover:text-white transition-colors flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10"
                title="Retour à l'accueil"
              >
                <Home className="w-5 h-5" />
                <span className="text-sm font-medium">Accueil</span>
              </button>
              <button
                onClick={() => window.print()}
                className="text-white/80 hover:text-white transition-colors"
                title="Imprimer / copier l'écran"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
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
                    Commencez par choisir votre source de données, puis sélectionnez le type d'analyse souhaité
                  </p>
            </div>

                                 {/* Source de données - seulement pour l'analyse standard */}
                 {!showComparison && (
                   <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                     <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center space-x-2">
                       <Database className="w-5 h-5" />
                       <span>1️⃣ Source de données</span>
                     </h3>
                     <p className="text-sm text-green-700 mb-6">
                       Choisissez d'où proviennent vos données d'analyse RSB
                     </p>
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
                           <div className="text-sm opacity-80">Participants déjà enregistrés dans le système</div>
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
                           <div className="text-sm opacity-80">Importer des fichiers CSV ou Excel depuis votre ordinateur</div>
                         </div>
                </button>
              </div>
              </div>
            )}

                 {/* Type d'analyse */}
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                   <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                     <Activity className="w-5 h-5" />
                     <span>2️⃣ Type d'analyse</span>
                   </h3>
                   <p className="text-sm text-blue-700 mb-6">
                     Sélectionnez le type d'analyse que vous souhaitez effectuer sur vos données
                   </p>
                   <div className="flex items-center space-x-6 justify-center">
                <button
                       onClick={() => {
                         setShowComparison(false);
                         setComparisonPerson1(null);
                         setComparisonPerson2(null);
                       }}
                       className={`flex items-center space-x-4 px-8 py-6 rounded-xl transition-all transform hover:scale-105 ${
                         !showComparison
                           ? 'bg-primary-500 text-white shadow-lg'
                           : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-300'
                       }`}
                     >
                       <BarChart3 className="w-8 h-8" />
                       <div className="text-left">
                         <div className="font-bold text-lg">Analyse standard</div>
                         <div className="text-sm opacity-80">Analyses complètes RSB, statistiques et graphiques détaillés</div>
                       </div>
                </button>
                     <div className="text-gray-400 font-bold text-2xl">OU</div>
                <button
                       onClick={() => {
                         setShowComparison(true);
                         setSelectedPersons([]);
                         setUploadStatuses([]);
                         setAnalysisResult(null);
                       }}
                       disabled={connectionStatus !== 'connected'}
                       className={`flex items-center space-x-4 px-8 py-6 rounded-xl transition-all transform hover:scale-105 ${
                         showComparison
                           ? 'bg-purple-500 text-white shadow-lg'
                           : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-300'
                       } ${connectionStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       <Users className="w-8 h-8" />
                       <div className="text-left">
                         <div className="font-bold text-lg">Comparaison</div>
                         <div className="text-sm opacity-80">Comparaison directe entre 2 participants ou vs moyenne utilisateur</div>
                       </div>
                </button>
                   </div>
                   {connectionStatus !== 'connected' && (
                     <p className="text-xs text-red-600 mt-2 text-center">
                       * La comparaison nécessite une connexion à la base de données
                     </p>
                   )}
                 </div>

                                 {/* Sélection selon le type d'analyse */}
                 {!showComparison ? (
                   /* Analyse standard */
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
                 ) : (
                   /* Comparaison */
                   <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
                     <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                       <Users className="w-5 h-5" />
                       <span>Sélection des participants à comparer</span>
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Personne 1</label>
                         <select
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           onChange={(e) => {
                             const selectedValue = e.target.value;
                             if (selectedValue === '-1') {
                               // Utilisateur agrégé
                               setComparisonPerson1({
                                 id: -1,
                                 person_name: '📊 Utilisateur Agrégé (Moyenne utilisateur)',
                                 age: null,
                                 test_date: null
                               });
                             } else if (selectedValue) {
                               const person = availablePersons.find(p => p.id.toString() === selectedValue);
                               if (person) {
                                 setComparisonPerson1(person);
                               }
                             }
                           }}
                           value={comparisonPerson1?.id?.toString() || ''}
                         >
                           <option value="">Sélectionner une personne...</option>
                           <option value="-1" className="bg-blue-50 font-medium">📊 Utilisateur Agrégé (Moyenne utilisateur)</option>
                           <optgroup label="Participants individuels">
                             {availablePersons.map(person => (
                               <option key={person.id} value={person.id}>
                                 {person.person_name}
                               </option>
                             ))}
                           </optgroup>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Personne 2</label>
                         <select
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           onChange={(e) => {
                             const selectedValue = e.target.value;
                             if (selectedValue === '-1') {
                               // Utilisateur agrégé
                               setComparisonPerson2({
                                 id: -1,
                                 person_name: '📊 Utilisateur Agrégé (Moyenne utilisateur)',
                                 age: null,
                                 test_date: null
                               });
                             } else if (selectedValue) {
                               const person = availablePersons.find(p => p.id.toString() === selectedValue);
                               if (person) {
                                 setComparisonPerson2(person);
                               }
                             }
                           }}
                           value={comparisonPerson2?.id?.toString() || ''}
                         >
                           <option value="">Sélectionner une personne...</option>
                           <option value="-1" className="bg-blue-50 font-medium">📊 Utilisateur Agrégé (Moyenne utilisateur)</option>
                           <optgroup label="Participants individuels">
                             {availablePersons.map(person => (
                               <option key={person.id} value={person.id}>
                                 {person.person_name}
                               </option>
                             ))}
                           </optgroup>
                         </select>
                       </div>
                     </div>
                     
                     {/* Affichage de la comparaison en temps réel */}
                     {comparisonPerson1 && comparisonPerson2 && comparisonPerson1.id !== comparisonPerson2.id && (
                       <div className="mt-4 p-4 bg-purple-100 rounded-lg border border-purple-300">
                         <div className="flex items-center space-x-2 mb-3">
                           <Users className="w-4 h-4 text-purple-600" />
                           <span className="font-medium text-purple-900">Comparaison configurée</span>
                         </div>
                         <div className="text-sm text-purple-700">
                           <p><strong>{comparisonPerson1.person_name}</strong> vs <strong>{comparisonPerson2.person_name}</strong></p>
                           <p className="text-xs text-purple-600 mt-1">La comparaison sera affichée dans les résultats</p>
                  </div>
                </div>
              )}
            </div>
          )}

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
              
                                 {showComparison ? (
                   <div className="text-center py-12">
                     <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                     <h3 className="text-lg font-medium text-gray-900 mb-2">Mode comparaison activé</h3>
                     <p className="text-gray-500 mb-6">
                       Vous avez sélectionné le mode comparaison. Les participants ont été choisis dans l'étape précédente.
                     </p>
                     <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 max-w-md mx-auto">
                       <div className="flex items-center space-x-2 mb-3">
                         <Users className="w-5 h-5 text-purple-600" />
                         <span className="font-medium text-purple-900">Comparaison configurée</span>
                       </div>
                       <div className="text-sm text-purple-700">
                         <p><strong>{comparisonPerson1?.person_name}</strong> vs <strong>{comparisonPerson2?.person_name}</strong></p>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div>
                     <h3 className="text-lg font-semibold text-gray-700 mb-6">Modules d'analyse disponibles</h3>
                   
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                   </div>
                 )}

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

                {showComparison ? (
                  <>
                    <div className="space-y-8">
                      {/* Bouton retour */}
                      <div className="flex justify-start">
                        <button
                          onClick={goToPreviousStep}
                          className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-800 transition-all"
                        >
                          <ArrowLeft className="w-5 h-5" />
                          <span>Modifier la comparaison</span>
                        </button>
                      </div>

                      {/* Comparaison de participants */}
                      {connectionStatus === 'connected' && comparisonPerson1 && comparisonPerson2 && (
                        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-gray-900">Comparaison de participants</h2>
                              <p className="text-sm text-gray-600">
                                {comparisonPerson1.person_name} vs {comparisonPerson2.person_name}
                              </p>
                            </div>
                          </div>
                          <PersonComparison 
                            persons={availablePersons} 
                            preSelectedPerson1={comparisonPerson1}
                            preSelectedPerson2={comparisonPerson2}
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {!analysisResult ? (
                      <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">
                          {isProcessing ? 'Génération de l\'analyse en cours...' : 'Préparation de l\'analyse...'}
                        </p>
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
                        
                        {/* Statistiques globales de la base - Contexte général */}
                        {showGlobalStats && dataSource === 'database' && analysisResult.globalStatistics && (
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

                        {/* Statistiques des mots */}
          {showWordStats && (
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
          )}

                        {/* Analyse phonétique complète */}
                        {showPhonetics && analysisResult && analysisResult.files.length > 0 && (
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
                        )}

                        {/* Message d'info pour l'analyse phonétique */}
                        {showPhonetics && (!analysisResult || analysisResult.files.length === 0) && (
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
                  </>
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