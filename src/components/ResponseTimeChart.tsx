import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AnalysisResult } from '../types';

interface ResponseTimeChartProps {
  result: AnalysisResult;
}

export function ResponseTimeChart({ result }: ResponseTimeChartProps) {
  const singleFile = result.files.length === 1;

  let chartData;
  if (singleFile) {
    // Utiliser les valeurs réelles du fichier sans interpolation
    const file = result.files[0];
    chartData = file.rsbPoints.map((rsb, i) => ({
      rsb,
      time: file.averageTimes[i],
    }));
    // DEBUG : afficher les données utilisées pour la courbe
    console.log('DEBUG - RSB points:', file.rsbPoints);
    console.log('DEBUG - Temps moyens:', file.averageTimes);
  } else {
    // Logique multi-fichiers (moyenne/interpolation)
    chartData = result.average.rsbGrid.map((rsb, index) => {
      const dataPoint: any = {
        rsb,
        averageTime: result.average.times[index],
      };
      result.files.forEach((file, fileIndex) => {
        const interpolatedValue = interpolateValue(file.rsbPoints, file.averageTimes, rsb);
        dataPoint[`file_${fileIndex}`] = interpolatedValue;
      });
      return dataPoint;
    }).filter(point => point.rsb >= Math.min(result.commonRange.min, result.commonRange.max) && point.rsb <= Math.max(result.commonRange.min, result.commonRange.max));
    // DEBUG : afficher les données de la courbe moyenne
    console.log('DEBUG - RSB grid:', result.average.rsbGrid);
    console.log('DEBUG - Temps moyens (moyenne):', result.average.times);
  }

  const colors = [
    '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#F97316', 
    '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'
  ];

  // Interactions: clignotement + survol + sélection
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

  const onLegendClick = (o: any) => {
    const key = o?.dataKey || o?.value || o?.payload?.dataKey;
    if (typeof key === 'string') {
      triggerBlink(key);
      setSelectedKey(prev => (prev === key ? null : key));
    }
  };
  const onLegendEnter = (o: any) => {
    const key = o?.dataKey || o?.value || o?.payload?.dataKey;
    if (typeof key === 'string') setHoveredKey(key);
  };
  const onLegendLeave = () => setHoveredKey(null);

  const computeBaseOpacity = (key: string, base: number) => {
    if (selectedKey && key !== selectedKey) return Math.min(base, 0.2);
    if (hoveredKey && key !== hoveredKey) return Math.min(base, 0.4);
    return base;
  };

  const lineStyle = (key: string, baseOpacity = 1, baseWidth = 2) => {
    const isTarget = blinkKey === key;
    const eff = computeBaseOpacity(key, baseOpacity);
    return {
      strokeOpacity: isTarget ? (blinkOn ? 1 : 0.15) : eff,
      strokeWidth: isTarget ? (blinkOn ? baseWidth + 2 : baseWidth) : baseWidth,
    };
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mt-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Temps moyen de réponse par RSB</h3>
      <div className="h-[500px] relative group">
        <button
          onClick={async (e) => {
            const container = (e.currentTarget as HTMLElement)?.closest('.group') as HTMLElement | null;
            if (container) {
              const { printSvgAsPngInlineFromContainer } = await import('../utils/printChart');
              const extra = (() => {
                const parts: string[] = [];
                if (singleFile) {
                  const f = result.files[0];
                  parts.push(`<strong>${f.file || 'Fichier 1'}</strong>`);
                  // RSB params
                  const step = f.rsbPoints.length > 1 ? f.rsbPoints[1] - f.rsbPoints[0] : null;
                  const wordsPerLevel = f.rsbPoints.length > 0 ? Math.round(f.totalExpected / f.rsbPoints.length) : null;
                  parts.push(`Début: ${f.rsbStart} dB`);
                  parts.push(`Fin: ${f.rsbEnd} dB`);
                  if (step !== null) parts.push(`Pas: ${step} dB`);
                  if (wordsPerLevel !== null) parts.push(`Mots/pas: ${wordsPerLevel}`);
                } else if (selectedKey && selectedKey.startsWith('file_')) {
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
                } else if (!singleFile && selectedKey === 'averageTime') {
                  parts.push('<strong>Moyenne</strong>');
                }
                return parts.join(' | ');
              })();
              await printSvgAsPngInlineFromContainer(container, 'Temps de réponse', extra);
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
              await exportSvgContainerToPng(container, `graphique_temps_reponse_${formatNowForFile()}`);
            }
          }}
          className="absolute right-24 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-300 text-gray-800 text-xs px-2 py-1 rounded shadow"
          title="Exporter en PNG"
        >
          PNG
        </button>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="rsb" 
              type="number"
              domain={[-14, 6]}
              ticks={[-14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6]}
              label={{ value: 'RSB (dB)', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: 'Temps moyen (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (singleFile && name === 'time') return [`${Number(value).toFixed(0)} ms`, result.files[0].file];
                if (!singleFile && name === 'averageTime') return [`${Number(value).toFixed(0)} ms`, 'Moyenne'];
                if (!singleFile && typeof name === 'string' && name.startsWith('file_')) {
                  const fileIndex = parseInt(name.split('_')[1]);
                  return [`${Number(value).toFixed(0)} ms`, result.files[fileIndex]?.file || 'Fichier'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `RSB: ${label} dB`}
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
            {singleFile ? (
              <Line
                type="monotone"
                dataKey="time"
                stroke="#F59E0B"
                {...lineStyle('time', 1, 3)}
                dot={{ r: 5, fill: '#F59E0B' }}
                connectNulls={false}
                name={result.files[0].file ? 
                  result.files[0].file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || 
                  'Fichier 1' : 
                  'Fichier 1'}
              />
            ) : (
              <>
                {result.files.map((file, index) => (
                  <Line
                    key={`file_${index}`}
                    type="monotone"
                    dataKey={`file_${index}`}
                    stroke={colors[index % colors.length]}
                    {...lineStyle(`file_${index}`, 1, 2)}
                    dot={{ r: 4 }}
                    connectNulls={false}
                    name={file.file ? 
                      file.file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || 
                      `Fichier ${index+1}` : 
                      `Fichier ${index+1}`}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="averageTime"
                  stroke="#1E40AF"
                  {...lineStyle('averageTime', 1, 3)}
                  dot={{ r: 5, fill: '#1E40AF' }}
                  connectNulls={false}
                  name="Moyenne"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function interpolateValue(xPoints: number[], yPoints: number[], targetX: number): number {
  if (xPoints.length === 0) return 0;
  let i = 0;
  while (i < xPoints.length - 1 && xPoints[i + 1] < targetX) {
    i++;
  }
  if (i === xPoints.length - 1) {
    return yPoints[i];
  }
  const x1 = xPoints[i];
  const x2 = xPoints[i + 1];
  const y1 = yPoints[i];
  const y2 = yPoints[i + 1];
  return y1 + ((y2 - y1) * (targetX - x1)) / (x2 - x1);
} 