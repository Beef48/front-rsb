import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { FileUploadStatus } from '../types';
import apiService from '../services/api';
import { parseFileData } from '../utils/dataProcessor';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  uploadStatuses: FileUploadStatus[];
  onRemoveFile: (index: number) => void;
  onShowSuccess?: (title: string, message?: string) => void;
  onShowError?: (title: string, message?: string) => void;
}

export function FileUpload({ onFilesSelected, uploadStatuses, onRemoveFile, onShowSuccess, onShowError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Ajouté pour suivre les fichiers sélectionnés

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx')
    );
    if (files.length > 0) {
      setSelectedFiles(files); // On stocke les fichiers localement
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files); // On stocke les fichiers localement
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    setImportStatus('loading');
    setImportMessage(null);
    try {
      const allPersons = [];
      for (const file of selectedFiles) {
        let content;
        if (file.name.toLowerCase().endsWith('.xlsx')) {
          content = await file.arrayBuffer(); // Utilise arrayBuffer pour Excel
        } else {
          content = await file.text(); // text pour CSV
        }
        const parsed = await parseFileData(content, file.name);
        // Extraction du nom du participant depuis le nom du fichier
        const participantName = file.name.replace(/\.xlsx?$/, '').split('_').pop();
        // On construit un objet { person_name, raw_data }
        const parsedWithName = parsed.map(obj => ({
          person_name: participantName,
          raw_data: obj
        }));
        allPersons.push(...parsedWithName);
      }
      if (allPersons.length === 0) {
        setImportStatus('error');
        setImportMessage('Aucun participant détecté dans le(s) fichier(s). Vérifiez le format ou le contenu.');
        
        // Afficher notification d'erreur
        if (onShowError) {
          onShowError(
            'Aucun participant détecté',
            'Vérifiez le format ou le contenu des fichiers uploadés'
          );
        }
        return;
      }
      const res = await apiService.importPersons(allPersons);
      setImportStatus('success');
      setImportMessage(res.message || `${res.count} participant(s) importé(s) avec succès !`);
      setSelectedFiles([]);
      
      // Afficher notification de succès
      if (onShowSuccess) {
        onShowSuccess(
          'Utilisateurs ajoutés avec succès !',
          res.message || `${res.count} participant(s) importé(s) dans la base de données`
        );
      }
    } catch (e: any) {
      setImportStatus('error');
      setImportMessage(e.message || 'Erreur lors de l\'import');
      
      // Afficher notification d'erreur
      if (onShowError) {
        onShowError(
          'Erreur lors de l\'import',
          e.message || 'Une erreur est survenue lors de l\'ajout des utilisateurs'
        );
      }
    }
  };

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-primary-500 bg-primary-50 scale-105'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".csv,.xlsx"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? 'bg-primary-500' : 'bg-gray-100'
          }`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-600'}`} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Glissez vos fichiers ici
            </h3>
            <p className="text-gray-600">
              Ou cliquez pour sélectionner des fichiers CSV ou Excel
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Formats supportés: .csv, .xlsx
            </p>
          </div>
        </div>
      </div>

      {uploadStatuses.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Fichiers sélectionnés ({uploadStatuses.length})</h4>
          <div className="space-y-2">
            {uploadStatuses.map((status, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {status.file.name}
                    </p>
                    {status.error && (
                      <p className="text-xs text-red-600">{status.error}</p>
                    )}
                    {status.status === 'processing' && (
                      <p className="text-xs text-primary-600">Traitement en cours...</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { onRemoveFile(index); setSelectedFiles(prev => prev.filter((_, i) => i !== index)); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {/* Bouton Importer */}
          <button
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || importStatus === 'loading'}
            className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-colors shadow-sm ${
              selectedFiles.length === 0 || importStatus === 'loading'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {importStatus === 'loading' ? 'Importation en cours...' : 'Importer dans la base'}
          </button>
          {/* Message de retour */}
          {importStatus === 'success' && importMessage && (
            <div className="mt-2 text-green-600 font-medium">{importMessage}</div>
          )}
          {importStatus === 'error' && importMessage && (
            <div className="mt-2 text-red-600 font-medium">{importMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}