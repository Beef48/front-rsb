// Explications détaillées des métriques et concepts phonétiques

export const PHONETIC_EXPLANATIONS = {
  // Métriques principales
  phoneticAccuracy: {
    title: "Précision phonétique",
    explanation: "Pourcentage de phonèmes (sons) correctement perçus et reproduits par rapport au mot cible. Une précision de 80% signifie que 8 phonèmes sur 10 sont corrects. Cette métrique est plus fine que la précision globale car elle analyse chaque son individuellement."
  },

  phoneticErrors: {
    title: "Erreurs phonétiques",
    explanation: "Nombre total de phonèmes incorrectement perçus. Inclut les substitutions (un son remplacé par un autre), les insertions (son ajouté) et les suppressions (son manqué). Cette métrique révèle la charge cognitive de traitement auditif."
  },

  phoneticDistance: {
    title: "Distance phonétique moyenne",
    explanation: "Mesure mathématique de la différence entre les mots cibles et les réponses, basée sur l'algorithme de Levenshtein appliqué aux phonèmes. Plus cette valeur est faible, plus les réponses sont phonétiquement proches des cibles."
  },

  confusionTypes: {
    title: "Types de confusions",
    explanation: "Nombre de paires de phonèmes différentes qui sont confondues. Par exemple, si 'p' est souvent confondu avec 'b', c'est un type de confusion. Cette métrique indique la variété des erreurs auditives."
  },

  // Types d'erreurs
  substitution: {
    title: "Substitution phonétique",
    explanation: "Un phonème est remplacé par un autre (ex: 'p' → 'b' dans 'pain' → 'bain'). C'est l'erreur la plus fréquente en audiologie, révélant souvent des difficultés de discrimination auditive entre sons similaires."
  },

  insertion: {
    title: "Insertion phonétique",
    explanation: "Un phonème supplémentaire est ajouté au mot (ex: 'chat' → 'chats'). Peut indiquer une sur-interprétation du signal auditif ou une stratégie compensatoire face à l'incertitude."
  },

  deletion: {
    title: "Suppression phonétique",
    explanation: "Un phonème attendu n'est pas perçu (ex: 'train' → 'rain'). Souvent causé par un masquage auditif ou une fatigue cognitive. Fréquent en début ou fin de mot dans le bruit."
  },

  // Catégories phonétiques
  vowels: {
    title: "Voyelles",
    explanation: "Sons produits sans obstruction du flux d'air (a, e, i, o, u, etc.). Les voyelles portent l'énergie principale de la parole et sont généralement mieux préservées dans le bruit que les consonnes."
  },

  consonants: {
    title: "Consonnes",
    explanation: "Sons produits avec une obstruction du flux d'air. Plus vulnérables au bruit que les voyelles car elles contiennent moins d'énergie acoustique. Essentielles pour l'intelligibilité."
  },

  nasals: {
    title: "Consonnes nasales",
    explanation: "Sons produits avec le passage de l'air par le nez (m, n, gn). Ont une signature acoustique particulière qui les rend relativement résistantes au bruit, mais peuvent être confondues entre elles."
  },

  occlusives: {
    title: "Consonnes occlusives",
    explanation: "Sons produits par blocage complet puis relâchement du flux d'air (p, b, t, d, k, g). La distinction sourde/sonore (p/b, t/d, k/g) est particulièrement sensible au bruit."
  },

  fricatives: {
    title: "Consonnes fricatives",
    explanation: "Sons produits par passage forcé de l'air dans un rétrécissement (f, v, s, z, ch, j). Riches en hautes fréquences, elles sont très sensibles au bruit et souvent les premières affectées."
  },

  // Positions dans le mot
  wordBeginning: {
    title: "Début de mot",
    explanation: "Premiers phonèmes du mot. Bénéficient d'un effet d'amorçage contextuel et sont souvent mieux préservés. Leur bonne perception facilite la reconnaissance du mot entier."
  },

  wordMiddle: {
    title: "Milieu de mot",
    explanation: "Phonèmes centraux du mot. Bénéficient du contexte des phonèmes adjacents mais peuvent être masqués par la coarticulation. Position intermédiaire en termes de vulnérabilité."
  },

  wordEnd: {
    title: "Fin de mot",
    explanation: "Derniers phonèmes du mot. Particulièrement vulnérables car ils n'ont pas de contexte suivant pour aider à leur identification. Souvent tronqués dans le bruit."
  },

  // Analyses spécialisées
  confusionMatrix: {
    title: "Matrice de confusion",
    explanation: "Tableau montrant quels phonèmes sont confondus avec quels autres. Révèle les patterns systématiques d'erreurs. Par exemple, 'p' souvent confondu avec 'b' indique une difficulté à percevoir la sonorité."
  },

  rsbEvolution: {
    title: "Évolution par RSB",
    explanation: "Comment les erreurs phonétiques changent selon le niveau de bruit. Permet d'identifier les seuils critiques où certains types de confusions apparaissent ou s'intensifient."
  },

  phoneticProfile: {
    title: "Profil phonétique",
    explanation: "Signature unique des forces et faiblesses auditives d'une personne basée sur ses patterns d'erreurs phonétiques. Utile pour personnaliser les stratégies de réhabilitation auditive."
  },

  // Comparaisons
  phoneticComparison: {
    title: "Comparaison phonétique",
    explanation: "Analyse comparative des profils phonétiques entre deux personnes. Révèle les différences dans les stratégies de traitement auditif et peut identifier des patterns liés à l'âge, la pathologie ou l'expérience."
  },

  categoryDifferences: {
    title: "Différences par catégorie",
    explanation: "Comparaison du nombre d'erreurs par type phonétique entre deux personnes. Permet d'identifier si une personne a des difficultés spécifiques avec certaines catégories de sons."
  }
};

// Fonction helper pour obtenir une explication
export function getPhoneticExplanation(key: string): { title: string; explanation: string } {
  return PHONETIC_EXPLANATIONS[key as keyof typeof PHONETIC_EXPLANATIONS] || {
    title: "Information non disponible",
    explanation: "Aucune explication disponible pour cette métrique."
  };
}