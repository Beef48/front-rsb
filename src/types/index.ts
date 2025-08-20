export interface WordTest {
  target: string;
  response: string;
  isCorrect: boolean;
  rsb: number;
  duration: number;
}

export interface RSBStatistics {
  mean: number;
  standardDeviation: number;
  lowerLimit: number;
  upperLimit: number;
}

export interface RSBData {
  file: string;
  rsbPoints: number[];
  percentages: number[];
  averageTimes: number[];
  rsbStart: number;
  rsbEnd: number;
  validWords: number;
  totalExpected: number;
  wordTests: WordTest[]; // Nouveau : détails des mots testés
  statistics?: RSBStatistics; // Statistiques calculées par le backend
  // Données d'écart-type pour l'utilisateur agrégé
  standardDeviation?: number[];
  confidenceInterval1?: { lower: number[]; upper: number[] }; // ±1σ
  confidenceInterval2?: { lower: number[]; upper: number[] }; // ±2σ
}

export interface AnalysisResult {
  files: RSBData[];
  average: {
    rsbGrid: number[];
    percentages: number[];
    times: number[];
    standardDeviation: number[];
    min: number[];
    max: number[];
  };
  commonRange: {
    min: number;
    max: number;
  };
  globalStatistics?: {
    rsbGrid: number[];
    means: number[];
    standardDeviations: number[];
    lowerLimits: number[];
    upperLimits: number[];
    totalPersons: number;
  };
}

export interface FileUploadStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  progress?: number;
  processedData?: RSBData;
}

export interface ComparisonMetrics {
  rsb0: number | null;    // RSB pour 0% d'intelligibilité
  rsb50: number | null;   // RSB pour 50% d'intelligibilité
  rsb100: number | null;  // RSB pour 100% d'intelligibilité
  slope50: number | null; // Pente au RSB 50%
}

export interface PersonComparison {
  person1: {
    name: string;
    data: RSBData;
    metrics: ComparisonMetrics;
  };
  person2: {
    name: string;
    data: RSBData;
    metrics: ComparisonMetrics;
  };
  difference: {
    rsb0: number | null;
    rsb50: number | null;
    rsb100: number | null;
    slope50: number | null;
  };
}

export interface PhonemeError {
  target: string;
  response: string;
  position: number;
  wordTarget: string;
  wordResponse: string;
  rsb: number;
  errorType: 'substitution' | 'insertion' | 'deletion';
}

export interface PhonemeConfusion {
  targetPhoneme: string;
  responsePhoneme: string;
  count: number;
  percentage: number;
  avgRsb: number;
}

export interface PhonemeAnalysis {
  totalPhonemes: number;
  correctPhonemes: number;
  errors: PhonemeError[];
  confusionMatrix: PhonemeConfusion[];
  errorsByRsb: { [rsb: number]: PhonemeError[] };
  errorsByCategory: {
    voyelles: PhonemeError[];
    consonnes: PhonemeError[];
    nasales: PhonemeError[];
    occlusives: PhonemeError[];
    fricatives: PhonemeError[];
  };
  errorsByPosition: {
    debut: PhonemeError[];
    milieu: PhonemeError[];
    fin: PhonemeError[];
  };
  phoneticAccuracy: number; // Pourcentage de phonèmes corrects
  phoneticDistanceAvg: number; // Distance phonétique moyenne
}

export interface PhoneticAnalysisResult {
  personName: string;
  rsbLevels: number[];
  phoneticAccuracyByRsb: number[];
  totalAnalysis: PhonemeAnalysis;
  analysisByRsb: { [rsb: number]: PhonemeAnalysis };
}