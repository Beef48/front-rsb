import React from 'react';
import { Download, FileText, Image } from 'lucide-react';
import { AnalysisResult } from '../types';
import { exportToCSV } from '../utils/dataProcessor';

interface ExportPanelProps {
  result: AnalysisResult;
}

export function ExportPanel({ result }: ExportPanelProps) {
  const handleCSVExport = () => {
    const csvContent = exportToCSV(result);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'analyse_rsb.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageExport = () => {
    // Cette fonction exporterait le graphique en PNG
    // Pour l'instant, nous affichons juste une alerte
    alert('Export d\'image sera implémenté dans une version future');
  };

  const handleReportExport = () => {
    // Générer un rapport complet
    const reportContent = generateReport(result);
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rapport_analyse_rsb.txt');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Export des résultats</h3>
      
      <div className="space-y-3">
        <button
          onClick={handleCSVExport}
          className="w-full flex items-center space-x-3 p-4 text-left bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
        >
          <div className="p-2 bg-primary-500 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Exporter en CSV</h4>
            <p className="text-sm text-gray-600">Données statistiques pour Excel ou autres outils</p>
          </div>
          <Download className="w-5 h-5 text-primary-600 ml-auto" />
        </button>

        <button
          onClick={handleImageExport}
          className="w-full flex items-center space-x-3 p-4 text-left bg-success-50 hover:bg-success-100 border border-success-200 rounded-lg transition-colors"
        >
          <div className="p-2 bg-success-500 rounded-lg">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Exporter graphique (PNG)</h4>
            <p className="text-sm text-gray-600">Image haute résolution du graphique principal</p>
          </div>
          <Download className="w-5 h-5 text-success-600 ml-auto" />
        </button>

        <button
          onClick={handleReportExport}
          className="w-full flex items-center space-x-3 p-4 text-left bg-warning-50 hover:bg-warning-100 border border-warning-200 rounded-lg transition-colors"
        >
          <div className="p-2 bg-warning-500 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Rapport complet</h4>
            <p className="text-sm text-gray-600">Rapport détaillé avec toutes les statistiques</p>
          </div>
          <Download className="w-5 h-5 text-warning-600 ml-auto" />
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Résumé de l'analyse</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {result.files.length} fichier(s) analysé(s)</p>
          <p>• Plage RSB commune: {result.commonRange.min} à {result.commonRange.max} dB</p>
          <p>• {result.files.reduce((sum, f) => sum + f.validWords, 0)} mots traités au total</p>
        </div>
      </div>
    </div>
  );
}

function generateReport(result: AnalysisResult): string {
  const report = [];
  
  report.push('='.repeat(60));
  report.push('RAPPORT D\'ANALYSE RSB - RECONNAISSANCE VOCALE DANS LE BRUIT');
  report.push('='.repeat(60));
  report.push('');
  
  // Informations générales
  report.push('INFORMATIONS GÉNÉRALES');
  report.push('-'.repeat(30));
  report.push(`Nombre de fichiers analysés: ${result.files.length}`);
  report.push(`Plage RSB commune: ${result.commonRange.min} à ${result.commonRange.max} dB`);
  report.push(`Mots traités au total: ${result.files.reduce((sum, f) => sum + f.validWords, 0)}`);
  report.push('');
  
  // Détails par fichier
  report.push('DÉTAILS PAR FICHIER');
  report.push('-'.repeat(30));
  result.files.forEach((file, index) => {
    const maxPercentage = Math.max(...file.percentages);
    const maxIndex = file.percentages.indexOf(maxPercentage);
    const bestRSB = file.rsbPoints[maxIndex];
    
    report.push(`${index + 1}. ${file.file}`);
    report.push(`   Mots valides: ${file.validWords}/${file.totalExpected}`);
    report.push(`   Plage RSB: ${Math.min(file.rsbStart, file.rsbEnd)} à ${Math.max(file.rsbStart, file.rsbEnd)} dB`);
    report.push(`   Meilleur score: ${maxPercentage.toFixed(1)}% à ${bestRSB} dB`);
    report.push('');
  });
  
  // Données moyennes
  report.push('DONNÉES MOYENNES PAR RSB');
  report.push('-'.repeat(30));
  result.average.rsbGrid.forEach((rsb, index) => {
    const avg = result.average.percentages[index];
    const std = result.average.standardDeviation[index];
    const min = result.average.min[index];
    const max = result.average.max[index];
    
    report.push(`RSB ${rsb} dB: ${avg.toFixed(1)}% (±${std.toFixed(1)}) [${min.toFixed(1)}% - ${max.toFixed(1)}%]`);
  });
  
  report.push('');
  report.push('='.repeat(60));
  report.push(`Rapport généré le ${new Date().toLocaleString('fr-FR')}`);
  
  return report.join('\n');
}