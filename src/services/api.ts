import { AnalysisResult, RSBData } from '../types';

// Fonction d'interpolation linéaire (copiée depuis dataProcessor.ts)
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

// Utilise le proxy Vite: toutes les requêtes partent vers /api et sont proxyées vers le backend
const API_BASE_URL = '/api';

export interface Person {
  id: number | string;
  person_name: string;
  raw_data: any;
  created_at?: string;
  age?: number;
  start_time?: string;
  end_time?: string;
  user_id?: string;
  // Nommage front
  pathology?: string;
  comment?: string;
  // Nommage backend (Supabase)
  pathologie?: string;
  commentaire?: string;
}

export interface WordStats {
  word: string;
  total: number;
  success: number;
  rate: number;
}

export interface ErrorStats {
  word: string;
  errors: number;
}

export interface OverviewStats {
  total_users: number;
  average_age: number;
  rsb_range: { min: number; max: number };
  average_valid_word_rate: number;
  last_test_date: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Vérifier la connexion au serveur
  async ping(): Promise<{ status: string; message: string }> {
    // utilise une route existante du back
    const response = await fetch(`${this.baseUrl}/overview`);
    if (!response.ok) {
      throw new Error(`Erreur de connexion au serveur: ${response.status}`);
    }
    return response.json();
  }

  // Récupérer toutes les personnes
  async getPersons(): Promise<Person[]> {
    const response = await fetch(`${this.baseUrl}/persons`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des personnes: ${response.status}`);
    }
    return response.json();
  }

  // Récupérer une personne par nom
  async getPersonByName(name: string): Promise<Person[]> {
    const response = await fetch(`${this.baseUrl}/persons/${encodeURIComponent(name)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Erreur lors de la récupération de la personne: ${response.status}`);
    }
    return response.json();
  }

  // Récupérer les statistiques des mots
  async getWordStats(): Promise<WordStats[]> {
    const response = await fetch(`${this.baseUrl}/stats/words`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${response.status}`);
    }
    return response.json();
  }

  // Récupérer les statistiques d'erreurs
  async getErrorStats(): Promise<ErrorStats[]> {
    const response = await fetch(`${this.baseUrl}/stats/errors`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des erreurs: ${response.status}`);
    }
    return response.json();
  }

  async getOverviewStats(): Promise<OverviewStats> {
    const response = await fetch(`${this.baseUrl}/overview`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de l'overview: ${response.status}`);
    }
    return response.json();
  }

  // Analyser les données d'une personne et les convertir au format RSBData
  processPersonData(person: Person): RSBData | null {
    try {
      const raw = person.raw_data;
      if (!raw) return null;

      // Extraire les paramètres RSB
      const rsbStart = parseInt(raw.rsbStart || '0');
      const rsbEnd = parseInt(raw.rsbEnd || '-14');
      const rsbStep = parseInt(raw.rsbStep || '-2');
      const wordCount = parseInt(raw.wordCnt || '4');

      const nbLevels = Math.abs(Math.floor((rsbEnd - rsbStart) / rsbStep)) + 1;
      const rsbLevels = Array.from({ length: nbLevels }, (_, i) => rsbStart + i * rsbStep);

      const results: { [key: number]: { correct: number; total: number; times: number[] } } = {};
      rsbLevels.forEach(r => {
        results[r] = { correct: 0, total: 0, times: [] };
      });

      let validWords = 0;
      const totalExpected = nbLevels * wordCount;
      const wordTests: any[] = [];

      // Traitement des mots
      for (let i = 0; i < totalExpected; i++) {
        const word = raw[`wordHist/${i}/word`];
        const response = raw[`wordHist/${i}/resp`];
        const rsb = parseFloat(raw[`wordHist/${i}/rsb`]);
        const startTime = parseFloat(raw[`wordHist/${i}/beginningOfSpeechTime`]);
        const endTime = parseFloat(raw[`wordHist/${i}/endOfSpeechTime`]);

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

        const isCorrect = response.toLowerCase().includes(word.toLowerCase());
        if (isCorrect) {
          results[rsb].correct++;
        }
        results[rsb].total++;
        results[rsb].times.push(duration);

        wordTests.push({
          target: word,
          response: response,
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
        file: person.person_name,
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
      console.error(`Erreur lors du traitement des données de ${person.person_name}:`, error);
      return null;
    }
  }

  // Analyser toutes les personnes et calculer les statistiques moyennes
  async analyzeAllPersons(): Promise<AnalysisResult> {
    const persons = await this.getPersons();
    const processedData: RSBData[] = [];

    for (const person of persons) {
      const rsbData = this.processPersonData(person);
      if (rsbData) {
        processedData.push(rsbData);
      }
    }

    if (processedData.length === 0) {
      throw new Error('Aucune donnée valide trouvée');
    }

    // Utiliser la fonction existante pour calculer les statistiques
    const { calculateAverageAndStats } = await import('../utils/dataProcessor');
    return calculateAverageAndStats(processedData);
  }

  // Analyser des personnes spécifiques par nom
  async analyzePersonsByName(names: string[]): Promise<AnalysisResult> {
    try {
      // Utiliser la nouvelle route du backend
      const response = await fetch(`${this.baseUrl}/analyze/persons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personNames: names }),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'analyse: ${response.status}`);
      }

      const results = await response.json();
      
      // Nouvelle structure : { selectedPersons: [...], globalStatistics: {...} }
      const selectedPersons = results.selectedPersons || results;
      const globalStatistics = results.globalStatistics;
      
      if (selectedPersons.length === 0) {
        throw new Error('Aucune donnée valide trouvée pour les personnes spécifiées');
      }

      // Convertir les résultats au format RSBData
      const processedData: RSBData[] = selectedPersons.map((result: any) => ({
        file: result.person_name,
        rsbPoints: result.rsbPoints,
        percentages: result.percentages,
        averageTimes: result.averageTimes,
        rsbStart: result.rsbStart,
        rsbEnd: result.rsbEnd,
        validWords: result.validWords,
        totalExpected: result.totalExpected,
        wordTests: result.wordTests || [], // <-- Correction ici
        statistics: result.statistics // Ajouter les statistiques individuelles
      }));

      const { calculateAverageAndStats } = await import('../utils/dataProcessor');
      const analysisResult = calculateAverageAndStats(processedData);
      
      // Utiliser les statistiques des personnes sélectionnées au lieu des statistiques globales
      // Cela permet d'avoir une courbe moyenne basée uniquement sur les personnes sélectionnées
      if (processedData.length > 0) {
        // Calculer les statistiques sur les personnes sélectionnées
        const rsbGrid = Array.from({ length: 11 }, (_, i) => -14 + i * 2); // -14 à 6 par pas de 2
        
        // Interpolation des données pour chaque personne sélectionnée sur la grille commune
        const interpolatedData = processedData.map(fileData => {
          const interpolatedPercentages = interpolateArray(fileData.rsbPoints, fileData.percentages, rsbGrid);
          return { percentages: interpolatedPercentages };
        });
        
        // Calcul des statistiques pour chaque point RSB sur les personnes sélectionnées
        const selectedMeans = rsbGrid.map((_, i) => {
          const values = interpolatedData.map(d => d.percentages[i]).filter(v => !isNaN(v));
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        });
        
        const selectedStandardDeviations = rsbGrid.map((_, i) => {
          const values = interpolatedData.map(d => d.percentages[i]).filter(v => !isNaN(v));
          if (values.length <= 1) return 0;
          const mean = selectedMeans[i];
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          return Math.sqrt(variance);
        });
        
        const selectedLowerLimits = rsbGrid.map((_, i) => {
          return Math.max(0, selectedMeans[i] - selectedStandardDeviations[i]);
        });
        
        const selectedUpperLimits = rsbGrid.map((_, i) => {
          return Math.min(100, selectedMeans[i] + selectedStandardDeviations[i]);
        });

        analysisResult.globalStatistics = {
          rsbGrid,
          means: selectedMeans,
          standardDeviations: selectedStandardDeviations,
          lowerLimits: selectedLowerLimits,
          upperLimits: selectedUpperLimits,
          totalPersons: processedData.length
        };
      }
      
      return analysisResult;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des personnes:', error);
      throw error;
    }
  }

  async importPersons(persons: any | any[]): Promise<{ success: boolean; count: number; message?: string }> {
    const list = Array.isArray(persons) ? persons : [persons];
    // Envoi en lots pour éviter les erreurs 413/500 (taille/timeout)
    const chunkSize = 50;
    let total = 0;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const res = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`Erreur lors de l'import: ${res.status}${details ? ' - ' + details : ''}`);
      }
      const json = await res.json();
      total += json?.count ?? chunk.length;
      if (json?.failed?.length) {
        console.warn('Certains enregistrements ont échoué:', json.failed);
      }
    }
    return { success: true, count: total, message: `${total} participant(s) importé(s)` };
  }

  // Mettre à jour un participant
  async updatePerson(id: number | string, updates: Partial<Person>): Promise<Person> {
    // Mapper les champs front → backend. Supporte aussi la mise à jour du nom & âge.
    const payload: Record<string, any> = {};
    if (typeof updates.person_name === 'string') payload.person_name = updates.person_name;
    if (typeof updates.age === 'number') payload.age = updates.age;
    if (typeof updates.pathology === 'string') payload.pathology = updates.pathology;
    if (typeof updates.comment === 'string') payload.comment = updates.comment;
    if (typeof updates.pathologie === 'string') payload.pathologie = updates.pathologie;
    if (typeof updates.commentaire === 'string') payload.commentaire = updates.commentaire;

    const response = await fetch(`${this.baseUrl}/persons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erreur lors de la mise à jour: ${response.status} ${text}`);
    }
    const data = await response.json();
    // Le backend renvoie { person: {...} } ; tolérer aussi un objet direct
    const updated: any = (data && data.person) ? data.person : data;
    // Normaliser les noms pour le front
    return {
      ...updated,
      pathology: updated.pathologie ?? updates.pathology,
      comment: updated.commentaire ?? updates.comment,
    } as Person;
  }

  // Supprimer un participant
  async deletePerson(id: number | string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/persons/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erreur lors de la suppression: ${response.status} ${text}`);
    }
  }
}

export const apiService = new ApiService();
export default apiService; 