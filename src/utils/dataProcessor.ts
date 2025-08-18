import Papa from 'papaparse';
import { RSBData, AnalysisResult, WordTest, ComparisonMetrics } from '../types';
import * as XLSX from 'xlsx';

// Fonction de nettoyage du texte
function cleanText(text: string): string {
  if (typeof text !== 'string') return '';
  
  // Supprimer les articles (gère l'apostrophe simple et typographique)
  text = text.replace(/^(le|la|les|un|une|des|l[’'])\s*/i, '').trim().toLowerCase();
  
  // Supprimer les accents
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return text;
}

// Parser CSV/Excel data
export function parseFileData(fileContent: string | ArrayBuffer, fileName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      Papa.parse(fileContent as string, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`Erreur de parsing CSV: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error: any) => reject(error)
      });
    } else if (fileName.toLowerCase().endsWith('.xlsx')) {
      try {
        const workbook = XLSX.read(fileContent, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // LOGS DEBUG AJOUTÉS
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('DEBUG - RAW ROWS:', rawRows);
        const jsonRows = XLSX.utils.sheet_to_json(worksheet);
        console.log('DEBUG - JSON ROWS:', jsonRows);
        // FIN LOGS DEBUG
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(data as any[]);
      } catch (err) {
        reject(new Error('Erreur de parsing Excel: ' + (err instanceof Error ? err.message : err)));
      }
    } else {
      reject(new Error('Format de fichier non supporté (CSV ou XLSX uniquement)'));
    }
  });
}

// Traitement des données RSB
export function processRSBData(data: any[], fileName: string): RSBData | null {
  try {
    if (!data || data.length === 0) return null;
    
    const row = data[0];
    const rsbStart = parseInt(row.rsbStart || '0');
    const rsbEnd = parseInt(row.rsbEnd || '-14');
    const rsbStep = parseInt(row.rsbStep || '-2');
    const wordCount = parseInt(row.wordCnt || '4');
    
    const nbLevels = Math.abs(Math.floor((rsbEnd - rsbStart) / rsbStep)) + 1;
    const rsbLevels = Array.from({ length: nbLevels }, (_, i) => rsbStart + i * rsbStep);
    
    const results: { [key: number]: { correct: number; total: number; times: number[] } } = {};
    rsbLevels.forEach(r => {
      results[r] = { correct: 0, total: 0, times: [] };
    });
    
    let validWords = 0;
    const totalExpected = nbLevels * wordCount;
    const wordTests: WordTest[] = [];
    
    // Traitement des mots
    for (let i = 0; i < totalExpected; i++) {
      const word = cleanText(row[`wordHist/${i}/word`] || '');
      const response = cleanText(row[`wordHist/${i}/resp`] || '');
      const rsb = parseFloat(row[`wordHist/${i}/rsb`]);
      const startTime = parseFloat(row[`wordHist/${i}/beginningOfSpeechTime`]);
      const endTime = parseFloat(row[`wordHist/${i}/endOfSpeechTime`]);
      
      if (!word || !response || isNaN(rsb) || isNaN(startTime) || isNaN(endTime)) {
        continue;
      }
      
      const duration = endTime - startTime;
      if (duration < 100 || duration > 10000) {
        continue;
      }
      
      validWords++;
      
      if (!results[rsb]) {
        results[rsb] = { correct: 0, total: 0, times: [] };
      }
      
      const isCorrect = response.includes(word);
      if (isCorrect) {
        results[rsb].correct++;
      }
      results[rsb].total++;
      results[rsb].times.push(duration);
      
      // Stocker les détails du test de mot
      wordTests.push({
        target: row[`wordHist/${i}/word`] || '',
        response: row[`wordHist/${i}/resp`] || '',
        isCorrect,
        rsb,
        duration
      });
    }
    
    // Exclusion si trop peu de données valides
    if (validWords < 0.8 * totalExpected) {
      return null;
    }
    
    const rsbPoints = Object.keys(results).map(Number).sort((a, b) => a - b);
    const percentages = rsbPoints.map(r => {
      const { correct, total } = results[r];
      return total > 0 ? (100 * correct) / total : 0;
    });
    
    const averageTimes = rsbPoints.map(r => {
      const times = results[r].times;
      return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    });
    
    return {
      file: fileName,
      rsbPoints,
      percentages,
      averageTimes,
      rsbStart,
      rsbEnd,
      validWords,
      totalExpected,
      wordTests
    };
    
  } catch (error) {
    console.error(`Erreur lors du traitement de ${fileName}:`, error);
    return null;
  }
}

// Calcul de la moyenne et statistiques
export function calculateAverageAndStats(files: RSBData[]): AnalysisResult {
  const rsbGrid = Array.from({ length: 11 }, (_, i) => -14 + i * 2); // -14 à 6 par pas de 2
  
  // Interpolation des données pour chaque fichier sur la grille commune
  const interpolatedData = files.map(fileData => {
    const interpolatedPercentages = interpolateArray(fileData.rsbPoints, fileData.percentages, rsbGrid);
    const interpolatedTimes = interpolateArray(fileData.rsbPoints, fileData.averageTimes, rsbGrid);
    return { percentages: interpolatedPercentages, times: interpolatedTimes };
  });
  
  // Calcul des statistiques
  const allPercentages = interpolatedData.map(d => d.percentages);
  const allTimes = interpolatedData.map(d => d.times);
  
  const averagePercentages = rsbGrid.map((_, i) => {
    const values = allPercentages.map(p => p[i]).filter(v => !isNaN(v));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  });
  
  const averageTimes = rsbGrid.map((_, i) => {
    const values = allTimes.map(t => t[i]).filter(v => !isNaN(v));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  });
  
  const standardDeviation = rsbGrid.map((_, i) => {
    const values = allPercentages.map(p => p[i]).filter(v => !isNaN(v));
    if (values.length <= 1) return 0;
    const mean = averagePercentages[i];
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  });
  
  const minValues = rsbGrid.map((_, i) => {
    const values = allPercentages.map(p => p[i]).filter(v => !isNaN(v));
    return values.length > 0 ? Math.min(...values) : 0;
  });
  
  const maxValues = rsbGrid.map((_, i) => {
    const values = allPercentages.map(p => p[i]).filter(v => !isNaN(v));
    return values.length > 0 ? Math.max(...values) : 0;
  });
  
  // Déterminer la plage commune
  const commonMin = Math.max(...files.map(f => Math.max(f.rsbStart, f.rsbEnd)));
  const commonMax = Math.min(...files.map(f => Math.min(f.rsbStart, f.rsbEnd)));
  
  return {
    files,
    average: {
      rsbGrid,
      percentages: averagePercentages,
      times: averageTimes,
      standardDeviation,
      min: minValues,
      max: maxValues
    },
    commonRange: {
      min: commonMin,
      max: commonMax
    }
  };
}

// Fonction d'interpolation linéaire
function interpolateArray(xPoints: number[], yPoints: number[], xGrid: number[]): number[] {
  return xGrid.map(x => {
    // Trouver les points d'encadrement
    let i = 0;
    while (i < xPoints.length - 1 && xPoints[i + 1] < x) {
      i++;
    }
    
    if (i === xPoints.length - 1) {
      return yPoints[i];
    }
    
    const x1 = xPoints[i];
    const x2 = xPoints[i + 1];
    const y1 = yPoints[i];
    const y2 = yPoints[i + 1];
    
    // Interpolation linéaire
    return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  });
}

// Export CSV
export function exportToCSV(result: AnalysisResult): string {
  const headers = ['RSB (dB)', 'Pourcentage moyen', 'Écart-type', 'Min', 'Max', 'Temps moyen (ms)'];
  const rows = result.average.rsbGrid.map((rsb, i) => [
    rsb,
    result.average.percentages[i].toFixed(2),
    result.average.standardDeviation[i].toFixed(2),
    result.average.min[i].toFixed(2),
    result.average.max[i].toFixed(2),
    result.average.times[i].toFixed(2)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Fonctions pour l'analyse comparative
export function calculateComparisonMetrics(data: RSBData): ComparisonMetrics {
  const { rsbPoints, percentages } = data;
  
  // Tri pour assurer l'ordre croissant
  const sortedData = rsbPoints.map((rsb, i) => ({ rsb, percentage: percentages[i] }))
    .sort((a, b) => a.rsb - b.rsb);
  
  const sortedRsb = sortedData.map(d => d.rsb);
  const sortedPercentages = sortedData.map(d => d.percentage);
  
  return {
    rsb0: interpolateRSBForPercentage(sortedRsb, sortedPercentages, 0),
    rsb50: interpolateRSBForPercentage(sortedRsb, sortedPercentages, 50),
    rsb100: interpolateRSBForPercentage(sortedRsb, sortedPercentages, 100),
    slope50: calculateSlopeAtPercentage(sortedRsb, sortedPercentages, 50)
  };
}

function interpolateRSBForPercentage(rsbPoints: number[], percentages: number[], targetPercentage: number): number | null {
  // Trouver les points d'encadrement pour le pourcentage cible
  let i = 0;
  while (i < percentages.length - 1 && percentages[i + 1] < targetPercentage) {
    i++;
  }
  
  // Cas limites
  if (i === 0 && percentages[0] > targetPercentage) {
    // Extrapolation en dessous du premier point
    if (percentages.length < 2) return null;
    const slope = (rsbPoints[1] - rsbPoints[0]) / (percentages[1] - percentages[0]);
    return rsbPoints[0] + slope * (targetPercentage - percentages[0]);
  }
  
  if (i === percentages.length - 1) {
    // Extrapolation au-dessus du dernier point
    if (percentages.length < 2) return null;
    const slope = (rsbPoints[i] - rsbPoints[i-1]) / (percentages[i] - percentages[i-1]);
    return rsbPoints[i] + slope * (targetPercentage - percentages[i]);
  }
  
  // Interpolation linéaire
  const x1 = percentages[i];
  const x2 = percentages[i + 1];
  const y1 = rsbPoints[i];
  const y2 = rsbPoints[i + 1];
  
  return y1 + ((y2 - y1) * (targetPercentage - x1)) / (x2 - x1);
}

function calculateSlopeAtPercentage(rsbPoints: number[], percentages: number[], targetPercentage: number): number | null {
  // Trouver l'index du point le plus proche du pourcentage cible
  let closestIndex = 0;
  let minDistance = Math.abs(percentages[0] - targetPercentage);
  
  for (let i = 1; i < percentages.length; i++) {
    const distance = Math.abs(percentages[i] - targetPercentage);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  // Calculer la pente en utilisant les points adjacents
  let slope: number;
  
  if (closestIndex === 0) {
    // Utiliser le point suivant
    if (percentages.length < 2) return null;
    slope = (percentages[1] - percentages[0]) / (rsbPoints[1] - rsbPoints[0]);
  } else if (closestIndex === percentages.length - 1) {
    // Utiliser le point précédent
    slope = (percentages[closestIndex] - percentages[closestIndex - 1]) / 
            (rsbPoints[closestIndex] - rsbPoints[closestIndex - 1]);
  } else {
    // Utiliser la moyenne des pentes adjacentes
    const slope1 = (percentages[closestIndex] - percentages[closestIndex - 1]) / 
                   (rsbPoints[closestIndex] - rsbPoints[closestIndex - 1]);
    const slope2 = (percentages[closestIndex + 1] - percentages[closestIndex]) / 
                   (rsbPoints[closestIndex + 1] - rsbPoints[closestIndex]);
    slope = (slope1 + slope2) / 2;
  }
  
  return slope;
}