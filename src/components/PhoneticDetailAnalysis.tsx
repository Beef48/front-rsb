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
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  User, 
  Target, 
  AlertTriangle, 
  Download, 
  BarChart3,
  FileText,
  Calculator,
  Mic,
  Volume2,
  TrendingUp,
  Filter,
  Search,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { RSBData, WordTest, PhonemeError } from '../types';
import { 
  transcribeToPhonemes, 
  calculatePhoneticDistance,
  normalizeWordForPhoneticAnalysis
} from '../utils/phoneticTranscription';
import { alignPhonemes, analyzeWordPhonetics } from '../utils/phoneticAnalysis';
import { SimpleTooltip } from './SimpleTooltip';
import { TooltipSpan } from './TooltipSpan';
import { BasicTooltip } from './BasicTooltip';

interface PhoneticDetailAnalysisProps {
  rsbData: RSBData;
  personName: string;
  onClose?: () => void;
}

interface DetailedWordAnalysis {
  wordTest: WordTest;
  targetPhonemes: string[];
  responsePhonemes: string[];
  alignment: Array<{
    target: string | null;
    response: string | null;
    position: number;
    type: 'match' | 'substitution' | 'insertion' | 'deletion';
  }>;
  phoneticDistance: number;
  phoneticAccuracy: number;
  errors: PhonemeError[];
}

interface AnalysisStats {
  totalWords: number;
  totalPhonemes: number;
  correctPhonemes: number;
  substitutions: number;
  insertions: number;
  deletions: number;
  phoneticAccuracy: number;
  averagePhoneticDistance: number;
  errorsByRsb: { [rsb: number]: number };
  errorsByPosition: {
    debut: number;
    milieu: number;
    fin: number;
  };
}

export function PhoneticDetailAnalysis({ rsbData, personName, onClose }: PhoneticDetailAnalysisProps) {
  const [selectedRsb, setSelectedRsb] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'errors' | 'export'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterErrorType, setFilterErrorType] = useState<'all' | 'substitution' | 'insertion' | 'deletion'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Analyse détaillée de tous les mots
  const detailedAnalysis = useMemo((): DetailedWordAnalysis[] => {
    return rsbData.wordTests.map(wordTest => {
      const targetPhonemes = transcribeToPhonemes(wordTest.target.toLowerCase());
      const responsePhonemes = transcribeToPhonemes(wordTest.response.toLowerCase());
      const alignment = alignPhonemes(targetPhonemes, responsePhonemes);
      const phoneticDistance = calculatePhoneticDistance(wordTest.target, wordTest.response);
      
      // Calculer la précision phonétique pour ce mot
      const correctPhonemes = alignment.filter(a => a.type === 'match').length;
      const totalPhonemes = Math.max(targetPhonemes.length, responsePhonemes.length);
      const phoneticAccuracy = totalPhonemes > 0 ? (correctPhonemes / totalPhonemes) * 100 : 0;
      
      // Analyser les erreurs phonétiques
      const errors = analyzeWordPhonetics(wordTest);
      
      return {
        wordTest,
        targetPhonemes,
        responsePhonemes,
        alignment,
        phoneticDistance,
        phoneticAccuracy,
        errors
      };
    });
  }, [rsbData.wordTests]);

  // Statistiques globales
  const analysisStats = useMemo((): AnalysisStats => {
    const totalWords = detailedAnalysis.length;
    let totalPhonemes = 0;
    let correctPhonemes = 0;
    let substitutions = 0;
    let insertions = 0;
    let deletions = 0;
    const errorsByRsb: { [rsb: number]: number } = {};
    const errorsByPosition = { debut: 0, milieu: 0, fin: 0 };

    detailedAnalysis.forEach(analysis => {
      const wordLength = analysis.targetPhonemes.length;
      totalPhonemes += Math.max(analysis.targetPhonemes.length, analysis.responsePhonemes.length);
      correctPhonemes += analysis.alignment.filter(a => a.type === 'match').length;
      
      analysis.alignment.forEach(alignment => {
        if (alignment.type === 'substitution') substitutions++;
        if (alignment.type === 'insertion') insertions++;
        if (alignment.type === 'deletion') deletions++;
      });

      // Erreurs par RSB
      const rsb = analysis.wordTest.rsb;
      if (!errorsByRsb[rsb]) errorsByRsb[rsb] = 0;
      errorsByRsb[rsb] += analysis.errors.length;

      // Erreurs par position
      analysis.errors.forEach(error => {
        const position = error.position;
        if (position < wordLength * 0.33) {
          errorsByPosition.debut++;
        } else if (position < wordLength * 0.66) {
          errorsByPosition.milieu++;
        } else {
          errorsByPosition.fin++;
        }
      });
    });

    const phoneticAccuracy = totalPhonemes > 0 ? (correctPhonemes / totalPhonemes) * 100 : 0;
    const averagePhoneticDistance = detailedAnalysis.reduce(
      (sum, analysis) => sum + analysis.phoneticDistance, 0
    ) / detailedAnalysis.length;

    return {
      totalWords,
      totalPhonemes,
      correctPhonemes,
      substitutions,
      insertions,
      deletions,
      phoneticAccuracy,
      averagePhoneticDistance,
      errorsByRsb,
      errorsByPosition
    };
  }, [detailedAnalysis]);

  // Données filtrées pour l'affichage
  const filteredAnalysis = useMemo(() => {
    let filtered = detailedAnalysis;

    // Filtre par RSB
    if (selectedRsb !== null) {
      filtered = filtered.filter(analysis => analysis.wordTest.rsb === selectedRsb);
    }

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(analysis => 
        analysis.wordTest.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.wordTest.response.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [detailedAnalysis, selectedRsb, searchTerm]);

  // Données pour les graphiques
  const rsbChartData = useMemo(() => {
    const rsbGroups: { [rsb: number]: DetailedWordAnalysis[] } = {};
    detailedAnalysis.forEach(analysis => {
      const rsb = analysis.wordTest.rsb;
      if (!rsbGroups[rsb]) rsbGroups[rsb] = [];
      rsbGroups[rsb].push(analysis);
    });

    return Object.entries(rsbGroups).map(([rsb, analyses]) => {
      const totalPhonemes = analyses.reduce((sum, a) => sum + Math.max(a.targetPhonemes.length, a.responsePhonemes.length), 0);
      const correctPhonemes = analyses.reduce((sum, a) => sum + a.alignment.filter(al => al.type === 'match').length, 0);
      const accuracy = totalPhonemes > 0 ? (correctPhonemes / totalPhonemes) * 100 : 0;
      const avgDistance = analyses.reduce((sum, a) => sum + a.phoneticDistance, 0) / analyses.length;

      return {
        rsb: parseInt(rsb),
        phoneticAccuracy: accuracy,
        avgPhoneticDistance: avgDistance,
        totalErrors: analyses.reduce((sum, a) => sum + a.errors.length, 0),
        wordCount: analyses.length
      };
    }).sort((a, b) => a.rsb - b.rsb);
  }, [detailedAnalysis]);

  const errorTypeData = [
    { name: 'Substitutions', value: analysisStats.substitutions, color: '#ef4444' },
    { name: 'Insertions', value: analysisStats.insertions, color: '#f59e0b' },
    { name: 'Omissions', value: analysisStats.deletions, color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  const positionErrorData = [
    { name: 'Début', value: analysisStats.errorsByPosition.debut, color: '#06b6d4' },
    { name: 'Milieu', value: analysisStats.errorsByPosition.milieu, color: '#f59e0b' },
    { name: 'Fin', value: analysisStats.errorsByPosition.fin, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Fonction d'export CSV
  const exportToCSV = () => {
    const csvData = [];
    
    // En-têtes
    csvData.push([
      'Mot_Cible',
      'Réponse',
      'RSB_dB',
      'Correct',
      'Précision_Phonétique_%',
      'Distance_Phonétique',
      'Nb_Erreurs',
      'Phonèmes_Cible',
      'Phonèmes_Réponse',
      'Types_Erreurs',
      'Détail_Alignement'
    ]);

    // Données
    detailedAnalysis.forEach(analysis => {
      const errorTypes = analysis.errors.map(e => e.errorType).join(';');
      const alignmentDetail = analysis.alignment.map(a => 
        `${a.target || 'Ø'}->${a.response || 'Ø'}(${a.type})`
      ).join(';');

      csvData.push([
        analysis.wordTest.target,
        analysis.wordTest.response,
        analysis.wordTest.rsb,
        analysis.wordTest.isCorrect ? 'OUI' : 'NON',
        analysis.phoneticAccuracy.toFixed(1),
        analysis.phoneticDistance.toFixed(2),
        analysis.errors.length,
        analysis.targetPhonemes.join('-'),
        analysis.responsePhonemes.join('-'),
        errorTypes,
        alignmentDetail
      ]);
    });

    // Conversion en CSV
    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    // Téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analyse_phonetique_${personName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${
      isFullscreen ? 'p-0' : 'p-4 flex items-center justify-center'
    }`}>
      <div className={`bg-white shadow-2xl w-full overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'h-full max-w-none rounded-none' 
          : 'rounded-xl max-w-7xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Analyse phonétique détaillée</h2>
                <p className="text-purple-100">{personName} • {rsbData.file}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all"
                title={isFullscreen ? "Réduire la fenêtre" : "Agrandir en plein écran"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl font-bold p-1"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <BasicTooltip 
                  content="Pourcentage de phonèmes (sons) correctement perçus et reproduits par rapport au mot cible. Une précision de 80% signifie que 8 phonèmes sur 10 sont corrects. Cette métrique est plus fine que la précision globale car elle analyse chaque son individuellement."
                  className="text-sm font-medium text-gray-600"
                >
                  Précision phonétique
                </BasicTooltip>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {analysisStats.phoneticAccuracy.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <BasicTooltip 
                  content="Mesure mathématique de la différence entre les mots cibles et les réponses, basée sur l'algorithme de Levenshtein appliqué aux phonèmes. Plus cette valeur est faible, plus les réponses sont phonétiquement proches des cibles. Une distance de 0 = identique, 1 = un phonème de différence."
                  className="text-sm font-medium text-gray-600"
                >
                  Distance moyenne
                </BasicTooltip>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {analysisStats.averagePhoneticDistance.toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <BasicTooltip 
                  content="Nombre total de phonèmes incorrectement perçus. Inclut les substitutions (un son remplacé par un autre), les insertions (son ajouté) et les omissions (son manqué). Cette métrique révèle la charge cognitive de traitement auditif et les difficultés de discrimination."
                  className="text-sm font-medium text-gray-600"
                >
                  Total erreurs
                </BasicTooltip>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {analysisStats.substitutions + analysisStats.insertions + analysisStats.deletions}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <BasicTooltip 
                  content="Nombre total de mots présentés lors du test RSB et analysés phonétiquement. Chaque mot est décomposé en phonèmes pour calculer la précision. Plus il y a de mots analysés, plus l'analyse statistique est robuste et représentative des capacités auditives."
                  className="text-sm font-medium text-gray-600"
                >
                  Mots analysés
                </BasicTooltip>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {analysisStats.totalWords}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white border-b">
          <div className="flex space-x-0">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'details', label: 'Détails par mot', icon: FileText },
              { id: 'errors', label: 'Analyse des erreurs', icon: AlertTriangle },
              { id: 'export', label: 'Export', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className={`p-6 overflow-y-auto ${
          isFullscreen 
            ? 'max-h-[calc(100vh-200px)]' 
            : 'max-h-[calc(95vh-200px)]'
        }`}>
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Graphique précision par RSB */}
              <div className="bg-white border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  <BasicTooltip content="Évolution de la précision phonétique selon le niveau de bruit (RSB). Montre comment la perception des phonèmes se dégrade quand le bruit augmente. Une chute importante indique des difficultés auditives dans le bruit.">
                    <span>Précision phonétique par niveau RSB</span>
                  </BasicTooltip>
                </h3>
                <div className={`${
                  isFullscreen ? 'h-80' : 'h-72'
                }`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rsbChartData}>
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
                          name === 'phoneticAccuracy' ? `${value.toFixed(1)}%` : value.toFixed(2),
                          name === 'phoneticAccuracy' ? 'Précision phonétique' : 'Distance phonétique'
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

              {/* Graphiques types d'erreurs - Layout amélioré */}
              <div className="space-y-8">
                {/* Types d'erreurs */}
                <div className="bg-white border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    <BasicTooltip content="Distribution des types d'erreurs phonétiques : substitutions (son remplacé), insertions (son ajouté) et omissions (son manqué). Révèle les patterns d'erreurs spécifiques du participant.">
                      <span>Répartition des types d'erreurs</span>
                    </BasicTooltip>
                  </h3>
                  <div className={`${
                    isFullscreen ? 'h-80' : 'h-72'
                  }`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={errorTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={isFullscreen ? 120 : 100}
                          dataKey="value"
                          label={({ name, value, percent }) => 
                            `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                          }
                        >
                          {errorTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Erreurs par position */}
                <div className="bg-white border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    <BasicTooltip content="Localisation des erreurs dans les mots : début (33% initial), milieu (33% central), fin (33% final). Indique si certaines positions sont plus problématiques, révélant des patterns de perception auditive.">
                      <span>Erreurs par position dans le mot</span>
                    </BasicTooltip>
                  </h3>
                  <div className={`${
                    isFullscreen ? 'h-80' : 'h-72'
                  }`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={positionErrorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Rechercher un mot..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={selectedRsb || ''}
                      onChange={(e) => setSelectedRsb(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Tous les RSB</option>
                      {Array.from(new Set(rsbData.wordTests.map(w => w.rsb))).sort((a, b) => a - b).map(rsb => (
                        <option key={rsb} value={rsb}>{rsb} dB</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table des mots */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <SimpleTooltip content="Mot présenté à l'utilisateur lors du test RSB (après normalisation : articles supprimés, accents normalisés)">
                            <span>Mot cible</span>
                          </SimpleTooltip>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <SimpleTooltip content="Réponse donnée par l'utilisateur (après normalisation : articles supprimés, accents normalisés)">
                            <span>Réponse</span>
                          </SimpleTooltip>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <SimpleTooltip content="Rapport Signal sur Bruit en décibels. Plus le RSB est bas, plus l'écoute est difficile. Valeurs typiques : +10 dB (facile) à -10 dB (très difficile)">
                            <span>RSB</span>
                          </SimpleTooltip>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <SimpleTooltip content="Pourcentage de phonèmes corrects pour ce mot spécifique. 100% = tous les sons sont corrects, 0% = aucun son correct">
                            <span>Précision</span>
                          </SimpleTooltip>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <SimpleTooltip content="Nombre de modifications phonétiques nécessaires pour transformer la réponse en cible. 0 = identique, plus c'est élevé, plus c'est différent">
                            <span>Distance</span>
                          </SimpleTooltip>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <span 
                            className="cursor-help border-b border-dotted border-gray-400" 
                            title="Nombre total d'erreurs phonétiques pour ce mot (substitutions + insertions + omissions)"
                          >
                            Erreurs
                          </span>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          <span 
                            className="cursor-help border-b border-dotted border-gray-400" 
                            title="Transcription phonétique du mot cible et de la réponse. Montre la décomposition en sons élémentaires"
                          >
                            Phonèmes
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAnalysis.map((analysis, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {analysis.wordTest.target}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={analysis.wordTest.isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {analysis.wordTest.response}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {analysis.wordTest.rsb} dB
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={analysis.phoneticAccuracy >= 80 ? 'text-green-600' : 
                                           analysis.phoneticAccuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                              {analysis.phoneticAccuracy.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {analysis.phoneticDistance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {analysis.errors.length > 0 ? (
                              <span className="text-red-600">{analysis.errors.length}</span>
                            ) : (
                              <span className="text-green-600">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="max-w-xs truncate" title={`Cible: ${analysis.targetPhonemes.join('-')} | Réponse: ${analysis.responsePhonemes.join('-')}`}>
                              {analysis.targetPhonemes.join('-')} → {analysis.responsePhonemes.join('-')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredAnalysis.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun résultat trouvé avec les filtres actuels.
                </div>
              )}
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-6">
              {/* Détail des erreurs par mot */}
              <div className="bg-white border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <span 
                    className="cursor-help border-b border-dotted border-gray-400" 
                    title="Analyse détaillée des erreurs phonétiques par mot, avec indication de la position et du type d'erreur. Permet d'identifier les patterns spécifiques de confusions auditives du participant."
                  >
                    Détail des erreurs phonétiques
                  </span>
                </h3>
                <div className="space-y-4">
                  {detailedAnalysis
                    .filter(analysis => analysis.errors.length > 0)
                    .slice(0, 10) // Limiter l'affichage pour la performance
                    .map((analysis, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900">
                            {analysis.wordTest.target} → {analysis.wordTest.response}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">
                            ({analysis.wordTest.rsb} dB)
                          </span>
                        </div>
                        <span className="text-sm text-red-600">
                          {analysis.errors.length} erreur(s)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {analysis.errors.map((error, errorIndex) => (
                          <div key={errorIndex} className="text-sm text-gray-700 bg-white p-2 rounded border-l-4 border-red-400">
                            <span className="font-medium">Position {error.position}:</span>
                            <span className="ml-2">
                              {error.errorType === 'substitution' && `"${error.target}" remplacé par "${error.responsePhoneme}"`}
                              {error.errorType === 'insertion' && `"${error.responsePhoneme}" inséré`}
                              {error.errorType === 'deletion' && `"${error.target}" omis`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Export des données
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Export CSV détaillé</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Exporte tous les détails de l'analyse phonétique : mots, phonèmes, erreurs, précision, etc.
                    </p>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger CSV</span>
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Contenu du fichier CSV</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Mot cible et réponse pour chaque test</li>
                      <li>• Niveau RSB et statut correct/incorrect</li>
                      <li>• Précision phonétique et distance phonétique</li>
                      <li>• Transcription phonétique cible et réponse</li>
                      <li>• Détail des erreurs et alignements</li>
                      <li>• Types d'erreurs (substitution, insertion, omission)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">🔧 Normalisation automatique</h4>
                    <p className="text-sm text-yellow-700 mb-2">
                      L'analyse phonétique applique automatiquement ces normalisations :
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Articles ignorés :</strong> "le", "la", "les", "un", "une", "du", "des", etc.</li>
                      <li>• <strong>Accents normalisés :</strong> "é/è/ê" → "e", "à/â" → "a", etc.</li>
                      <li>• <strong>Exemple :</strong> "le café" et "cafe" sont analysés de façon identique</li>
                      <li>• <strong>Exemple :</strong> "une mère" et "mere" sont analysés de façon identique</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}