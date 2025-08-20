import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, CheckCircle, AlertCircle, Loader, Pencil, Trash2,
  Grid, List, Filter, ChevronDown, ChevronUp, MoreHorizontal,
  CheckSquare, Square, Eye, Calendar, User, Database, X, Volume2
} from 'lucide-react';
import { Person, WordStats, ErrorStats } from '../services/api';
import apiService from '../services/api';
import AgeFilter from './AgeFilter';
import PathologyFilter, { NONE_SENTINEL } from './PathologyFilter';
import EditPersonModal from './EditPersonModal';
import { PhoneticDetailAnalysis } from './PhoneticDetailAnalysis';


interface PersonSelectorImprovedProps {
  onPersonsSelected: (persons: Person[]) => void;
  selectedPersons: Person[];
  onRemovePerson: (index: number) => void;
  onShowSuccess?: (title: string, message?: string) => void;
  onShowError?: (title: string, message?: string) => void;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortField = 'name' | 'age' | 'date' | 'pathology';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 24;

export function PersonSelectorImproved({ 
  onPersonsSelected, 
  selectedPersons, 
  onRemovePerson, 
  onShowSuccess, 
  onShowError 
}: PersonSelectorImprovedProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [ageFilter, setAgeFilter] = useState<{ min: number; max: number } | null>(null);
  const [selectedPathologies, setSelectedPathologies] = useState<string[]>([]);
  
  // États pour l'interface
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // États pour la sélection en masse
  const [selectMode, setSelectMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // États pour l'édition et la suppression
  const [editing, setEditing] = useState<Person | null>(null);
  const [deletingPersonId, setDeletingPersonId] = useState<number | string | null>(null);
  
  // États pour l'analyse phonétique détaillée
  const [phoneticAnalysisData, setPhoneticAnalysisData] = useState<{person: Person, rsbData: any} | null>(null);
  const [loadingPhoneticAnalysis, setLoadingPhoneticAnalysis] = useState<string | number | null>(null);

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

  // Logique de filtrage et tri
  const filteredAndSortedPersons = useMemo(() => {
    let filtered = persons.filter(person => {
      // Filtrage par recherche (nom)
      const matchesSearch = person.person_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrage par âge
      const matchesAge = !ageFilter || !person.age || 
        (person.age >= ageFilter.min && person.age <= ageFilter.max);
      
      // Filtrage par pathologie
      const matchesPathology = (() => {
        if (selectedPathologies.length === 0) return true;
        const patho = (person as any).pathology ?? (person as any).pathologie ?? '';
        const hasNone = selectedPathologies.includes(NONE_SENTINEL);
        const matchSome = selectedPathologies.some(p => p !== NONE_SENTINEL && p === patho);
        if (patho === '' || patho === null) {
          return hasNone;
        }
        return matchSome;
      })();
      
      return matchesSearch && matchesAge && matchesPathology;
    });

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.person_name.localeCompare(b.person_name);
          break;
        case 'age':
          comparison = (a.age || 0) - (b.age || 0);
          break;
        case 'date':
          comparison = (a.test_date || '').localeCompare(b.test_date || '');
          break;
        case 'pathology':
          const pathoA = (a as any).pathology ?? (a as any).pathologie ?? '';
          const pathoB = (b as any).pathology ?? (b as any).pathologie ?? '';
          comparison = pathoA.localeCompare(pathoB);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [persons, searchTerm, ageFilter, selectedPathologies, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPersons.length / ITEMS_PER_PAGE);
  const paginatedPersons = filteredAndSortedPersons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Données pour les filtres
  const availableAges = persons.map(p => p.age).filter(Boolean) as number[];
  const availablePathologies = persons
    .map(p => (p as any).pathology ?? (p as any).pathologie ?? '')
    .filter(Boolean);

  // Handlers
  const handlePersonSelect = (person: Person, index?: number, shiftKey?: boolean) => {
    const isAlreadySelected = selectedPersons.some(p => p.id === person.id);
    
    if (selectMode && shiftKey && lastSelectedIndex !== null && index !== undefined) {
      // Sélection en bloc avec Shift
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangePersons = paginatedPersons.slice(start, end + 1);
      
      const newSelection = [...selectedPersons];
      rangePersons.forEach(p => {
        if (!newSelection.some(sp => sp.id === p.id)) {
          newSelection.push(p);
        }
      });
      onPersonsSelected(newSelection);
    } else {
      // Sélection normale
      if (isAlreadySelected) {
        const updatedPersons = selectedPersons.filter(p => p.id !== person.id);
        onPersonsSelected(updatedPersons);
      } else {
        onPersonsSelected([...selectedPersons, person]);
      }
    }
    
    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    onPersonsSelected([...selectedPersons, ...paginatedPersons.filter(p => 
      !selectedPersons.some(sp => sp.id === p.id)
    )]);
  };

  const handleDeselectAll = () => {
    const idsToDeselect = new Set(paginatedPersons.map(p => p.id));
    const updatedSelection = selectedPersons.filter(p => !idsToDeselect.has(p.id));
    onPersonsSelected(updatedSelection);
  };

  const handleClearAll = () => {
    onPersonsSelected([]);
  };

  const handleDeletePerson = async (person: Person) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${person.person_name}" de la base de données ?\n\nCette action est irréversible.`)) {
      return;
    }

    setDeletingPersonId(person.id);
    try {
      await apiService.deletePerson(person.id);
      
      setPersons(prev => prev.filter(p => p.id !== person.id));
      
      const updatedSelection = selectedPersons.filter(p => p.id !== person.id);
      if (updatedSelection.length !== selectedPersons.length) {
        onPersonsSelected(updatedSelection);
      }
      
      if (onShowSuccess) {
        onShowSuccess(
          'Utilisateur supprimé',
          `${person.person_name} a été supprimé de la base de données`
        );
      }
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      
      if (onShowError) {
        onShowError(
          'Erreur lors de la suppression',
          error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression'
        );
      }
    } finally {
      setDeletingPersonId(null);
    }
  };

  // Fonction pour charger l'analyse phonétique détaillée
  const handlePhoneticAnalysis = async (person: Person) => {
    setLoadingPhoneticAnalysis(person.id);
    try {
      const result = await apiService.analyzePersonsByName([person.person_name]);
      if (result.files.length > 0) {
        setPhoneticAnalysisData({
          person,
          rsbData: result.files[0]
        });
      } else {
        if (onShowError) {
          onShowError(
            'Aucune donnée trouvée',
            `Aucune donnée d'analyse n'a été trouvée pour ${person.person_name}`
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'analyse phonétique:', error);
      if (onShowError) {
        onShowError(
          'Erreur de chargement',
          error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement de l\'analyse'
        );
      }
    } finally {
      setLoadingPhoneticAnalysis(null);
    }
  };

  // Composants de rendu
  const renderPersonCard = (person: Person, index: number) => {
    const isSelected = selectedPersons.some(p => p.id === person.id);
    const pathology = (person as any).pathology ?? (person as any).pathologie ?? 'Non spécifiée';
    
    if (viewMode === 'compact') {
      return (
        <div
          key={person.id}
          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
            isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
          }`}
          onClick={(e) => handlePersonSelect(person, index, e.shiftKey)}
        >
          <div className="flex-1 flex items-center space-x-3 min-w-0">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isSelected ? 'bg-primary-500' : 'bg-gray-300'}`} />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 truncate block">{person.person_name}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 flex-shrink-0">
              {person.age && <span>{person.age} ans</span>}
              {person.test_date && <span>{new Date(person.test_date).toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <div className="relative group">
              <button
                onClick={(e) => { e.stopPropagation(); handlePhoneticAnalysis(person); }}
                className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all shadow-sm"
                title="Analyse phonétique détaillée"
                disabled={loadingPhoneticAnalysis === person.id}
              >
                {loadingPhoneticAnalysis === person.id ? (
                  <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600" />
                )}
              </button>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                Analyse phonétique
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(person); }}
              className="p-1 rounded hover:bg-blue-100"
              title="Modifier"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeletePerson(person); }}
              className="p-1 rounded hover:bg-red-100"
              title="Supprimer"
              disabled={deletingPersonId === person.id}
            >
              {deletingPersonId === person.id ? (
                <Loader className="w-4 h-4 text-red-600 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-600" />
              )}
            </button>
          </div>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div
          key={person.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all ${
            isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
          onClick={(e) => handlePersonSelect(person, index, e.shiftKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className={`w-4 h-4 rounded ${isSelected ? 'bg-primary-500' : 'bg-gray-300'}`} />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{person.person_name}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  {person.age && (
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{person.age} ans</span>
                    </div>
                  )}
                  {person.test_date && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(person.test_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Database className="w-4 h-4" />
                    <span>{pathology}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative group">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePhoneticAnalysis(person); }}
                  className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all shadow-sm"
                  title="Analyse phonétique détaillée"
                  disabled={loadingPhoneticAnalysis === person.id}
                >
                  {loadingPhoneticAnalysis === person.id ? (
                    <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-purple-600" />
                  )}
                </button>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  Analyse phonétique
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(person); }}
                className="p-2 rounded hover:bg-blue-100"
                title="Modifier"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePerson(person); }}
                className="p-2 rounded hover:bg-red-100"
                disabled={deletingPersonId === person.id}
                title="Supprimer définitivement"
              >
                {deletingPersonId === person.id ? (
                  <Loader className="w-4 h-4 text-red-600 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Mode grid (par défaut)
    return (
      <div
        key={person.id}
        className={`p-4 border rounded-lg cursor-pointer transition-all ${
          isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
        }`}
        onClick={(e) => handlePersonSelect(person, index, e.shiftKey)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`w-4 h-4 rounded ${isSelected ? 'bg-primary-500' : 'bg-gray-300'}`} />
          <div className="flex items-center space-x-1">
            <div className="relative group">
              <button
                onClick={(e) => { e.stopPropagation(); handlePhoneticAnalysis(person); }}
                className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all shadow-sm"
                title="Analyse phonétique détaillée"
                disabled={loadingPhoneticAnalysis === person.id}
              >
                {loadingPhoneticAnalysis === person.id ? (
                  <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600" />
                )}
              </button>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                Analyse phonétique
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(person); }}
              className="p-1 rounded hover:bg-blue-100"
              title="Modifier"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeletePerson(person); }}
              className="p-1 rounded hover:bg-red-100"
              title="Supprimer"
              disabled={deletingPersonId === person.id}
            >
              {deletingPersonId === person.id ? (
                <Loader className="w-4 h-4 text-red-600 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-600" />
              )}
            </button>
          </div>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-2 truncate">{person.person_name}</h4>
        <div className="space-y-1 text-sm text-gray-500">
          {person.age && (
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{person.age} ans</span>
            </div>
          )}
          {person.test_date && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(person.test_date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Database className="w-4 h-4" />
            <span className="truncate">{pathology}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques et boutons de vue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-gray-900">
              {filteredAndSortedPersons.length} participant{filteredAndSortedPersons.length > 1 ? 's' : ''}
            </span>
            {selectedPersons.length > 0 && (
              <span className="text-sm text-primary-600">
                ({selectedPersons.length} sélectionné{selectedPersons.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          <div className="flex flex-col space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-sm text-blue-700">
                💡 Utilisez les filtres avancés pour affiner votre recherche par âge, pathologie ou nom
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <p className="text-sm text-purple-700 flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>Cliquez sur l'icône violette pour une analyse phonétique détaillée !</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Boutons de mode de vue */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Vue grille"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 rounded transition-colors ${viewMode === 'compact' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Vue compacte"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          {/* Bouton de filtres amélioré */}
          <div className="relative group">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 shadow-sm ${
                showFilters 
                  ? 'bg-primary-500 border-primary-500 text-white shadow-md transform scale-105' 
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:shadow-md hover:scale-105'
              }`}
            >
              <Filter className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-12' : ''}`} />
              <span className="font-medium">Filtres avancés</span>
              <div className="flex items-center space-x-1">
                {/* Badge compteur si filtres actifs */}
                {(searchTerm || ageFilter || selectedPathologies.length > 0) && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                )}
                {showFilters ? (
                  <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                )}
              </div>
            </button>
            
            {/* Indicateur visuel animé */}
            {!showFilters && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-ping opacity-75"></div>
            )}
            
            {/* Tooltip informatif */}
            {!showFilters && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                🔍 Cliquez pour afficher les options de filtrage
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-200 rounded-xl p-6 space-y-6 shadow-lg animate-in slide-in-from-top-2 duration-300">
          {/* En-tête des filtres */}
          <div className="flex items-center justify-between pb-4 border-b border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filtres de recherche</h3>
                <p className="text-sm text-gray-600">Affinez votre sélection de participants</p>
              </div>
            </div>
            {/* Indicateur de filtres actifs */}
            {(searchTerm || ageFilter || selectedPathologies.length > 0) && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-orange-100 rounded-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-orange-700">Filtres actifs</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recherche */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Recherche par nom</span>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tapez un nom de participant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              {searchTerm && (
                <p className="text-xs text-blue-600">
                  🔍 {filteredAndSortedPersons.length} résultat{filteredAndSortedPersons.length > 1 ? 's' : ''} trouvé{filteredAndSortedPersons.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Filtre par âge */}
            <AgeFilter
              onAgeRangeChange={(min, max) => setAgeFilter({ min, max })}
              availableAges={availableAges}
            />

            {/* Filtre par pathologie */}
            <PathologyFilter
              availablePathologies={availablePathologies}
              selectedPathologies={selectedPathologies}
              onChange={setSelectedPathologies}
            />
          </div>

          {/* Boutons d'action pour les filtres */}
          {(searchTerm || ageFilter || selectedPathologies.length > 0) && (
            <div className="flex items-center justify-between pt-4 border-t border-blue-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>
                  {[
                    searchTerm && 'recherche',
                    ageFilter && 'âge',
                    selectedPathologies.length > 0 && 'pathologie'
                  ].filter(Boolean).join(', ')} actif{[searchTerm, ageFilter, selectedPathologies.length > 0].filter(Boolean).length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setAgeFilter(null);
                  setSelectedPathologies([]);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200 shadow-sm"
              >
                <X className="w-4 h-4" />
                <span className="font-medium">Réinitialiser les filtres</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-3">
          {/* Tri */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Trier par:</span>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
                setCurrentPage(1);
              }}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="name-asc">Nom (A-Z)</option>
              <option value="name-desc">Nom (Z-A)</option>
              <option value="age-asc">Âge (croissant)</option>
              <option value="age-desc">Âge (décroissant)</option>
              <option value="date-desc">Date (récent)</option>
              <option value="date-asc">Date (ancien)</option>
              <option value="pathology-asc">Pathologie (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sélection en masse */}
          <button
            onClick={() => setSelectMode(!selectMode)}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
              selectMode ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Mode sélection multiple"
          >
            {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>Mode sélection</span>
          </button>

          {selectMode && (
            <>
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded text-sm hover:bg-primary-200 transition-colors"
                title="Sélectionner tous les participants de cette page"
              >
                Tout sélectionner
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                title="Désélectionner tous les participants de cette page"
              >
                Tout désélectionner
              </button>
            </>
          )}

          {selectedPersons.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
              title="Effacer complètement la sélection"
            >
              Effacer la sélection
            </button>
          )}
        </div>
      </div>

      {/* Liste des personnes */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Chargement des participants...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="ml-2 text-red-700">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={`
            ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
              viewMode === 'list' ? 'space-y-3' : 
              'space-y-2'}
          `}>
            {paginatedPersons.map((person, index) => renderPersonCard(person, index))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} sur {totalPages} 
                ({filteredAndSortedPersons.length} résultat{filteredAndSortedPersons.length > 1 ? 's' : ''})
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : 
                                currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                currentPage - 2 + i;
                    
                    if (page < 1 || page > totalPages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded-lg ${
                          page === currentPage 
                            ? 'bg-primary-500 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal d'édition */}
      {editing && (
        <EditPersonModal
          person={editing}
          open={true}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPersons(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
            if (selectedPersons.some(p => p.id === updated.id)) {
              onPersonsSelected(selectedPersons.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
            }
            setEditing(null);
          }}
        />
      )}

      {/* Message si aucun résultat */}
      {!loading && !error && filteredAndSortedPersons.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun participant trouvé</h3>
          <p className="text-gray-500">
            {searchTerm || ageFilter || selectedPathologies.length > 0
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Aucun participant n\'est disponible dans la base de données.'
            }
          </p>
        </div>
      )}

      {/* Modal d'analyse phonétique détaillée */}
      {phoneticAnalysisData && (
        <PhoneticDetailAnalysis
          rsbData={phoneticAnalysisData.rsbData}
          personName={phoneticAnalysisData.person.person_name}
          onClose={() => setPhoneticAnalysisData(null)}
        />
      )}

      {/* Modal d'édition */}
      {editing && (
        <EditPersonModal
          person={editing}
          open={true}
          onClose={() => setEditing(null)}
          onSaved={(updatedPerson) => {
            setPersons(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
            setEditing(null);
            if (onShowSuccess) {
              onShowSuccess('Utilisateur modifié', `${updatedPerson.person_name} a été mis à jour`);
            }
          }}
        />
      )}
    </div>
  );
}