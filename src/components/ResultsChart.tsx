import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area
} from 'recharts';
import { AnalysisResult } from '../types';

interface ResultsChartProps {
  result: AnalysisResult;
  showIndividualCurves: boolean;
  showConfidenceInterval: boolean;
  titleSuffix?: string;
}

export function ResultsChart({ result, showIndividualCurves, showConfidenceInterval, titleSuffix = '' }: ResultsChartProps) {
  const { min: commonMin, max: commonMax } = result.commonRange;

  // Utiliser les statistiques globales si disponibles, sinon utiliser les statistiques locales
  const globalStats = result.globalStatistics;
  const useGlobalStats = globalStats && showConfidenceInterval;

  const chartData = result.average.rsbGrid.map((rsb, index) => {
    const dataPoint: any = {
      rsb,
      average: result.average.percentages[index],
      min: result.average.min[index],
      max: result.average.max[index],
    };

    // Utiliser les limites globales si disponibles
    if (useGlobalStats) {
      // Trouver l'index correspondant dans la grille globale
      const globalIndex = globalStats.rsbGrid.indexOf(rsb);
      if (globalIndex !== -1) {
        dataPoint.lowerBound = globalStats.lowerLimits[globalIndex];
        dataPoint.upperBound = globalStats.upperLimits[globalIndex];
        dataPoint.globalMean = globalStats.means[globalIndex];
      } else {
        // Interpolation si le point RSB n'est pas dans la grille
        dataPoint.lowerBound = interpolateValue(globalStats.rsbGrid, globalStats.lowerLimits, rsb);
        dataPoint.upperBound = interpolateValue(globalStats.rsbGrid, globalStats.upperLimits, rsb);
        dataPoint.globalMean = interpolateValue(globalStats.rsbGrid, globalStats.means, rsb);
      }
    } else {
      dataPoint.lowerBound = Math.max(0, result.average.percentages[index] - result.average.standardDeviation[index]);
      dataPoint.upperBound = Math.min(100, result.average.percentages[index] + result.average.standardDeviation[index]);
    }

    result.files.forEach((file, fileIndex) => {
      const interpolatedValue = interpolateValue(file.rsbPoints, file.percentages, rsb);
      dataPoint[`file_${fileIndex}`] = interpolatedValue;
    });
    return dataPoint;
  }).filter(point => point.rsb >= Math.min(commonMin, commonMax) && point.rsb <= Math.max(commonMin, commonMax));

  const colors = [
    '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#F97316',
    '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'
  ];

  // État pour gérer le clignotement d'une série lorsqu'on clique sur son libellé
  const [blinkKey, setBlinkKey] = React.useState<string | null>(null);
  const [blinkOn, setBlinkOn] = React.useState<boolean>(false);
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const blinkTimerRef = React.useRef<number | null>(null);
  const stopTimerRef = React.useRef<number | null>(null);

  // Cartouche RSB@50
  const [rsbInfo, setRsbInfo] = React.useState<{ label: string; value: number | null; color?: string; start?: number; end?: number; step?: number | null; wordsPerLevel?: number | null } | null>(null);

  const computeRSBAt50 = (xPoints: number[], yPoints: number[]): number | null => {
    if (!xPoints || !yPoints || xPoints.length < 2 || yPoints.length < 2) return null;
    for (let i = 0; i < xPoints.length - 1; i++) {
      const y1 = yPoints[i];
      const y2 = yPoints[i + 1];
      // Cherche un intervalle qui encadre 50%
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      if (minY <= 50 && 50 <= maxY && y2 !== y1) {
        const x1 = xPoints[i];
        const x2 = xPoints[i + 1];
        // interpolation linéaire à y=50
        const x = x1 + ((50 - y1) * (x2 - x1)) / (y2 - y1);
        return Number.isFinite(x) ? x : null;
      }
    }
    return null;
  };

  const triggerBlink = (key: string) => {
    // Nettoyer d'éventuels timers précédents
    if (blinkTimerRef.current) window.clearInterval(blinkTimerRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);

    setBlinkKey(key);
    setBlinkOn(true);
    blinkTimerRef.current = window.setInterval(() => {
      setBlinkOn(prev => !prev);
    }, 220);
    stopTimerRef.current = window.setTimeout(() => {
      if (blinkTimerRef.current) window.clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
      setBlinkOn(false);
      setBlinkKey(null);
    }, 1800);
  };

  const handleLegendClick = (o: any) => {
    const key = o?.dataKey || o?.value || o?.payload?.dataKey;
    if (typeof key === 'string') {
      triggerBlink(key);
      setSelectedKey(prev => (prev === key ? null : key));

      // Calcul du RSB à 50% selon la série cliquée
      let value: number | null = null;
      let label = typeof o?.value === 'string' ? o.value : key;
      let color: string | undefined = undefined;

      if (key.startsWith('file_')) {
        const idx = parseInt(key.split('_')[1]);
        const file = result.files[idx];
        if (file) {
          value = computeRSBAt50(file.rsbPoints, file.percentages);
          color = ['#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'][idx % 10];
          if (!label || label === key) {
            label = file.file ? file.file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || `Fichier ${idx + 1}` : `Fichier ${idx + 1}`;
          }
          const step = file.rsbPoints.length > 1 ? file.rsbPoints[1] - file.rsbPoints[0] : null;
          const wordsPerLevel = file.rsbPoints.length > 0 ? Math.round(file.totalExpected / file.rsbPoints.length) : null;
          setRsbInfo({ label, value, color, start: file.rsbStart, end: file.rsbEnd, step, wordsPerLevel });
          return;
        }
      } else if (key === 'average') {
        value = computeRSBAt50(result.average.rsbGrid, result.average.percentages);
        label = 'Moyenne';
        color = '#1E40AF';
      } else if (key === 'globalMean' && useGlobalStats && globalStats) {
        value = computeRSBAt50(globalStats.rsbGrid, globalStats.means);
        label = 'Moyenne globale';
        color = '#1E40AF';
      }
      setRsbInfo({ label, value, color, start: undefined, end: undefined, step: null, wordsPerLevel: null });
    }
  };

  const handleLegendMouseEnter = (o: any) => {
    const key = o?.dataKey || o?.value || o?.payload?.dataKey;
    if (typeof key === 'string') setHoveredKey(key);
  };
  const handleLegendMouseLeave = () => setHoveredKey(null);

  const computeBaseStyle = (key: string, baseOpacity: number) => {
    // If a series is selected, dim others strongly
    if (selectedKey && key !== selectedKey) {
      return Math.min(baseOpacity, 0.2);
    }
    // If hovering a series, dim others lightly
    if (hoveredKey && key !== hoveredKey) {
      return Math.min(baseOpacity, 0.4);
    }
    return baseOpacity;
  };

  const getLineBlinkProps = (key: string, baseOpacity = 1, baseWidth = 2) => {
    const isTarget = blinkKey === key;
    const effOpacity = computeBaseStyle(key, baseOpacity);
    return {
      strokeOpacity: isTarget ? (blinkOn ? 1 : 0.15) : effOpacity,
      strokeWidth: isTarget ? (blinkOn ? baseWidth + 2 : baseWidth) : baseWidth
    };
  };

  const getAreaBlinkProps = (key: string, baseOpacity = 0.2) => {
    const isTarget = blinkKey === key;
    const effOpacity = computeBaseStyle(key, baseOpacity);
    return {
      fillOpacity: isTarget ? (blinkOn ? baseOpacity : 0.05) : effOpacity
    } as any;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Reconnaissance vocale dans le bruit
        </h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 items-center justify-between">
          <div className="flex flex-wrap gap-4">
          {useGlobalStats ? (
            <>
              <span>• Moyenne globale en bleu</span>
              <span>• Limites de confiance globales (±σ)</span>
            </>
          ) : (
            <span>• Courbe moyenne en bleu</span>
          )}
          {showIndividualCurves && <span>• Courbes individuelles en couleur</span>}
          {showConfidenceInterval && !useGlobalStats && <span>• Intervalle de confiance (±σ)</span>}
          </div>
          {rsbInfo && (
            <div className="ml-auto px-3 py-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-900 text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: rsbInfo.color || '#1E40AF' }} />
              <span className="font-medium">{rsbInfo.label}</span>
              <span className="text-blue-700">RSB@50%</span>
              <span className="font-semibold">{rsbInfo.value !== null ? `${rsbInfo.value.toFixed(1)} dB` : 'n.d.'}</span>
              {typeof rsbInfo.start === 'number' && typeof rsbInfo.end === 'number' && (
                <span className="text-blue-800">| Début: {rsbInfo.start} dB, Fin: {rsbInfo.end} dB</span>
              )}
              {rsbInfo.step !== null && (
                <span className="text-blue-800">| Pas: {rsbInfo.step} dB</span>
              )}
              {rsbInfo.wordsPerLevel !== null && (
                <span className="text-blue-800">| Mots/pas: {rsbInfo.wordsPerLevel}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-[500px] relative group">
        {/* Bouton imprimer ce graphique */}
        <button
          onClick={async (e) => {
            const container = (e.currentTarget as HTMLElement)?.closest('.group') as HTMLElement | null;
            if (container) {
              const { printSvgInlineFromContainer } = await import('../utils/printChart');
              const suffix = titleSuffix ? ` - ${titleSuffix}` : '';
              const extra = (() => {
                const info = rsbInfo;
                if (!info) return '';
                const parts: string[] = [];
                parts.push(`<strong>${info.label}</strong>`);
                parts.push(`RSB@50%: <strong>${info.value !== null ? info.value.toFixed(1) + ' dB' : 'n.d.'}</strong>`);
                if (typeof info.start === 'number' && typeof info.end === 'number') {
                  parts.push(`Début: ${info.start} dB`);
                  parts.push(`Fin: ${info.end} dB`);
                }
                if (info.step !== null && info.step !== undefined) parts.push(`Pas: ${info.step} dB`);
                if (info.wordsPerLevel !== null && info.wordsPerLevel !== undefined) parts.push(`Mots/pas: ${info.wordsPerLevel}`);
                return parts.join(' | ');
              })();
              await printSvgInlineFromContainer(container, `Graphique RSB${suffix}`, extra);
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
              await exportSvgContainerToPng(container, `graphique_rsb_${formatNowForFile()}`);
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
              domain={[0, 110]}
              label={{ value: '% de mots reconnus', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'average') return [`${Number(value).toFixed(1)}%`, 'Moyenne'];
                if (name === 'globalMean') return [`${Number(value).toFixed(1)}%`, 'Moyenne globale'];
                if (typeof name === 'string' && name.startsWith('file_')) {
                  const fileIndex = parseInt(name.split('_')[1]);
                  return [`${Number(value).toFixed(1)}%`, result.files[fileIndex]?.file || 'Fichier'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `RSB: ${label} dB`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ paddingTop: '20px' }}
              onClick={handleLegendClick}
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
            />

            {/* Ligne de référence à 50% */}
            <ReferenceLine y={50} stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />

            {/* Intervalle de confiance : zone translucide + lignes */}
            {showConfidenceInterval && (
              <>
                {/* Zone de confiance (remplissage entre upperBound et lowerBound) */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  fill="#3B82F6"
                  {...getAreaBlinkProps('upperBound', 0.2)}
                  isAnimationActive={false}
                  name="Intervalle de confiance (±σ)"
                  connectNulls={false}
                />
                {/* Limite inférieure (μ-σ) */}
                <Line
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="#3B82F6"
                  strokeDasharray="4 4"
                  {...getLineBlinkProps('lowerBound', 0.8, 2)}
                  dot={false}
                  connectNulls={false}
                  name="Limite inférieure (μ-σ)"
                />
                {/* Limite supérieure (μ+σ) */}
                <Line
                  type="monotone"
                  dataKey="upperBound"
                  stroke="#3B82F6"
                  strokeDasharray="4 4"
                  {...getLineBlinkProps('upperBound', 0.8, 2)}
                  dot={false}
                  connectNulls={false}
                  name="Limite supérieure (μ+σ)"
                />
              </>
            )}

            {/* Courbes individuelles */}
            {showIndividualCurves && result.files.map((file, index) => (
              <Line
                key={`file_${index}`}
                type="monotone"
                dataKey={`file_${index}`}
                stroke={colors[index % colors.length]}
                {...getLineBlinkProps(`file_${index}`, 1, 2)}
                dot={{ r: 4 }}
                connectNulls={false}
                name={file.file ? 
                  file.file.split('_').slice(-1)[0]?.replace('.xlsx', '').replace('.csv', '') || 
                  `Fichier ${index+1}` : 
                  `Fichier ${index+1}`}
              />
            ))}

            {/* Courbe moyenne globale si disponible */}
            {useGlobalStats && (
              <Line
                type="monotone"
                dataKey="globalMean"
                stroke="#1E40AF"
                {...getLineBlinkProps('globalMean', 1, 3)}
                dot={{ r: 5, fill: '#1E40AF' }}
                connectNulls={false}
                name="Moyenne globale"
              />
            )}

            {/* Courbe moyenne locale (moyenne des personnes sélectionnées) */}
            {!useGlobalStats && (
              <Line
                type="monotone"
                dataKey="average"
                stroke="#1E40AF"
                {...getLineBlinkProps('average', 1, 3)}
                dot={{ r: 5, fill: '#1E40AF' }}
                connectNulls={false}
                name="Moyenne"
              />
            )}

            {/* Lignes de référence */}
            <ReferenceLine y={50} stroke="#9CA3AF" strokeDasharray="3 3" />
            <ReferenceLine y={80} stroke="#9CA3AF" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Fonction d'interpolation linéaire
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
