import { transcribeToPhonemes, calculatePhoneticDistance, testTranscription } from './phoneticTranscription';
import { analyzeWordPhonetics, alignPhonemes } from './phoneticAnalysis';
import { WordTest } from '../types';

// Test complet de la fonctionnalité phonétique
export function runPhoneticTests(): void {
  console.log('=== TESTS PHONÉTIQUES ===\n');

  // 1. Test de transcription
  console.log('1. Test de transcription phonétique:');
  testTranscription();
  console.log('');

  // 2. Test d'alignement
  console.log('2. Test d\'alignement phonétique:');
  testAlignment();
  console.log('');

  // 3. Test d'analyse complète
  console.log('3. Test d\'analyse d\'erreurs:');
  testErrorAnalysis();
  console.log('');

  // 4. Test de distance phonétique
  console.log('4. Test de distance phonétique:');
  testPhoneticDistance();
}

function testAlignment(): void {
  const testCases = [
    { target: ['ʃ', 'a'], response: ['ʃ', 'a'] }, // Match parfait
    { target: ['ʃ', 'a'], response: ['s', 'a'] }, // Substitution
    { target: ['ʃ', 'a'], response: ['ʃ', 'a', 't'] }, // Insertion
    { target: ['ʃ', 'a', 't'], response: ['ʃ', 'a'] }, // Deletion
  ];

  testCases.forEach((testCase, index) => {
    const alignment = alignPhonemes(testCase.target, testCase.response);
    console.log(`Test ${index + 1}:`);
    console.log(`  Cible: [${testCase.target.join(', ')}]`);
    console.log(`  Réponse: [${testCase.response.join(', ')}]`);
    console.log(`  Alignement:`);
    alignment.forEach(align => {
      console.log(`    ${align.target || 'Ø'} → ${align.response || 'Ø'} (${align.type})`);
    });
    console.log('');
  });
}

function testErrorAnalysis(): void {
  const testWords: WordTest[] = [
    {
      target: 'chat',
      response: 'sat',
      isCorrect: false,
      rsb: -6,
      duration: 1200
    },
    {
      target: 'pain',
      response: 'bain',
      isCorrect: false,
      rsb: -8,
      duration: 1100
    },
    {
      target: 'feu',
      response: 'peu',
      isCorrect: false,
      rsb: -4,
      duration: 900
    }
  ];

  testWords.forEach(wordTest => {
    const errors = analyzeWordPhonetics(wordTest);
    console.log(`Analyse de "${wordTest.target}" → "${wordTest.response}":`);
    
    if (errors.length === 0) {
      console.log('  Aucune erreur phonétique détectée');
    } else {
      errors.forEach(error => {
        console.log(`  Erreur: ${error.target} → ${error.response} (${error.errorType}) à la position ${error.position}`);
      });
    }
    console.log('');
  });
}

function testPhoneticDistance(): void {
  const testPairs = [
    ['chat', 'chat'], // Identique
    ['chat', 'sat'],  // Une substitution
    ['pain', 'bain'], // Une substitution
    ['feu', 'peu'],   // Une substitution
    ['chat', 'rat'],  // Deletion + substitution
    ['pain', 'train'], // Insertion
  ];

  testPairs.forEach(([word1, word2]) => {
    const distance = calculatePhoneticDistance(word1, word2);
    const phonemes1 = transcribeToPhonemes(word1);
    const phonemes2 = transcribeToPhonemes(word2);
    
    console.log(`"${word1}" [${phonemes1.join(', ')}] ↔ "${word2}" [${phonemes2.join(', ')}]`);
    console.log(`  Distance: ${distance}`);
    console.log('');
  });
}

// Test spécifique des confusions fréquentes
export function testCommonConfusions(): void {
  console.log('=== TEST DES CONFUSIONS FRÉQUENTES ===\n');

  const commonConfusions = [
    // Occlusives sourdes/sonores
    ['pain', 'bain'], // p/b
    ['temps', 'dans'], // t/d  
    ['car', 'gare'], // k/g
    
    // Fricatives sourdes/sonores
    ['feu', 'veux'], // f/v
    ['seau', 'zéro'], // s/z
    ['chat', 'jeu'], // ʃ/ʒ
    
    // Voyelles
    ['peu', 'peur'], // ø/œ
    ['lit', 'lu'], // i/y
    ['sot', 'sort'], // o/ɔ
  ];

  commonConfusions.forEach(([target, response]) => {
    const wordTest: WordTest = {
      target,
      response,
      isCorrect: false,
      rsb: -6,
      duration: 1000
    };

    const errors = analyzeWordPhonetics(wordTest);
    const distance = calculatePhoneticDistance(target, response);
    
    console.log(`"${target}" → "${response}"`);
    console.log(`  Distance phonétique: ${distance}`);
    if (errors.length > 0) {
      console.log(`  Erreurs détectées:`);
      errors.forEach(error => {
        console.log(`    ${error.target} → ${error.response} (${error.errorType})`);
      });
    }
    console.log('');
  });
}