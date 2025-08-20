// Transcription phonétique française simplifiée
// Basée sur les phonèmes du français standard

export interface PhonemeInfo {
  symbol: string;
  category: 'voyelle' | 'consonne';
  subCategory: string;
  description: string;
}

// Dictionnaire des phonèmes français
export const FRENCH_PHONEMES: { [key: string]: PhonemeInfo } = {
  // Voyelles orales
  'a': { symbol: 'a', category: 'voyelle', subCategory: 'orale', description: 'a de patte' },
  'ɑ': { symbol: 'ɑ', category: 'voyelle', subCategory: 'orale', description: 'â de pâte' },
  'e': { symbol: 'e', category: 'voyelle', subCategory: 'orale', description: 'é de thé' },
  'ɛ': { symbol: 'ɛ', category: 'voyelle', subCategory: 'orale', description: 'è de mère' },
  'i': { symbol: 'i', category: 'voyelle', subCategory: 'orale', description: 'i de lit' },
  'o': { symbol: 'o', category: 'voyelle', subCategory: 'orale', description: 'o de sot' },
  'ɔ': { symbol: 'ɔ', category: 'voyelle', subCategory: 'orale', description: 'o de mort' },
  'u': { symbol: 'u', category: 'voyelle', subCategory: 'orale', description: 'ou de roue' },
  'y': { symbol: 'y', category: 'voyelle', subCategory: 'orale', description: 'u de mur' },
  'ø': { symbol: 'ø', category: 'voyelle', subCategory: 'orale', description: 'eu de peu' },
  'œ': { symbol: 'œ', category: 'voyelle', subCategory: 'orale', description: 'eu de peur' },
  'ə': { symbol: 'ə', category: 'voyelle', subCategory: 'orale', description: 'e de le' },
  
  // Voyelles nasales
  'ã': { symbol: 'ã', category: 'voyelle', subCategory: 'nasale', description: 'an de plan' },
  'ɛ̃': { symbol: 'ɛ̃', category: 'voyelle', subCategory: 'nasale', description: 'in de fin' },
  'ɔ̃': { symbol: 'ɔ̃', category: 'voyelle', subCategory: 'nasale', description: 'on de bon' },
  'œ̃': { symbol: 'œ̃', category: 'voyelle', subCategory: 'nasale', description: 'un de brun' },
  
  // Consonnes occlusives
  'p': { symbol: 'p', category: 'consonne', subCategory: 'occlusive_sourde', description: 'p de pain' },
  'b': { symbol: 'b', category: 'consonne', subCategory: 'occlusive_sonore', description: 'b de bain' },
  't': { symbol: 't', category: 'consonne', subCategory: 'occlusive_sourde', description: 't de temps' },
  'd': { symbol: 'd', category: 'consonne', subCategory: 'occlusive_sonore', description: 'd de dans' },
  'k': { symbol: 'k', category: 'consonne', subCategory: 'occlusive_sourde', description: 'c de car' },
  'g': { symbol: 'g', category: 'consonne', subCategory: 'occlusive_sonore', description: 'g de gare' },
  
  // Consonnes fricatives
  'f': { symbol: 'f', category: 'consonne', subCategory: 'fricative_sourde', description: 'f de feu' },
  'v': { symbol: 'v', category: 'consonne', subCategory: 'fricative_sonore', description: 'v de veux' },
  's': { symbol: 's', category: 'consonne', subCategory: 'fricative_sourde', description: 's de seau' },
  'z': { symbol: 'z', category: 'consonne', subCategory: 'fricative_sonore', description: 'z de zéro' },
  'ʃ': { symbol: 'ʃ', category: 'consonne', subCategory: 'fricative_sourde', description: 'ch de chat' },
  'ʒ': { symbol: 'ʒ', category: 'consonne', subCategory: 'fricative_sonore', description: 'j de jeu' },
  
  // Consonnes nasales
  'm': { symbol: 'm', category: 'consonne', subCategory: 'nasale', description: 'm de mère' },
  'n': { symbol: 'n', category: 'consonne', subCategory: 'nasale', description: 'n de nez' },
  'ɲ': { symbol: 'ɲ', category: 'consonne', subCategory: 'nasale', description: 'gn deagne' },
  'ŋ': { symbol: 'ŋ', category: 'consonne', subCategory: 'nasale', description: 'ng de parking' },
  
  // Consonnes liquides
  'l': { symbol: 'l', category: 'consonne', subCategory: 'liquide', description: 'l de lit' },
  'ʁ': { symbol: 'ʁ', category: 'consonne', subCategory: 'liquide', description: 'r de rat' },
  
  // Semi-consonnes
  'j': { symbol: 'j', category: 'consonne', subCategory: 'semi_consonne', description: 'y de yeux' },
  'w': { symbol: 'w', category: 'consonne', subCategory: 'semi_consonne', description: 'ou de oui' },
  'ɥ': { symbol: 'ɥ', category: 'consonne', subCategory: 'semi_consonne', description: 'u de lui' },
};

// Dictionnaire de transcription phonétique français
// Mappage approximatif orthographe → phonèmes
const FRENCH_PHONETIC_DICT: { [key: string]: string[] } = {
  // Mots fréquents pour tests RSB
  'chat': ['ʃ', 'a'],
  'chien': ['ʃ', 'j', 'ɛ̃'],
  'pain': ['p', 'ɛ̃'],
  'bain': ['b', 'ɛ̃'],
  'main': ['m', 'ɛ̃'],
  'train': ['t', 'ʁ', 'ɛ̃'],
  'grain': ['g', 'ʁ', 'ɛ̃'],
  'plein': ['p', 'l', 'ɛ̃'],
  'sein': ['s', 'ɛ̃'],
  'soin': ['s', 'w', 'ɛ̃'],
  
  'lait': ['l', 'ɛ'],
  'paix': ['p', 'ɛ'],
  'laid': ['l', 'ɛ'],
  'mais': ['m', 'ɛ'],
  'fait': ['f', 'ɛ'],
  'vrai': ['v', 'ʁ', 'ɛ'],
  
  'fou': ['f', 'u'],
  'sous': ['s', 'u'],
  'tout': ['t', 'u'],
  'coup': ['k', 'u'],
  'loup': ['l', 'u'],
  'bout': ['b', 'u'],
  'goût': ['g', 'u'],
  'nous': ['n', 'u'],
  'vous': ['v', 'u'],
  'joue': ['ʒ', 'u'],
  
  'porte': ['p', 'ɔ', 'ʁ', 't'],
  'morte': ['m', 'ɔ', 'ʁ', 't'],
  'forte': ['f', 'ɔ', 'ʁ', 't'],
  'sorte': ['s', 'ɔ', 'ʁ', 't'],
  'corde': ['k', 'ɔ', 'ʁ', 'd'],
  
  'père': ['p', 'ɛ', 'ʁ'],
  'mère': ['m', 'ɛ', 'ʁ'],
  'frère': ['f', 'ʁ', 'ɛ', 'ʁ'],
  'terre': ['t', 'ɛ', 'ʁ'],
  'verre': ['v', 'ɛ', 'ʁ'],
  'guerre': ['g', 'ɛ', 'ʁ'],
  
  'feu': ['f', 'ø'],
  'peu': ['p', 'ø'],
  'deux': ['d', 'ø'],
  'veux': ['v', 'ø'],
  'jeux': ['ʒ', 'ø'],
  'bleu': ['b', 'l', 'ø'],
  
  'peur': ['p', 'œ', 'ʁ'],
  'sœur': ['s', 'œ', 'ʁ'],
  'cœur': ['k', 'œ', 'ʁ'],
  'fleur': ['f', 'l', 'œ', 'ʁ'],
  'heure': ['œ', 'ʁ'],
  
  'long': ['l', 'ɔ̃'],
  'pont': ['p', 'ɔ̃'],
  'fond': ['f', 'ɔ̃'],
  'rond': ['ʁ', 'ɔ̃'],
  'sont': ['s', 'ɔ̃'],
  'mont': ['m', 'ɔ̃'],
  'bon': ['b', 'ɔ̃'],
  'ton': ['t', 'ɔ̃'],
  'don': ['d', 'ɔ̃'],
  
  'blanc': ['b', 'l', 'ã'],
  'grand': ['g', 'ʁ', 'ã'],
  'plan': ['p', 'l', 'ã'],
  'rang': ['ʁ', 'ã'],
  'sang': ['s', 'ã'],
  'dans': ['d', 'ã'],
  'sans': ['s', 'ã'],
  'temps': ['t', 'ã'],
  'champ': ['ʃ', 'ã'],
  
  // Monosyllabes fréquents
  'la': ['l', 'a'],
  'le': ['l', 'ə'],
  'de': ['d', 'ə'],
  'un': ['œ̃'],
  'une': ['y', 'n'],
  'et': ['e'],
  'ou': ['u'],
  'si': ['s', 'i'],
  'ni': ['n', 'i'],
  'mi': ['m', 'i'],
  'lit': ['l', 'i'],
  'dit': ['d', 'i'],
  'fit': ['f', 'i'],
  'kit': ['k', 'i', 't'],
  
  // Variantes d'accents normalisées
  'pere': ['p', 'ɛ', 'ʁ'],  // père sans accent
  'mere': ['m', 'ɛ', 'ʁ'],  // mère sans accent
  'frere': ['f', 'ʁ', 'ɛ', 'ʁ'], // frère sans accent
  'fete': ['f', 'ɛ', 't'],  // fête sans accent
  'tete': ['t', 'ɛ', 't'],  // tête sans accent
  'bete': ['b', 'ɛ', 't'],  // bête sans accent
  
  // Consonnes + voyelles courantes
  'ba': ['b', 'a'],
  'da': ['d', 'a'],
  'ga': ['g', 'a'],
  'ma': ['m', 'a'],
  'na': ['n', 'a'],
  'pa': ['p', 'a'],
  'ta': ['t', 'a'],
  'va': ['v', 'a'],
  'za': ['z', 'a'],
  'ja': ['ʒ', 'a'],
  'ra': ['ʁ', 'a'],
  'sa': ['s', 'a'],
  'cha': ['ʃ', 'a'],
  'fa': ['f', 'a'],
  
  // Mots avec consonnes groupées
  'pré': ['p', 'ʁ', 'e'],
  'pro': ['p', 'ʁ', 'o'],
  'pru': ['p', 'ʁ', 'y'],
  'bré': ['b', 'ʁ', 'e'],
  'bro': ['b', 'ʁ', 'o'],
  'cré': ['k', 'ʁ', 'e'],
  'cro': ['k', 'ʁ', 'o'],
  'dré': ['d', 'ʁ', 'e'],
  'dro': ['d', 'ʁ', 'o'],
  'fré': ['f', 'ʁ', 'e'],
  'fro': ['f', 'ʁ', 'o'],
  'gré': ['g', 'ʁ', 'e'],
  'gro': ['g', 'ʁ', 'o'],
  'tré': ['t', 'ʁ', 'e'],
  'tro': ['t', 'ʁ', 'o'],
  
  'pla': ['p', 'l', 'a'],
  'ple': ['p', 'l', 'ə'],
  'pli': ['p', 'l', 'i'],
  'plo': ['p', 'l', 'o'],
  'blu': ['b', 'l', 'y'],
  'bla': ['b', 'l', 'a'],
  'ble': ['b', 'l', 'ə'],
  'bli': ['b', 'l', 'i'],
  'blo': ['b', 'l', 'o'],
  'cla': ['k', 'l', 'a'],
  'cle': ['k', 'l', 'e'],
  'cli': ['k', 'l', 'i'],
  'clo': ['k', 'l', 'o'],
  'flu': ['f', 'l', 'y'],
  'fla': ['f', 'l', 'a'],
  'fle': ['f', 'l', 'ə'],
  'fli': ['f', 'l', 'i'],
  'flo': ['f', 'l', 'o'],
  'gla': ['g', 'l', 'a'],
  'gle': ['g', 'l', 'ə'],
  'gli': ['g', 'l', 'i'],
  'glo': ['g', 'l', 'o'],
};

// Articles à ignorer dans l'analyse phonétique
const ARTICLES_TO_IGNORE = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'l\'', 'd\''];

// Fonction de normalisation des mots avant analyse phonétique
export function normalizeWordForPhoneticAnalysis(word: string): string {
  let normalized = word.toLowerCase().trim();
  
  // Supprimer la ponctuation
  normalized = normalized.replace(/[.,;:!?'"()\-]/g, '');
  
  // Normaliser les accents - traiter é comme e, è comme e, etc.
  normalized = normalized
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ÿ]/g, 'y')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n');
  
  // Diviser en mots pour traiter les articles
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  // Filtrer les articles
  const filteredWords = words.filter(w => !ARTICLES_TO_IGNORE.includes(w));
  
  // Si tous les mots sont des articles, garder le dernier
  if (filteredWords.length === 0 && words.length > 0) {
    return words[words.length - 1];
  }
  
  // Retourner le premier mot non-article (ou le mot unique)
  return filteredWords.length > 0 ? filteredWords[0] : normalized;
}

// Règles de transcription phonétique simplifiées
export function transcribeToPhonemes(word: string): string[] {
  const normalizedWord = normalizeWordForPhoneticAnalysis(word);
  
  // Vérifier d'abord dans le dictionnaire
  if (FRENCH_PHONETIC_DICT[normalizedWord]) {
    return FRENCH_PHONETIC_DICT[normalizedWord];
  }
  
  // Règles de transcription de base pour les mots non listés
  return transcribeWithRules(normalizedWord);
}

function transcribeWithRules(word: string): string[] {
  const phonemes: string[] = [];
  let i = 0;
  
  while (i < word.length) {
    let consumed = false;
    
    // Digrammes et trigrammes fréquents
    if (i < word.length - 1) {
      const bigram = word.slice(i, i + 2);
      
      switch (bigram) {
        case 'ch':
          phonemes.push('ʃ');
          i += 2;
          consumed = true;
          break;
        case 'qu':
          phonemes.push('k');
          i += 2;
          consumed = true;
          break;
        case 'ph':
          phonemes.push('f');
          i += 2;
          consumed = true;
          break;
        case 'th':
          phonemes.push('t');
          i += 2;
          consumed = true;
          break;
        case 'gn':
          phonemes.push('ɲ');
          i += 2;
          consumed = true;
          break;
        case 'ou':
          phonemes.push('u');
          i += 2;
          consumed = true;
          break;
        case 'eu':
          // Contexte pour eu vs œ
          if (i === word.length - 2 || isConsonant(word[i + 2])) {
            phonemes.push('ø');
          } else {
            phonemes.push('œ');
          }
          i += 2;
          consumed = true;
          break;
        case 'au':
        case 'eau':
          phonemes.push('o');
          i += bigram === 'eau' ? 3 : 2;
          consumed = true;
          break;
        case 'ai':
        case 'ei':
          phonemes.push('ɛ');
          i += 2;
          consumed = true;
          break;
        case 'on':
          phonemes.push('ɔ̃');
          i += 2;
          consumed = true;
          break;
        case 'an':
        case 'en':
          phonemes.push('ã');
          i += 2;
          consumed = true;
          break;
        case 'in':
        case 'yn':
        case 'ain':
        case 'ein':
          phonemes.push('ɛ̃');
          i += bigram.length;
          consumed = true;
          break;
        case 'un':
          phonemes.push('œ̃');
          i += 2;
          consumed = true;
          break;
      }
    }
    
    // Caractères simples
    if (!consumed) {
      const char = word[i];
      
      switch (char) {
        case 'a': phonemes.push('a'); break;
        case 'e':
          // Règles pour e/ɛ/ə
          if (i === word.length - 1 && word.length > 1) {
            phonemes.push('ə'); // e muet final
          } else if (i < word.length - 1 && word[i + 1] === 'r') {
            phonemes.push('ɛ');
          } else {
            phonemes.push('e');
          }
          break;
        case 'i': phonemes.push('i'); break;
        case 'o': phonemes.push('o'); break;
        case 'u': phonemes.push('y'); break; // u français = [y]
        case 'y': phonemes.push('i'); break; // y = i dans la plupart des cas
        
        // Consonnes
        case 'b': phonemes.push('b'); break;
        case 'c':
          // c dur/doux
          if (i < word.length - 1 && 'ei'.includes(word[i + 1])) {
            phonemes.push('s');
          } else {
            phonemes.push('k');
          }
          break;
        case 'd': phonemes.push('d'); break;
        case 'f': phonemes.push('f'); break;
        case 'g':
          // g dur/doux
          if (i < word.length - 1 && 'ei'.includes(word[i + 1])) {
            phonemes.push('ʒ');
          } else {
            phonemes.push('g');
          }
          break;
        case 'h': break; // h muet
        case 'j': phonemes.push('ʒ'); break;
        case 'k': phonemes.push('k'); break;
        case 'l': phonemes.push('l'); break;
        case 'm': phonemes.push('m'); break;
        case 'n': phonemes.push('n'); break;
        case 'p': phonemes.push('p'); break;
        case 'r': phonemes.push('ʁ'); break;
        case 's':
          // s/z selon contexte
          if (i > 0 && i < word.length - 1 && isVowel(word[i - 1]) && isVowel(word[i + 1])) {
            phonemes.push('z');
          } else {
            phonemes.push('s');
          }
          break;
        case 't': phonemes.push('t'); break;
        case 'v': phonemes.push('v'); break;
        case 'w': phonemes.push('w'); break;
        case 'x': phonemes.push('k', 's'); break;
        case 'z': phonemes.push('z'); break;
        
        // Ignorer autres caractères (ponctuation, etc.)
        default: break;
      }
      i++;
    }
  }
  
  return phonemes;
}

function isVowel(char: string): boolean {
  return 'aeiouy'.includes(char.toLowerCase());
}

function isConsonant(char: string): boolean {
  return /[bcdfghjklmnpqrstvwxz]/.test(char.toLowerCase());
}

// Calcul de distance phonétique entre deux mots
export function calculatePhoneticDistance(word1: string, word2: string): number {
  const phonemes1 = transcribeToPhonemes(word1);
  const phonemes2 = transcribeToPhonemes(word2);
  
  // Distance de Levenshtein sur les phonèmes
  return levenshteinDistance(phonemes1, phonemes2);
}

function levenshteinDistance(arr1: string[], arr2: string[]): number {
  const matrix = Array(arr1.length + 1).fill(null).map(() => Array(arr2.length + 1).fill(0));
  
  for (let i = 0; i <= arr1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= arr2.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= arr1.length; i++) {
    for (let j = 1; j <= arr2.length; j++) {
      const cost = arr1[i - 1] === arr2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // suppression
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[arr1.length][arr2.length];
}

// Test de la transcription
export function testTranscription(): void {
  console.log('=== Test de transcription phonétique ===');
  const testWords = ['chat', 'chien', 'pain', 'deux', 'peur', 'rond', 'blanc'];
  
  testWords.forEach(word => {
    const phonemes = transcribeToPhonemes(word);
    console.log(`${word} → [${phonemes.join(', ')}]`);
  });
}

// Test de la normalisation avec articles et accents
export function testNormalization(): void {
  console.log('=== Test de normalisation ===');
  const testCases = [
    { input: 'le chat', expected: 'chat' },
    { input: 'la maison', expected: 'maison' },
    { input: 'les chiens', expected: 'chiens' },
    { input: 'un pain', expected: 'pain' },
    { input: 'une mère', expected: 'mere' },
    { input: 'père', expected: 'pere' },
    { input: 'été', expected: 'ete' },
    { input: 'café', expected: 'cafe' },
    { input: 'être', expected: 'etre' },
    { input: 'élève', expected: 'eleve' },
    { input: 'du pain', expected: 'pain' },
    { input: 'des mots', expected: 'mots' }
  ];
  
  testCases.forEach(testCase => {
    const normalized = normalizeWordForPhoneticAnalysis(testCase.input);
    const status = normalized === testCase.expected ? '✓' : '✗';
    console.log(`${status} "${testCase.input}" → "${normalized}" (attendu: "${testCase.expected}")`);
  });
}