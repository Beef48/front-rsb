import * as React from "react";
import { DataGrid, GridColDef, GridValueGetterParams, GridCellEditCommitParams, GridRenderEditCellParams, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Chip, MenuItem, Select, TextField, SelectChangeEvent, Button, CircularProgress, Alert } from "@mui/material";
import { apiService } from "../services/api";
import { GridToolbarExport } from "@mui/x-data-grid";
import { StatisticsPanel } from "./StatisticsPanel";
import { ResultsChart } from "./ResultsChart";
import { WordStatsChart } from "./WordStatsChart";
import { ResponseTimeChart } from "./ResponseTimeChart";
import { TimeVsAccuracyChart } from "./TimeVsAccuracyChart";
import { TestDetailsPanel } from "./TestDetailsPanel";
import { AnalysisResult, WordTest } from '../types';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const PATHOLOGIES = [
  "normal",
  "pathologie 1",
  "pathologie 2",
  "pathologie 3",
  "pathologie 4",
];

export default function DatabaseTableWithFilter() {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Pour édition locale
  const handleCellEditCommit = async (params: GridCellEditCommitParams) => {
    const { id, field, value } = params;
    const updatedRow = rows.find((row) => row.id === id);
    if (!updatedRow) return;
    const newRow = { ...updatedRow, [field]: value };
    setRows((prev) => prev.map((row) => (row.id === id ? newRow : row)));
    try {
      await apiService.updatePerson(id, { [field]: value });
    } catch (e) {
      alert("Erreur lors de la sauvegarde côté serveur: " + (e instanceof Error ? e.message : e));
    }
  };

  // Export CSV de la sélection
  const [selectionModel, setSelectionModel] = React.useState<number[]>([]);
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const handleExportCSV = () => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    if (selectedRows.length === 0) {
      alert("Sélectionnez au moins une ligne à exporter.");
      return;
    }
    // Générer le CSV
    const replacer = (key: string, value: any) => (value === null ? '' : value);
    const header = Object.keys(selectedRows[0]);
    const csv = [
      header.join(';'),
      ...selectedRows.map(row =>
        header.map(fieldName => {
          const val = row[fieldName];
          if (Array.isArray(val)) return '"' + val.join(', ') + '"';
          if (typeof val === 'object' && val !== null) return '"' + JSON.stringify(val) + '"';
          return String(val ?? '');
        }).join(';')
      )
    ].join('\r\n');
    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'export_selection.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyzeSelection = async () => {
    setAnalysisError(null);
    setAnalysisResult(null);
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    if (selectedRows.length === 0) {
      setAnalysisError("Sélectionnez au moins une ligne à analyser.");
      return;
    }
    setAnalysisLoading(true);
    try {
      // On utilise person_name pour l'analyse
      const names = selectedRows.map((row) => row.person_name);
      const result = await apiService.analyzePersonsByName(names);
      setAnalysisResult(result);
    } catch (e) {
      setAnalysisError("Erreur lors de l'analyse: " + (e instanceof Error ? e.message : e));
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Gestion de la base secondaire
  const [secondaryBase, setSecondaryBase] = React.useState<any[]>([]);

  // Ajouter un participant à la base secondaire
  const handleAddToSecondary = (row: any) => {
    if (!secondaryBase.some((p) => p.id === row.id)) {
      setSecondaryBase((prev) => [...prev, row]);
    }
  };

  // Retirer un participant de la base secondaire
  const handleRemoveFromSecondary = (id: number) => {
    setSecondaryBase((prev) => prev.filter((p) => p.id !== id));
  };

  // Analyser la base secondaire
  const [secondaryAnalysisResult, setSecondaryAnalysisResult] = React.useState<any>(null);
  const [secondaryAnalysisLoading, setSecondaryAnalysisLoading] = React.useState(false);
  const [secondaryAnalysisError, setSecondaryAnalysisError] = React.useState<string | null>(null);

  const handleAnalyzeSecondary = async () => {
    setSecondaryAnalysisError(null);
    setSecondaryAnalysisResult(null);
    if (secondaryBase.length === 0) {
      setSecondaryAnalysisError("Ajoutez au moins un participant à la base secondaire.");
      return;
    }
    setSecondaryAnalysisLoading(true);
    try {
      const names = secondaryBase.map((row) => row.person_name);
      const result = await apiService.analyzePersonsByName(names);
      setSecondaryAnalysisResult(result);
    } catch (e) {
      setSecondaryAnalysisError("Erreur lors de l'analyse: " + (e instanceof Error ? e.message : e));
    } finally {
      setSecondaryAnalysisLoading(false);
    }
  };

  // Exporter la base secondaire
  const handleExportSecondaryCSV = () => {
    if (secondaryBase.length === 0) {
      alert("Ajoutez au moins un participant à la base secondaire.");
      return;
    }
    const replacer = (key: string, value: any) => (value === null ? '' : value);
    const header = Object.keys(secondaryBase[0]);
    const csv = [
      header.join(';'),
      ...secondaryBase.map(row =>
        header.map(fieldName => {
          const val = row[fieldName];
          if (Array.isArray(val)) return '"' + val.join(', ') + '"';
          if (typeof val === 'object' && val !== null) return '"' + JSON.stringify(val) + '"';
          return String(val ?? '');
        }).join(';')
      )
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'base_secondaire.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await apiService.getPersons();
      setRows(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Colonnes dynamiques
  const columns: GridColDef[] = [
    { field: "person_name", headerName: "Nom", width: 120, editable: false },
    { field: "user_id", headerName: "User ID", width: 120, editable: false },
    { field: "age", headerName: "Âge", width: 80, type: "number", editable: false },
    { field: "start_time", headerName: "Début", width: 160, valueGetter: (params: GridValueGetterParams) => params.value ? new Date(params.value as string).toLocaleString("fr-FR") : "", editable: false },
    { field: "end_time", headerName: "Fin", width: 160, valueGetter: (params: GridValueGetterParams) => params.value ? new Date(params.value as string).toLocaleString("fr-FR") : "", editable: false },
    { field: "commentaires", headerName: "Commentaires", width: 200, editable: true, renderEditCell: (params: GridRenderEditCellParams) => (
      <TextField
        fullWidth
        multiline
        value={params.value || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => params.api.setEditCellValue({ id: params.id, field: params.field, value: e.target.value })}
      />
    )},
    {
      field: "pathologies",
      headerName: "Pathologies",
      width: 220,
      editable: true,
      renderCell: (params: GridRenderCellParams<any, string[]>) =>
        params.value && Array.isArray(params.value)
          ? params.value.map((val: string) => <Chip key={val} label={val} size="small" sx={{ mr: 0.5 }} />)
          : null,
      renderEditCell: (params: GridRenderEditCellParams) => (
        <Select
          multiple
          value={params.value || []}
          onChange={(e: SelectChangeEvent<string[]>) =>
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value,
            })
          }
          fullWidth
          renderValue={(selected: string[]) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {PATHOLOGIES.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      ),
    },
    { field: "created_at", headerName: "Importé le", width: 160, valueGetter: (params: GridValueGetterParams) => params.value ? new Date(params.value as string).toLocaleString("fr-FR") : "", editable: false },
    {
      field: 'addToSecondary',
      headerName: 'Base secondaire',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          variant="outlined"
          size="small"
          color={secondaryBase.some((p) => p.id === params.row.id) ? 'success' : 'primary'}
          onClick={() => handleAddToSecondary(params.row)}
          disabled={secondaryBase.some((p) => p.id === params.row.id)}
        >
          {secondaryBase.some((p) => p.id === params.row.id) ? 'Ajouté' : 'Ajouter'}
        </Button>
      ),
    },
    // Ajoute d'autres colonnes si besoin
  ];

  // Nouveau composant pour stats des mots sur la sélection
  function WordStatsChartFromResult({ result }: { result: AnalysisResult }) {
    // Extraire tous les wordTests de tous les fichiers sélectionnés
    const allWordTests: WordTest[] = result.files.flatMap(f => f.wordTests || []);
    // Regrouper par mot
    const wordMap: Record<string, { total: number; success: number }> = {};
    allWordTests.forEach(wt => {
      if (!wordMap[wt.target]) wordMap[wt.target] = { total: 0, success: 0 };
      wordMap[wt.target].total++;
      if (wt.isCorrect) wordMap[wt.target].success++;
    });
    // Générer les stats pour le graphique
    const wordStats = Object.entries(wordMap).map(([word, { total, success }]) => ({
      word,
      total,
      success,
      rate: total > 0 ? (100 * success) / total : 0
    })).sort((a, b) => b.rate - a.rate);
    // Limiter à top 15 par défaut
    const topStats = wordStats.slice(0, 15);
    return (
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Statistiques des mots (sélection)</h3>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topStats} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="word" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} label={{ value: 'Taux de réussite (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="rate" fill="#2563eb" name="Taux de réussite (%)" />
              <Bar dataKey="success" fill="#10b981" name="Réussites" />
              <Bar dataKey="total" fill="#f59e42" name="Total tentatives" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ height: 'auto', width: "100%", background: "#fff", borderRadius: 2, p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleExportCSV}>
          Exporter la sélection (CSV)
        </Button>
        <Button variant="contained" color="secondary" onClick={handleAnalyzeSelection}>
          Analyser la sélection
        </Button>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSize={20}
        rowsPerPageOptions={[10, 20, 50, 100]}
        checkboxSelection
        disableSelectionOnClick
        filterMode="client"
        onCellEditCommit={handleCellEditCommit}
        getRowId={(row: any) => row.id}
        sx={{
          "& .MuiDataGrid-cell--editing": { bgcolor: "#e3f2fd" },
        }}
        onSelectionModelChange={(ids) => setSelectionModel(ids as number[])}
      />
      {/* Affichage des résultats d'analyse */}
      {analysisLoading && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}
      {analysisError && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{analysisError}</Alert>
        </Box>
      )}
      {analysisResult && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="success">Statistiques calculées sur la sélection</Alert>
          {/* Affichage graphique/statistique */}
          <Box sx={{ my: 2 }}>
            <StatisticsPanel result={analysisResult} />
          </Box>
          <Box sx={{ my: 2 }}>
            <ResultsChart result={analysisResult} showIndividualCurves={true} showConfidenceInterval={true} />
          </Box>
          <Box sx={{ my: 2 }}>
            <WordStatsChartFromResult result={analysisResult} />
          </Box>
          <Box sx={{ my: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <ResponseTimeChart result={analysisResult} />
            <TimeVsAccuracyChart result={analysisResult} />
          </Box>
          <Box sx={{ my: 2 }}>
            <TestDetailsPanel result={analysisResult} />
          </Box>
        </Box>
      )}
      {/* Affichage de la base secondaire */}
      <Box sx={{ mt: 6, mb: 2 }}>
        <h2 className="text-lg font-semibold mb-2">Base secondaire ({secondaryBase.length} participant{secondaryBase.length > 1 ? 's' : ''})</h2>
        {secondaryBase.length === 0 ? (
          <Alert severity="info">Ajoutez des participants à la base secondaire pour la manipuler.</Alert>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary" onClick={handleExportSecondaryCSV}>
                Exporter la base secondaire (CSV)
              </Button>
              <Button variant="contained" color="secondary" onClick={handleAnalyzeSecondary}>
                Analyser la base secondaire
              </Button>
            </Box>
            <Box sx={{ mb: 2 }}>
              <DataGrid
                rows={secondaryBase}
                columns={columns.filter(col => col.field !== 'addToSecondary')}
                pageSize={10}
                rowsPerPageOptions={[10, 20, 50]}
                autoHeight
                getRowId={(row: any) => row.id}
                disableSelectionOnClick
                sx={{
                  "& .MuiDataGrid-cell--editing": { bgcolor: "#e3f2fd" },
                }}
                components={{}}
                componentsProps={{}}
                // Ajoute un bouton "Retirer" sur chaque ligne
                slots={{
                  cell: (props) => {
                    if (props.field === 'person_name') {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{props.value}</span>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleRemoveFromSecondary(props.row.id)}>
                            Retirer
                          </Button>
                        </div>
                      );
                    }
                    return props.value;
                  }
                }}
              />
            </Box>
            {secondaryAnalysisLoading && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            )}
            {secondaryAnalysisError && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error">{secondaryAnalysisError}</Alert>
              </Box>
            )}
            {secondaryAnalysisResult && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success">Statistiques calculées sur la base secondaire</Alert>
                <Box sx={{ my: 2 }}>
                  <StatisticsPanel result={secondaryAnalysisResult} />
                </Box>
                <Box sx={{ my: 2 }}>
                  <ResultsChart result={secondaryAnalysisResult} showIndividualCurves={true} showConfidenceInterval={true} />
                </Box>
                <Box sx={{ my: 2 }}>
                  <WordStatsChartFromResult result={secondaryAnalysisResult} />
                </Box>
                <Box sx={{ my: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <ResponseTimeChart result={secondaryAnalysisResult} />
                  <TimeVsAccuracyChart result={secondaryAnalysisResult} />
                </Box>
                <Box sx={{ my: 2 }}>
                  <TestDetailsPanel result={secondaryAnalysisResult} />
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
} 