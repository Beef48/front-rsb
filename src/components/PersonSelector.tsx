import React, { useState, useEffect } from 'react';
import { Users, Search, CheckCircle, AlertCircle, Loader, Pencil } from 'lucide-react';
import { Person, WordStats, ErrorStats } from '../services/api';
import apiService from '../services/api';
import AgeFilter from './AgeFilter';
import PathologyFilter, { NONE_SENTINEL } from './PathologyFilter';
import EditPersonModal from './EditPersonModal';

interface PersonSelectorProps {
  onPersonsSelected: (persons: Person[]) => void;
  selectedPersons: Person[];
  onRemovePerson: (index: number) => void;
}

export function PersonSelector({ onPersonsSelected, selectedPersons, onRemovePerson }: PersonSelectorProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [wordStats, setWordStats] = useState<WordStats[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [ageFilter, setAgeFilter] = useState<{ min: number; max: number } | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [selectedPathologies, setSelectedPathologies] = useState<string[]>([]);

  // Charger les personnes au montage du composant
  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPersons();
      setPersons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des personnes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [words, errors] = await Promise.all([
        apiService.getWordStats(),
        apiService.getErrorStats()
      ]);
      setWordStats(words);
      setErrorStats(errors);
      setShowStats(true);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  // Extraire les âges disponibles
  const availableAges = persons
    .map(person => person.age)
    .filter((age): age is number => age !== undefined && age !== null);

  const availablePathologies = persons
    .map(p => (p as any).pathology ?? (p as any).pathologie ?? '')
    .filter(Boolean);

  const filteredPersons = persons
    .filter(person =>
      person.person_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(person => {
      if (!ageFilter || !person.age) return true;
      return person.age >= ageFilter.min && person.age <= ageFilter.max;
    })
    .filter(person => {
      if (selectedPathologies.length === 0) return true;
      const patho = (person as any).pathology ?? (person as any).pathologie ?? '';
      const hasNone = selectedPathologies.includes(NONE_SENTINEL);
      const matchSome = selectedPathologies.some(p => p !== NONE_SENTINEL && p === patho);
      if (patho === '' || patho === null) {
        return hasNone; // inclure si "Sans pathologie" coché
      }
      return matchSome;
    })
    .sort((a, b) => a.person_name.localeCompare(b.person_name));

  const handleAgeRangeChange = (minAge: number, maxAge: number) => {
    setAgeFilter({ min: minAge, max: maxAge });
  };

  const handlePersonSelect = (person: Person) => {
    const isAlreadySelected = selectedPersons.some(p => p.id === person.id);
    if (isAlreadySelected) {
      // Désélectionner la personne
      const updatedPersons = selectedPersons.filter(p => p.id !== person.id);
      onPersonsSelected(updatedPersons);
    } else {
      // Sélectionner la personne
      onPersonsSelected([...selectedPersons, person]);
    }
  };

  const handleUpdatedPerson = (updated: Person) => {
    setPersons(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
    // mettre à jour la sélection si nécessaire
    if (selectedPersons.some(p => p.id === updated.id)) {
      onPersonsSelected(selectedPersons.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
    }
  };

  const handleSelectAll = () => {
    const newPersons = persons.filter(person => 
      !selectedPersons.some(p => p.id === person.id)
    );
    onPersonsSelected([...selectedPersons, ...newPersons]);
  };

  const handleClearAll = () => {
    onPersonsSelected([]);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sélection des participants
            </h3>
            <p className="text-sm text-gray-600">
              {persons.length} personne(s) disponible(s) dans la base de données
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Voir les statistiques
          </button>
          
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Tout sélectionner
          </button>
          
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Tout effacer
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barre de recherche */}
        <div className="relative self-start">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une personne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Filtre par âge */}
        <AgeFilter
          onAgeRangeChange={handleAgeRangeChange}
          availableAges={availableAges}
        />
        {/* Filtre par pathologie */}
        <PathologyFilter
          availablePathologies={availablePathologies}
          selectedPathologies={selectedPathologies}
          onChange={setSelectedPathologies}
        />
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Chargement des données...</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="ml-2 text-red-700">{error}</span>
        </div>
      )}

      {/* Statistiques */}
      {showStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">Statistiques de l'analyse (avec données globales)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-blue-800 mb-2">Mots les plus réussis</h5>
              <div className="space-y-1">
                {wordStats.slice(0, 5).map((stat, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{stat.word}</span>
                    <span className="font-medium">{stat.rate}% ({stat.success}/{stat.total})</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 mb-2">Mots les plus difficiles</h5>
              <div className="space-y-1">
                {errorStats.slice(0, 5).map((stat, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{stat.word}</span>
                    <span className="font-medium text-red-600">{stat.errors} erreurs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des personnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPersons.map((person) => {
          const isSelected = selectedPersons.some(p => p.id === person.id);
          return (
            <div
              key={person.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onClick={() => handlePersonSelect(person)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{person.person_name}</h4>
                  <div className="space-y-1">
                    {person.age && (
                      <p className="text-sm text-gray-600">
                        Âge: {person.age} ans
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Pathologie: <span className="font-medium text-gray-800">{(person as any).pathology ?? (person as any).pathologie ?? '—'}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={`${(person as any).comment ?? (person as any).commentaire ?? ''}`}>
                      Commentaire: {(person as any).comment ?? (person as any).commentaire ?? '—'}
                    </p>
                    {person.start_time && (
                      <p className="text-xs text-gray-500">
                        Test: {new Date(person.start_time).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                    {!person.start_time && person.created_at && (
                      <p className="text-xs text-gray-500">
                        Importé: {new Date(person.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(person); }}
                    className="p-2 rounded hover:bg-gray-100"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </button>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary-600 ml-1" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Personnes sélectionnées */}
      {selectedPersons.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Personnes sélectionnées ({selectedPersons.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedPersons.map((person, index) => (
              <div
                key={person.id}
                className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-gray-300"
                data-selected-person={person.person_name}
              >
                <span className="text-sm font-medium">{person.person_name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePerson(index);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {!loading && !error && filteredPersons.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne disponible'}
          </p>
        </div>
      )}

      {/* Modal d'édition */}
      <EditPersonModal
        person={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={handleUpdatedPerson}
      />
    </div>
  );
} 