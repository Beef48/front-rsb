import React from 'react';
import { ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ReferenceLine } from 'recharts';
import { AnalysisResult } from '../types';

interface TimeVsAccuracyChartProps {
  result: AnalysisResult;
}

export function TimeVsAccuracyChart({ result }: TimeVsAccuracyChartProps) {
  // Préparer les données pour la moyenne
  const meanData = result.average.rsbGrid.map((rsb, index) => ({
    accuracy: result.average.percentages[index],
    time: result.average.times[index],
  })).filter(point => point.accuracy > 0 && point.time > 0);

  // Préparer les données pour chaque fichier (inclut RSB pour le tooltip)
  const filesData = result.files.map((file, fileIndex) =>
    file.rsbPoints.map((rsb, i) => ({
      accuracy: file.percentages[i],
      time: file.averageTimes[i],
      rsb,
      fileIndex,
      fileName: file.file
    })).filter(point => point.accuracy > 0 && point.time > 0)
  );

  // Fusionner tous les points pour la tendance globale
  const allPoints = filesData.flat();
  console.log('Points pour tendance:', allPoints);

  // Calcul de la régression linéaire (tendance sur tous les points)
  let trendLine: { accuracy: number; time: number }[] = [];
  let corrInfo: { a: number; b: number; r: number } | null = null;
  if (allPoints.length > 1) {
    const n = allPoints.length;
    const sumX = allPoints.reduce((sum, p) => sum + p.accuracy, 0);
    const sumY = allPoints.reduce((sum, p) => sum + p.time, 0);
    const sumXY = allPoints.reduce((sum, p) => sum + p.accuracy * p.time, 0);
    const sumX2 = allPoints.reduce((sum, p) => sum + p.accuracy * p.accuracy, 0);
    const sumY2 = allPoints.reduce((sum, p) => sum + p.time * p.time, 0);
    
    // Éviter la division par zéro
    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) > 1e-10) {
      const a = (n * sumXY - sumX * sumY) / denominator;
      const b = (sumY - a * sumX) / n;
      const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      const r = rDen !== 0 ? (n * sumXY - sumX * sumY) / rDen : 0;
      corrInfo = { a, b, r };
      const minX = Math.min(...allPoints.map(p => p.accuracy));
      const maxX = Math.max(...allPoints.map(p => p.accuracy));
      trendLine = [
        { accuracy: minX, time: a * minX + b },
        { accuracy: maxX, time: a * maxX + b }
      ];
      console.log('Tendance calculée:', { allPoints: allPoints.length, a, b, minX, maxX, trendLine });
    } else {
      console.log('Impossible de calculer la tendance: dénominateur trop petit');
    }
  } else {
    console.log('Pas assez de points pour calculer la tendance:', allPoints.length);
  }

  // Valeurs min/max par défaut pour les axes
  const defaultXMin = 0;
  const defaultXMax = 110;
  const yValues = allPoints.length > 0 ? allPoints.map(p => p.time) : [0];
  const defaultYMin = Math.floor(Math.min(...yValues) - 20);
  const defaultYMax = Math.ceil(Math.max(...yValues) + 20);

  const colors = [
    '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#F97316', 
    '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'
  ];

  // Interactions: clignotement + survol + sélection pour Scatter + Lines
  const [blinkKey, setBlinkKey] = React.useState<string | null>(null);
  const [blinkOn, setBlinkOn] = React.useState<boolean>(false);
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const blinkTimerRef = React.useRef<number | null>(null);
  const stopTimerRef = React.useRef<number | null>(null);

  const triggerBlink = (key: string) => {
    if (blinkTimerRef.current) window.clearInterval(blinkTimerRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    setBlinkKey(key);
    setBlinkOn(true);
    blinkTimerRef.current = window.setInterval(() => setBlinkOn(prev => !prev), 220);
    stopTimerRef.current = window.setTimeout(() => {
      if (blinkTimerRef.current) window.clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
      setBlinkOn(false);
      setBlinkKey(null);
    }, 1800);
  };

  // Générer les étiquettes des séries fichiers telles qu'affichées dans la légende
  const fileLabels = result.files.map((f, i) => (
    f?.file ? f.file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || `Fichier ${i + 1}` : `Fichier ${i + 1}`
  ));
  const labelToKey: Record<string, string> = fileLabels.reduce((acc, label, i) => {
    acc[label] = `file_${i}`;
    return acc;
  }, {} as Record<string, string>);
  labelToKey['Moyenne'] = 'mean';
  labelToKey['Tendance linéaire'] = 'trend';

  const resolveLegendKey = (o: any): string | null => {
    const byValue = (o?.value && labelToKey[o.value]) ? labelToKey[o.value] : null;
    if (byValue) return byValue;
    const dk = o?.dataKey || o?.payload?.dataKey;
    if (typeof dk === 'string') {
      if (dk.startsWith('file_')) return dk;
      // fallback
      if (dk === 'time' && o?.value === 'Moyenne') return 'mean';
      if (dk === 'time' && o?.value === 'Tendance linéaire') return 'trend';
    }
    return null;
  };

  const onLegendClick = (o: any) => {
    const key = resolveLegendKey(o);
    if (key) {
      triggerBlink(key);
      setSelectedKey(prev => (prev === key ? null : key));
    }
  };
  const onLegendEnter = (o: any) => {
    const key = resolveLegendKey(o);
    if (key) setHoveredKey(key);
  };
  const onLegendLeave = () => setHoveredKey(null);

  const computeOpacity = (key: string, base: number) => {
    if (selectedKey && key !== selectedKey) return Math.min(base, 0.2);
    if (hoveredKey && key !== hoveredKey) return Math.min(base, 0.4);
    return base;
  };

  const lineStyle = (key: string, baseOpacity = 1, baseWidth = 3) => {
    const isTarget = blinkKey === key;
    const eff = computeOpacity(key, baseOpacity);
    return {
      strokeOpacity: isTarget ? (blinkOn ? 1 : 0.15) : eff,
      strokeWidth: isTarget ? (blinkOn ? baseWidth + 2 : baseWidth) : baseWidth,
    };
  };

  const scatterStyle = (key: string, baseOpacity = 1) => {
    const isTarget = blinkKey === key;
    const eff = computeOpacity(key, baseOpacity);
    return {
      fillOpacity: isTarget ? (blinkOn ? 1 : 0.15) : eff,
      // stroke pour renforcer la perception visuelle
      stroke: isTarget ? '#111827' : 'none',
      strokeWidth: isTarget ? (blinkOn ? 1.5 : 0.5) : 0,
    } as any;
  };

  // Affichages optionnels
  const [showPoints, setShowPoints] = React.useState(true);
  const [showMean, setShowMean] = React.useState(true);
  const [showTrend, setShowTrend] = React.useState(true);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Temps moyen vs Taux de réussite</h3>
        {corrInfo && (
          <div className="text-sm text-gray-600">
            r = {corrInfo.r.toFixed(2)} {corrInfo.a >= 0 ? '+' : ''} a={corrInfo.a.toFixed(2)}, b={corrInfo.b.toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => setShowPoints(v => !v)} className={`px-3 py-1 rounded border text-sm ${showPoints ? 'bg-gray-100 border-gray-300' : 'border-gray-300'}`}>Points</button>
        <button onClick={() => setShowMean(v => !v)} className={`px-3 py-1 rounded border text-sm ${showMean ? 'bg-gray-100 border-gray-300' : 'border-gray-300'}`}>Moyenne</button>
        <button onClick={() => setShowTrend(v => !v)} className={`px-3 py-1 rounded border text-sm ${showTrend ? 'bg-gray-100 border-gray-300' : 'border-gray-300'}`}>Tendance</button>
      </div>
      <div className="h-[500px] relative group">
        <button
          onClick={async (e) => {
            const container = (e.currentTarget as HTMLElement)?.closest('.group') as HTMLElement | null;
            if (container) {
              const { printSvgAsPngInlineFromContainer } = await import('../utils/printChart');
              const extra = (() => {
                const parts: string[] = [];
                if (selectedKey && selectedKey.startsWith('file_')) {
                  const idx = parseInt(selectedKey.split('_')[1]);
                  const f = result.files[idx];
                  if (f) {
                    parts.push(`<strong>${f.file ? f.file.split('_').slice(-1)[0]?.replace('.xlsx','').replace('.csv','') : 'Fichier ' + (idx+1)}</strong>`);
                    const step = f.rsbPoints.length > 1 ? f.rsbPoints[1] - f.rsbPoints[0] : null;
                    const wordsPerLevel = f.rsbPoints.length > 0 ? Math.round(f.totalExpected / f.rsbPoints.length) : null;
                    parts.push(`Début: ${f.rsbStart} dB`);
                    parts.push(`Fin: ${f.rsbEnd} dB`);
                    if (step !== null) parts.push(`Pas: ${step} dB`);
                    if (wordsPerLevel !== null) parts.push(`Mots/pas: ${wordsPerLevel}`);
                  }
                } else if (selectedKey === 'mean') {
                  parts.push('<strong>Moyenne</strong>');
                } else if (selectedKey === 'trend') {
                  parts.push('<strong>Tendance linéaire</strong>');
                }
                return parts.join(' | ');
              })();
              await printSvgAsPngInlineFromContainer(container, 'Temps vs Réussite', extra);
            }
          }}
          className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-300 text-gray-800 text-xs px-2 py-1 rounded shadow"
          title="Imprimer ce graphique"
        >
          Imprimer
        </button>
        <button
          onClick={async (e) => {
            const container = (e.currentTarget as HTMLElement)?.closest('.group') as HTMLElement | null;
            if (container) {
              const { exportSvgContainerToPng } = await import('../utils/exportImage');
              const { formatNowForFile } = await import('../utils/printSettings');
              await exportSvgContainerToPng(container, `graphique_temps_vs_reussite_${formatNowForFile()}`);
            }
          }}
          className="absolute right-24 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-300 text-gray-800 text-xs px-2 py-1 rounded shadow"
          title="Exporter en PNG"
        >
          PNG
        </button>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="accuracy"
              type="number"
              domain={[0, 110]}
              label={{ value: '% de mots reconnus', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              dataKey="time"
              domain={[(dataMin: number) => Math.floor(dataMin - 20), (dataMax: number) => Math.ceil(dataMax + 20)]}
              label={{ value: 'Temps moyen (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'accuracy') return [`${Number(value).toFixed(1)}%`, 'Taux de réussite'];
                if (name === 'time') return [`${Number(value).toFixed(0)} ms`, 'Temps moyen'];
                return [value, name];
              }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ paddingTop: '20px' }}
              onClick={onLegendClick}
              onMouseEnter={onLegendEnter}
              onMouseLeave={onLegendLeave}
            />
            {/* Ligne de référence à 50% */}
            <ReferenceLine y={50} stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />
            {/* Points pour chaque fichier */}
            {showPoints && filesData.map((data, index) => (
              <Scatter
                key={`file_${index}`}
                data={data}
                fill={colors[index % colors.length]}
                {...scatterStyle(`file_${index}`, 0.5)}
                name={result.files[index]?.file ? 
                  result.files[index].file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || 
                  `Fichier ${index+1}` : 
                  `Fichier ${index+1}`}
              />
            ))}
            {/* Courbe moyenne (ligne) */}
            {showMean && (
            <Line
              type="monotone"
              dataKey="time"
              data={meanData}
              stroke="#1E40AF"
              {...lineStyle('mean', 1, 3)}
              dot={false}
              name="Moyenne"
            />)}
            {/* Courbe de tendance (régression linéaire) */}
            {showTrend && trendLine.length === 2 && (
              <Line
                type="linear"
                data={trendLine}
                dataKey="time"
                stroke="#EF4444"
                {...lineStyle('trend', 1, 3)}
                dot={false}
                name="Tendance linéaire"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 