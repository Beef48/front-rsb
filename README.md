# 🎯 Analyseur RSB - Reconnaissance Vocale dans le Bruit

<div align="center">

![RSB Logo](https://img.shields.io/badge/RSB-Analyseur-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-4+-646CFF?style=for-the-badge&logo=vite)

**Application professionnelle d'analyse de la reconnaissance vocale dans le bruit pour la recherche audiologique et clinique**

[🚀 Installation](#-installation) •
[📖 Documentation](#-documentation) •
[🧪 Fonctionnalités](#-fonctionnalités) •
[🔧 Configuration](#-configuration)

</div>

---

## 📋 Table des matières

- [🎯 À propos](#-à-propos)
- [🚀 Installation](#-installation)
- [🧪 Fonctionnalités](#-fonctionnalités)
- [📁 Structure du projet](#-structure-du-projet)
- [🔧 Configuration](#-configuration)
- [📊 Utilisation](#-utilisation)
- [📈 Analyses disponibles](#-analyses-disponibles)
- [💾 Export des données](#-export-des-données)
- [🆘 Dépannage](#-dépannage)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

---

## 🎯 À propos

L'**Analyseur RSB** est une application web professionnelle développée en React/TypeScript pour l'analyse quantitative de la reconnaissance vocale dans le bruit (RSB). Elle permet aux chercheurs et cliniciens en audiologie d'analyser les performances auditives avec des outils statistiques avancés et des visualisations scientifiques.

### 🔬 Applications scientifiques

- **Recherche audiologique** : Évaluation des capacités de perception dans le bruit
- **Diagnostic clinique** : Tests objectifs de reconnaissance vocale
- **Évaluation prothétique** : Mesure du bénéfice des appareils auditifs
- **Validation thérapeutique** : Suivi des progrès en réhabilitation auditive
- **Études épidémiologiques** : Analyses populationnelles des troubles auditifs

### 🎯 RSB (Rapport Signal/Bruit)

Le RSB quantifie la différence d'intensité entre un signal vocal et le bruit ambiant :
```
RSB (dB) = 20 × log₁₀(Signal/Bruit)
```

- **RSB > 0 dB** : Signal plus fort que le bruit (conditions favorables)
- **RSB = 0 dB** : Signal et bruit équivalents  
- **RSB < 0 dB** : Bruit plus fort que le signal (conditions difficiles)

---

## 🚀 Installation

### Prérequis

- **Node.js** 16+ et npm
- **Navigateur moderne** (Chrome 90+, Firefox 88+, Safari 14+)
- **Système** : Windows 10+, macOS 10.15+, ou Linux Ubuntu 18.04+

### Installation rapide

```bash
# 1. Cloner ou télécharger le projet
cd chemin/vers/front

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm run dev

# 4. Ouvrir dans le navigateur
# URL affichée (généralement http://localhost:5173)
```

### Configuration backend (optionnel)

Pour utiliser le mode base de données :

```bash
# Dans un terminal séparé
cd chemin/vers/back
node server.js
```

Le serveur backend s'exécute sur le port 3100.

---

## 🧪 Fonctionnalités

### 🎮 Modes d'analyse

| Mode | Description | Usage |
|------|-------------|-------|
| **📊 Base de données** | Connexion Supabase | Analyses de cohortes, recherche longitudinale |
| **📁 Fichiers locaux** | Upload CSV/Excel | Analyses ponctuelles, données tierces |

### 🔍 Analyses avancées

- **📈 Courbes RSB** avec intervalles de confiance à 95%
- **⏱️ Temps de réponse** par niveau de difficulté
- **🔊 Analyse phonétique** détaillée avec matrice de confusion
- **👥 Comparaisons** multi-participants avec tests statistiques
- **📊 Statistiques** descriptives et inférentielles complètes

### 🎛️ Visualisations

- **Graphiques interactifs** (zoom, export, impression)
- **Métriques cliniques** (RSB@50%, pentes, plateaux)
- **Analyses temporelles** (corrélations précision/temps)
- **Profils phonétiques** (erreurs par catégories)

---

## 📁 Structure du projet

```
src/
├── components/           # Composants React
│   ├── PersonSelector.tsx      # Sélection participants
│   ├── FileUpload.tsx          # Upload fichiers
│   ├── ResultsChart.tsx        # Graphiques RSB
│   ├── StatisticsPanel.tsx     # Statistiques
│   ├── PhoneticAnalysis.tsx    # Analyse phonétique
│   ├── PersonComparison.tsx    # Comparaisons
│   └── ExportPanel.tsx         # Export résultats
├── utils/               # Utilitaires
│   ├── dataProcessor.ts        # Traitement données
│   ├── phoneticAnalysis.ts     # Analyse phonétique
│   ├── phoneticTranscription.ts # Transcription API
│   └── exportImage.ts          # Export graphiques
├── services/
│   └── api.ts                  # Services API
├── types/
│   └── index.ts                # Types TypeScript
└── App.tsx                     # Application principale
```

---

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env.local` :

```env
# Backend API (optionnel)
VITE_API_URL=http://localhost:3100

# Supabase (si utilisé)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Format des données

Les fichiers CSV/Excel doivent contenir :

#### Métadonnées
```csv
person_name,age,test_date,rsbStart,rsbEnd,rsbStep,wordCnt
"Participant_001",65,"2024-01-15",6,-14,-2,20
```

#### Données par mot
```csv
wordHist/0/word,wordHist/0/resp,wordHist/0/rsb,wordHist/0/beginningOfSpeechTime,wordHist/0/endOfSpeechTime
"chaise","chaise",6,1250,1890
```

**📄 Exemple complet** : Voir `DataBF4.csv` dans le projet

---

## 📊 Utilisation

### 1. Démarrage de l'analyse

#### Mode Base de données
1. Vérifier la connexion (indicateur vert)
2. Rechercher et sélectionner des participants
3. Cliquer sur "Analyser les participants sélectionnés"

#### Mode Fichiers
1. Glisser-déposer des fichiers CSV/Excel
2. Attendre la validation automatique
3. Visualisation immédiate des résultats

### 2. Navigation de l'interface

- **🎛️ Barre de configuration** : Choix du mode et modules
- **📊 Zone principale** : Graphiques et analyses
- **🔧 Panneaux latéraux** : Statistiques et exports
- **🖨️ Boutons d'impression** : Sur chaque graphique

### 3. Modules optionnels

| Module | Activation | Description |
|--------|------------|-------------|
| **📊 Stats des mots** | Bouton vert | Analyse par mot testé |
| **👥 Comparaison** | Bouton violet | Comparaisons inter-participants |
| **🔊 Phonétique** | Bouton rose | Erreurs phonémiques détaillées |

---

## 📈 Analyses disponibles

### 🎯 Métriques principales

- **RSB@50%** : Seuil de reconnaissance à 50% (norme clinique)
- **Pente** : Vitesse d'amélioration avec le RSB (7-15%/dB normal)
- **Plateau** : Performance maximale atteinte (>95% normal)
- **Variabilité** : Écart-type et intervalles de confiance

### 🔊 Analyse phonétique

- **Transcription automatique** en phonèmes (API français)
- **Matrice de confusion** des erreurs phonétiques
- **Catégorisation** par traits distinctifs (voyelles, consonnes, etc.)
- **Position** dans le mot (début, milieu, fin)
- **Distance phonétique** pondérée

### 👥 Comparaisons statistiques

- **Tests t de Student** pour seuils RSB@50%
- **ANOVA à mesures répétées** sur courbes complètes
- **Intervalles de confiance** des différences
- **Profils différentiels** automatiques

---

## 💾 Export des données

### 📁 Formats disponibles

| Format | Contenu | Usage |
|--------|---------|-------|
| **📊 CSV** | Données brutes + statistiques | Excel, R, SPSS, Python |
| **📋 TXT** | Rapport complet formaté | Documentation clinique |
| **🖼️ PNG/SVG** | Graphiques haute résolution | Publications, présentations |

### 🖨️ Impression

- **🖨️ Impression globale** : Capture de l'interface complète
- **📊 Impression sélective** : Graphique par graphique
- **📄 Format optimisé** : A4/Letter avec métadonnées

### 📋 Rapport automatique

Le rapport généré inclut :
- Informations participants et protocole
- Statistiques par niveau RSB  
- Métriques cliniques principales
- Analyses phonétiques (si activées)
- Recommandations automatiques

---

## 🆘 Dépannage

### 🔴 Problèmes de connexion

**Erreur : "Connexion au serveur échouée"**
```bash
# Vérifier le backend
cd back/
node server.js

# Tester l'URL
curl http://localhost:3100
```

**Solution alternative** : Utiliser uniquement le mode "Fichiers"

### 📁 Erreurs de fichiers

| Erreur | Cause | Solution |
|--------|-------|---------|
| "Format non reconnu" | Extension incorrecte | Utiliser .csv ou .xlsx |
| "Champs manquants" | Structure invalide | Vérifier les colonnes requises |
| "Données insuffisantes" | Trop peu de points | Minimum 3 niveaux RSB |
| "Erreur parsing" | Format numérique | Point décimal, UTF-8 |

### 🖥️ Problèmes d'affichage

- **Graphiques vides** : Vérifier JavaScript activé
- **Interface déformée** : Ajuster zoom navigateur (100%)
- **Performance lente** : Limiter à 5-10 participants simultanés

### 🔧 Outils de diagnostic

```bash
# Console développeur
F12 → Console → Rechercher erreurs

# Mode développement
npm run dev

# Vider le cache
Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
```

---

## 🤝 Contribution

### 🛠️ Développement

```bash
# Installation développement
git clone [repository]
cd front/
npm install
npm run dev

# Linting et tests
npm run lint
npm run type-check
```

### 📝 Standards de code

- **TypeScript strict** activé
- **ESLint** + Prettier pour le formatage
- **Composants fonctionnels** avec hooks
- **Tests unitaires** recommandés

### 🐛 Signalement de bugs

1. **Reproduire** l'erreur de façon minimale
2. **Capturer** les messages d'erreur (console F12)
3. **Joindre** fichiers de test problématiques
4. **Préciser** version navigateur et OS

---

## 📄 Licence

Ce projet est sous licence **MIT**.

### Références scientifiques

- **IEC 60268-16:2020** - Méthodes de mesure audiométrie vocale
- **ANSI S3.2-2019** - Méthodes d'évaluation de la parole  
- **Plomp & Mimpen (1979)** - SRT dans le bruit
- **Nilsson et al. (1994)** - HINT test

---

<div align="center">

**📧 Support** : Consulter la documentation intégrée ou les exemples fournis  
**🔄 Version** : 1.0.0  
**📅 Dernière mise à jour** : Décembre 2024

---

*Développé pour la recherche audiologique et l'analyse clinique professionnelle*

</div>