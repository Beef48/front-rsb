import { 
  normalizeWordForPhoneticAnalysis, 
  transcribeToPhonemes, 
  calculatePhoneticDistance,
  testNormalization 
} from './phoneticTranscription';

// Test complet de la normalisation phonétique
export function runPhoneticNormalizationTests() {
  console.log('🧪 === Test de normalisation phonétique ===');
  
  // Test 1: Suppression des articles
  console.log('\n📝 Test 1: Suppression des articles');
  const articleTests = [
    { input: 'le chat', target: 'chat' },
    { input: 'la maison', target: 'maison' }, 
    { input: 'les enfants', target: 'enfants' },
    { input: 'un livre', target: 'livre' },
    { input: 'une table', target: 'table' },
    { input: 'du pain', target: 'pain' },
    { input: 'des fleurs', target: 'fleurs' }
  ];
  
  articleTests.forEach(test => {
    const result = normalizeWordForPhoneticAnalysis(test.input);
    const targetResult = normalizeWordForPhoneticAnalysis(test.target);
    const match = result === targetResult;
    console.log(`${match ? '✅' : '❌'} "${test.input}" → "${result}" (vs "${test.target}" → "${targetResult}")`);
  });
  
  // Test 2: Normalisation des accents
  console.log('\n📝 Test 2: Normalisation des accents');
  const accentTests = [
    { input: 'café', target: 'cafe' },
    { input: 'père', target: 'pere' },
    { input: 'mère', target: 'mere' },
    { input: 'être', target: 'etre' },
    { input: 'été', target: 'ete' },
    { input: 'élève', target: 'eleve' },
    { input: 'hôtel', target: 'hotel' },
    { input: 'fête', target: 'fete' }
  ];
  
  accentTests.forEach(test => {
    const result = normalizeWordForPhoneticAnalysis(test.input);
    const targetResult = normalizeWordForPhoneticAnalysis(test.target);
    const match = result === targetResult;
    console.log(`${match ? '✅' : '❌'} "${test.input}" → "${result}" (vs "${test.target}" → "${targetResult}")`);
  });
  
  // Test 3: Combinaison articles + accents
  console.log('\n📝 Test 3: Articles + accents combinés');
  const combinedTests = [
    { input: 'le café', target: 'cafe' },
    { input: 'la mère', target: 'mere' },
    { input: 'un été', target: 'ete' },
    { input: 'une fête', target: 'fete' },
    { input: 'du père', target: 'pere' }
  ];
  
  combinedTests.forEach(test => {
    const result = normalizeWordForPhoneticAnalysis(test.input);
    const targetResult = normalizeWordForPhoneticAnalysis(test.target);
    const match = result === targetResult;
    console.log(`${match ? '✅' : '❌'} "${test.input}" → "${result}" (vs "${test.target}" → "${targetResult}")`);
  });
  
  // Test 4: Distance phonétique avec normalisation
  console.log('\n📝 Test 4: Distance phonétique avec normalisation');
  const distanceTests = [
    { word1: 'le chat', word2: 'chat' },
    { word1: 'café', word2: 'cafe' },
    { word1: 'la mère', word2: 'mere' },
    { word1: 'un père', word2: 'pere' }
  ];
  
  distanceTests.forEach(test => {
    const distance = calculatePhoneticDistance(test.word1, test.word2);
    const phonemes1 = transcribeToPhonemes(test.word1);
    const phonemes2 = transcribeToPhonemes(test.word2);
    console.log(`${distance === 0 ? '✅' : '⚠️'} "${test.word1}" vs "${test.word2}": distance = ${distance}`);
    console.log(`   → [${phonemes1.join(', ')}] vs [${phonemes2.join(', ')}]`);
  });
  
  console.log('\n🎯 Test de normalisation terminé !');
}

// Fonction pour tester depuis la console du navigateur
export function testInBrowser() {
  console.log('Pour tester la normalisation, exécutez:');
  console.log('import { runPhoneticNormalizationTests } from "./src/utils/testPhoneticNormalization";');
  console.log('runPhoneticNormalizationTests();');
}