import { 
  PhonemeError, 
  PhonemeConfusion, 
  PhonemeAnalysis, 
  PhoneticAnalysisResult,
  RSBData,
  WordTest 
} from '../types';
import { 
  transcribeToPhonemes, 
  calculatePhoneticDistance, 
  FRENCH_PHONEMES 
} from './phoneticTranscription';

// Alignement phonétique entre mot cible et réponse
export function alignPhonemes(target: string[], response: string[]): Array<{
  target: string | null;
  response: string | null;
  position: number;
  type: 'match' | 'substitution' | 'insertion' | 'deletion';
}> {
  const alignment: Array<{
    target: string | null;
    response: string | null;
    position: number;
    type: 'match' | 'substitution' | 'insertion' | 'deletion';
  }> = [];

  // Algorithme d'alignement optimal (programmation dynamique)
  const m = target.length;
  const n = response.length;
  
  // Matrice de coûts
  const cost = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  const trace = Array(m + 1).fill(null).map(() => Array(n + 1).fill(''));
  
  // Initialisation
  for (let i = 0; i <= m; i++) {
    cost[i][0] = i;
    trace[i][0] = 'D'; // Deletion
  }
  for (let j = 0; j <= n; j++) {
    cost[0][j] = j;
    trace[0][j] = 'I'; // Insertion
  }
  
  // Remplissage de la matrice
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = target[i - 1] === response[j - 1] ? 0 : 1;
      const costs = {
        substitution: cost[i - 1][j - 1] + match,
        deletion: cost[i - 1][j] + 1,
        insertion: cost[i][j - 1] + 1
      };
      
      const minCost = Math.min(costs.substitution, costs.deletion, costs.insertion);
      cost[i][j] = minCost;
      
      if (minCost === costs.substitution) {
        trace[i][j] = match === 0 ? 'M' : 'S'; // Match or Substitution
      } else if (minCost === costs.deletion) {
        trace[i][j] = 'D'; // Deletion
      } else {
        trace[i][j] = 'I'; // Insertion
      }
    }
  }
  
  // Reconstruction de l'alignement
  let i = m, j = n, pos = 0;
  while (i > 0 || j > 0) {
    switch (trace[i][j]) {
      case 'M':
        alignment.unshift({
          target: target[i - 1],
          response: response[j - 1],
          position: pos,
          type: 'match'
        });
        i--; j--; pos++;
        break;
      case 'S':
        alignment.unshift({
          target: target[i - 1],
          response: response[j - 1],
          position: pos,
          type: 'substitution'
        });
        i--; j--; pos++;
        break;
      case 'D':
        alignment.unshift({
          target: target[i - 1],
          response: null,
          position: pos,
          type: 'deletion'
        });
        i--; pos++;
        break;
      case 'I':
        alignment.unshift({
          target: null,
          response: response[j - 1],
          position: pos,
          type: 'insertion'
        });
        j--; pos++;
        break;
    }
  }
  
  return alignment;
}

// Analyse des erreurs phonétiques d'un test de mot
export function analyzeWordPhonetics(wordTest: WordTest): PhonemeError[] {
  const targetPhonemes = transcribeToPhonemes(wordTest.target);
  const responsePhonemes = transcribeToPhonemes(wordTest.response);
  
  const alignment = alignPhonemes(targetPhonemes, responsePhonemes);
  const errors: PhonemeError[] = [];
  
  alignment.forEach((align, index) => {
    if (align.type !== 'match') {
      errors.push({
        target: align.target || '',
        response: align.response || '',
        position: index,
        wordTarget: wordTest.target,
        wordResponse: wordTest.response,
        rsb: wordTest.rsb,
        errorType: align.type === 'insertion' ? 'insertion' : 
                  align.type === 'deletion' ? 'deletion' : 'substitution'
      });
    }
  });
  
  return errors;
}

// Classification des phonèmes par catégorie
function getPhonemeCategory(phoneme: string): string[] {
  const info = FRENCH_PHONEMES[phoneme];
  if (!info) return ['inconnu'];
  
  const categories = [info.category];
  
  if (info.category === 'voyelle') {
    categories.push(info.subCategory);
  } else if (info.category === 'consonne') {
    categories.push(info.subCategory);
    if (info.subCategory.includes('nasale')) categories.push('nasales');
    if (info.subCategory.includes('occlusive')) categories.push('occlusives');
    if (info.subCategory.includes('fricative')) categories.push('fricatives');
  }
  
  return categories;
}

// Classification des erreurs par position dans le mot
function getPositionCategory(position: number, totalLength: number): 'debut' | 'milieu' | 'fin' {
  const ratio = position / totalLength;
  if (ratio < 0.33) return 'debut';
  if (ratio > 0.66) return 'fin';
  return 'milieu';
}

// Analyse phonétique complète d'une personne
export function analyzePersonPhonetics(rsbData: RSBData): PhoneticAnalysisResult {
  const allErrors: PhonemeError[] = [];
  let totalPhonemes = 0;
  let correctPhonemes = 0;
  
  // Analyser chaque test de mot
  rsbData.wordTests.forEach(wordTest => {
    const wordErrors = analyzeWordPhonetics(wordTest);
    allErrors.push(...wordErrors);
    
    const targetPhonemes = transcribeToPhonemes(wordTest.target);
    totalPhonemes += targetPhonemes.length;
    correctPhonemes += targetPhonemes.length - wordErrors.length;
  });
  
  // Grouper les erreurs par RSB
  const errorsByRsb: { [rsb: number]: PhonemeError[] } = {};
  allErrors.forEach(error => {
    if (!errorsByRsb[error.rsb]) {
      errorsByRsb[error.rsb] = [];
    }
    errorsByRsb[error.rsb].push(error);
  });
  
  // Grouper les erreurs par catégorie phonétique
  const errorsByCategory = {
    voyelles: [] as PhonemeError[],
    consonnes: [] as PhonemeError[],
    nasales: [] as PhonemeError[],
    occlusives: [] as PhonemeError[],
    fricatives: [] as PhonemeError[]
  };
  
  allErrors.forEach(error => {
    const categories = getPhonemeCategory(error.target);
    categories.forEach(category => {
      if (category === 'voyelle') errorsByCategory.voyelles.push(error);
      if (category === 'consonne') errorsByCategory.consonnes.push(error);
      if (category === 'nasales') errorsByCategory.nasales.push(error);
      if (category === 'occlusives') errorsByCategory.occlusives.push(error);
      if (category === 'fricatives') errorsByCategory.fricatives.push(error);
    });
  });
  
  // Grouper les erreurs par position
  const errorsByPosition = {
    debut: [] as PhonemeError[],
    milieu: [] as PhonemeError[],
    fin: [] as PhonemeError[]
  };
  
  allErrors.forEach(error => {
    const targetPhonemes = transcribeToPhonemes(error.wordTarget);
    const posCategory = getPositionCategory(error.position, targetPhonemes.length);
    errorsByPosition[posCategory].push(error);
  });
  
  // Calculer la matrice de confusion
  const confusionMap = new Map<string, Map<string, number>>();
  allErrors.forEach(error => {
    if (error.errorType === 'substitution') {
      if (!confusionMap.has(error.target)) {
        confusionMap.set(error.target, new Map());
      }
      const responseMap = confusionMap.get(error.target)!;
      responseMap.set(error.response, (responseMap.get(error.response) || 0) + 1);
    }
  });
  
  const confusionMatrix: PhonemeConfusion[] = [];
  confusionMap.forEach((responseMap, target) => {
    responseMap.forEach((count, response) => {
      const errorInstances = allErrors.filter(e => 
        e.target === target && e.response === response && e.errorType === 'substitution'
      );
      const avgRsb = errorInstances.reduce((sum, e) => sum + e.rsb, 0) / errorInstances.length;
      
      confusionMatrix.push({
        targetPhoneme: target,
        responsePhoneme: response,
        count,
        percentage: (count / totalPhonemes) * 100,
        avgRsb
      });
    });
  });
  
  // Calculer la distance phonétique moyenne
  let totalDistance = 0;
  rsbData.wordTests.forEach(wordTest => {
    totalDistance += calculatePhoneticDistance(wordTest.target, wordTest.response);
  });
  const phoneticDistanceAvg = totalDistance / rsbData.wordTests.length;
  
  // Analyse totale
  const totalAnalysis: PhonemeAnalysis = {
    totalPhonemes,
    correctPhonemes,
    errors: allErrors,
    confusionMatrix,
    errorsByRsb,
    errorsByCategory,
    errorsByPosition,
    phoneticAccuracy: (correctPhonemes / totalPhonemes) * 100,
    phoneticDistanceAvg
  };
  
  // Analyses par niveau RSB
  const analysisByRsb: { [rsb: number]: PhonemeAnalysis } = {};
  const rsbLevels = [...new Set(rsbData.wordTests.map(w => w.rsb))].sort((a, b) => a - b);
  
  rsbLevels.forEach(rsb => {
    const rsbWordTests = rsbData.wordTests.filter(w => w.rsb === rsb);
    const rsbErrors = allErrors.filter(e => e.rsb === rsb);
    
    let rsbTotalPhonemes = 0;
    rsbWordTests.forEach(wordTest => {
      rsbTotalPhonemes += transcribeToPhonemes(wordTest.target).length;
    });
    
    const rsbCorrectPhonemes = rsbTotalPhonemes - rsbErrors.length;
    
    analysisByRsb[rsb] = {
      totalPhonemes: rsbTotalPhonemes,
      correctPhonemes: rsbCorrectPhonemes,
      errors: rsbErrors,
      confusionMatrix: confusionMatrix.filter(c => 
        allErrors.some(e => e.target === c.targetPhoneme && e.response === c.responsePhoneme && e.rsb === rsb)
      ),
      errorsByRsb: { [rsb]: rsbErrors },
      errorsByCategory: {
        voyelles: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('voyelle')),
        consonnes: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('consonne')),
        nasales: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('nasales')),
        occlusives: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('occlusives')),
        fricatives: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('fricatives'))
      },
      errorsByPosition: {
        debut: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'debut';
        }),
        milieu: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'milieu';
        }),
        fin: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'fin';
        })
      },
      phoneticAccuracy: (rsbCorrectPhonemes / rsbTotalPhonemes) * 100,
      phoneticDistanceAvg: rsbWordTests.reduce((sum, w) => 
        sum + calculatePhoneticDistance(w.target, w.response), 0) / rsbWordTests.length
    };
  });
  
  // Calcul de la précision phonétique par RSB
  const phoneticAccuracyByRsb = rsbLevels.map(rsb => analysisByRsb[rsb].phoneticAccuracy);
  
  return {
    personName: rsbData.file,
    rsbLevels,
    phoneticAccuracyByRsb,
    totalAnalysis,
    analysisByRsb
  };
}

// Fonction pour créer une analyse phonétique agrégée de plusieurs participants
export function createAggregatePhoneticAnalysis(analysisResults: PhoneticAnalysisResult[]): PhoneticAnalysisResult {
  if (analysisResults.length === 0) {
    throw new Error('Aucune analyse fournie pour l\'agrégation');
  }

  if (analysisResults.length === 1) {
    return analysisResults[0];
  }

  // Collecter tous les niveaux RSB uniques
  const allRsbLevels = [...new Set(
    analysisResults.flatMap(result => result.rsbLevels)
  )].sort((a, b) => a - b);

  // Agréger toutes les erreurs
  const aggregatedErrors: PhonemeError[] = [];
  let aggregatedTotalPhonemes = 0;
  let aggregatedCorrectPhonemes = 0;
  let aggregatedPhoneticDistance = 0;

  analysisResults.forEach(result => {
    aggregatedErrors.push(...result.totalAnalysis.errors);
    aggregatedTotalPhonemes += result.totalAnalysis.totalPhonemes;
    aggregatedCorrectPhonemes += result.totalAnalysis.correctPhonemes;
    aggregatedPhoneticDistance += result.totalAnalysis.phoneticDistanceAvg * result.totalAnalysis.totalPhonemes;
  });

  const avgPhoneticDistance = aggregatedPhoneticDistance / aggregatedTotalPhonemes;

  // Agréger les erreurs par catégorie
  const aggregatedErrorsByCategory = {
    voyelles: [] as PhonemeError[],
    consonnes: [] as PhonemeError[],
    nasales: [] as PhonemeError[],
    occlusives: [] as PhonemeError[],
    fricatives: [] as PhonemeError[]
  };

  aggregatedErrors.forEach(error => {
    const categories = getPhonemeCategory(error.target);
    categories.forEach(category => {
      if (category === 'voyelle') aggregatedErrorsByCategory.voyelles.push(error);
      if (category === 'consonne') aggregatedErrorsByCategory.consonnes.push(error);
      if (category === 'nasales') aggregatedErrorsByCategory.nasales.push(error);
      if (category === 'occlusives') aggregatedErrorsByCategory.occlusives.push(error);
      if (category === 'fricatives') aggregatedErrorsByCategory.fricatives.push(error);
    });
  });

  // Agréger les erreurs par position
  const aggregatedErrorsByPosition = {
    debut: [] as PhonemeError[],
    milieu: [] as PhonemeError[],
    fin: [] as PhonemeError[]
  };

  aggregatedErrors.forEach(error => {
    const targetPhonemes = transcribeToPhonemes(error.wordTarget);
    const posCategory = getPositionCategory(error.position, targetPhonemes.length);
    aggregatedErrorsByPosition[posCategory].push(error);
  });

  // Agréger les erreurs par RSB
  const aggregatedErrorsByRsb: { [rsb: number]: PhonemeError[] } = {};
  aggregatedErrors.forEach(error => {
    if (!aggregatedErrorsByRsb[error.rsb]) {
      aggregatedErrorsByRsb[error.rsb] = [];
    }
    aggregatedErrorsByRsb[error.rsb].push(error);
  });

  // Calculer la matrice de confusion agrégée
  const confusionMap = new Map<string, Map<string, number>>();
  aggregatedErrors.forEach(error => {
    if (error.errorType === 'substitution') {
      if (!confusionMap.has(error.target)) {
        confusionMap.set(error.target, new Map());
      }
      const responseMap = confusionMap.get(error.target)!;
      responseMap.set(error.response, (responseMap.get(error.response) || 0) + 1);
    }
  });

  const aggregatedConfusionMatrix: PhonemeConfusion[] = [];
  confusionMap.forEach((responseMap, target) => {
    responseMap.forEach((count, response) => {
      const errorInstances = aggregatedErrors.filter(e => 
        e.target === target && e.response === response && e.errorType === 'substitution'
      );
      const avgRsb = errorInstances.reduce((sum, e) => sum + e.rsb, 0) / errorInstances.length;
      
      aggregatedConfusionMatrix.push({
        targetPhoneme: target,
        responsePhoneme: response,
        count,
        percentage: (count / aggregatedTotalPhonemes) * 100,
        avgRsb
      });
    });
  });

  // Analyse totale agrégée
  const aggregatedTotalAnalysis: PhonemeAnalysis = {
    totalPhonemes: aggregatedTotalPhonemes,
    correctPhonemes: aggregatedCorrectPhonemes,
    errors: aggregatedErrors,
    confusionMatrix: aggregatedConfusionMatrix,
    errorsByRsb: aggregatedErrorsByRsb,
    errorsByCategory: aggregatedErrorsByCategory,
    errorsByPosition: aggregatedErrorsByPosition,
    phoneticAccuracy: (aggregatedCorrectPhonemes / aggregatedTotalPhonemes) * 100,
    phoneticDistanceAvg: avgPhoneticDistance
  };

  // Analyses par niveau RSB agrégées
  const aggregatedAnalysisByRsb: { [rsb: number]: PhonemeAnalysis } = {};
  
  allRsbLevels.forEach(rsb => {
    const rsbErrors = aggregatedErrors.filter(e => e.rsb === rsb);
    
    // Calculer le total de phonèmes pour ce niveau RSB
    let rsbTotalPhonemes = 0;
    analysisResults.forEach(result => {
      if (result.analysisByRsb[rsb]) {
        rsbTotalPhonemes += result.analysisByRsb[rsb].totalPhonemes;
      }
    });
    
    const rsbCorrectPhonemes = rsbTotalPhonemes - rsbErrors.length;
    
    // Calculer la distance phonétique moyenne pour ce RSB
    let rsbDistanceSum = 0;
    let rsbTestCount = 0;
    analysisResults.forEach(result => {
      if (result.analysisByRsb[rsb]) {
        rsbDistanceSum += result.analysisByRsb[rsb].phoneticDistanceAvg * result.analysisByRsb[rsb].totalPhonemes;
        rsbTestCount += result.analysisByRsb[rsb].totalPhonemes;
      }
    });
    const rsbAvgDistance = rsbTestCount > 0 ? rsbDistanceSum / rsbTestCount : 0;

    aggregatedAnalysisByRsb[rsb] = {
      totalPhonemes: rsbTotalPhonemes,
      correctPhonemes: rsbCorrectPhonemes,
      errors: rsbErrors,
      confusionMatrix: aggregatedConfusionMatrix.filter(c => 
        rsbErrors.some(e => e.target === c.targetPhoneme && e.response === c.responsePhoneme)
      ),
      errorsByRsb: { [rsb]: rsbErrors },
      errorsByCategory: {
        voyelles: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('voyelle')),
        consonnes: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('consonne')),
        nasales: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('nasales')),
        occlusives: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('occlusives')),
        fricatives: rsbErrors.filter(e => getPhonemeCategory(e.target).includes('fricatives'))
      },
      errorsByPosition: {
        debut: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'debut';
        }),
        milieu: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'milieu';
        }),
        fin: rsbErrors.filter(e => {
          const phonemes = transcribeToPhonemes(e.wordTarget);
          return getPositionCategory(e.position, phonemes.length) === 'fin';
        })
      },
      phoneticAccuracy: rsbTotalPhonemes > 0 ? (rsbCorrectPhonemes / rsbTotalPhonemes) * 100 : 0,
      phoneticDistanceAvg: rsbAvgDistance
    };
  });

  // Calcul de la précision phonétique par RSB
  const aggregatedPhoneticAccuracyByRsb = allRsbLevels.map(rsb => 
    aggregatedAnalysisByRsb[rsb] ? aggregatedAnalysisByRsb[rsb].phoneticAccuracy : 0
  );

  return {
    personName: `📊 Analyse Agrégée (${analysisResults.length} participant${analysisResults.length > 1 ? 's' : ''})`,
    rsbLevels: allRsbLevels,
    phoneticAccuracyByRsb: aggregatedPhoneticAccuracyByRsb,
    totalAnalysis: aggregatedTotalAnalysis,
    analysisByRsb: aggregatedAnalysisByRsb
  };
}

// Comparaison phonétique entre deux personnes
export function comparePhoneticAnalysis(
  analysis1: PhoneticAnalysisResult, 
  analysis2: PhoneticAnalysisResult
): {
  accuracyDifference: number[];
  confusionDifferences: { 
    phoneme: string; 
    person1Count: number; 
    person2Count: number; 
    difference: number 
  }[];
  categoryDifferences: {
    category: string;
    person1Errors: number;
    person2Errors: number;
    difference: number;
  }[];
} {
  // Différences de précision par RSB
  const accuracyDifference = analysis1.phoneticAccuracyByRsb.map((acc1, index) => {
    const acc2 = analysis2.phoneticAccuracyByRsb[index] || 0;
    return acc1 - acc2;
  });
  
  // Différences dans la matrice de confusion
  const confusions1 = new Map<string, number>();
  const confusions2 = new Map<string, number>();
  
  analysis1.totalAnalysis.confusionMatrix.forEach(c => {
    confusions1.set(c.targetPhoneme, c.count);
  });
  
  analysis2.totalAnalysis.confusionMatrix.forEach(c => {
    confusions2.set(c.targetPhoneme, c.count);
  });
  
  const allPhonemes = new Set([...confusions1.keys(), ...confusions2.keys()]);
  const confusionDifferences = Array.from(allPhonemes).map(phoneme => ({
    phoneme,
    person1Count: confusions1.get(phoneme) || 0,
    person2Count: confusions2.get(phoneme) || 0,
    difference: (confusions1.get(phoneme) || 0) - (confusions2.get(phoneme) || 0)
  }));
  
  // Différences par catégorie
  const categories = ['voyelles', 'consonnes', 'nasales', 'occlusives', 'fricatives'] as const;
  const categoryDifferences = categories.map(category => ({
    category,
    person1Errors: analysis1.totalAnalysis.errorsByCategory[category].length,
    person2Errors: analysis2.totalAnalysis.errorsByCategory[category].length,
    difference: analysis1.totalAnalysis.errorsByCategory[category].length - 
               analysis2.totalAnalysis.errorsByCategory[category].length
  }));
  
  return {
    accuracyDifference,
    confusionDifferences,
    categoryDifferences
  };
}