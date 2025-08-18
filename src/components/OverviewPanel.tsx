import React, { useEffect, useState } from 'react';
import apiService, { OverviewStats } from '../services/api';
import { Users, Calendar, BarChart3 } from 'lucide-react';

export function OverviewPanel() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getOverviewStats()
      .then(setOverview)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Chargement des statistiques globales...</div>;
  if (!overview) return <div>Impossible de charger les statistiques globales.</div>;

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble de la base</h3>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="print-scale" className="text-sm text-gray-600">Zoom impression:</label>
        <select
          id="print-scale"
          className="border rounded px-2 py-1 text-sm"
          defaultValue={100}
          onChange={(e) => {
            import('../utils/printSettings').then(m => m.setPrintScale(Number(e.target.value) as any));
          }}
        >
          <option value={70}>70%</option>
          <option value={80}>80%</option>
          <option value={90}>90%</option>
          <option value={100}>100%</option>
          <option value={110}>110%</option>
          <option value={120}>120%</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-primary-600" />
          <div>
            <div className="text-2xl font-bold">{overview.total_users}</div>
            <div className="text-xs text-gray-500">Utilisateurs</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-2xl font-bold">{overview.average_age.toFixed(1)}</div>
            <div className="text-xs text-gray-500">Âge moyen</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <div>
            <div className="text-2xl font-bold">{overview.rsb_range.min} à {overview.rsb_range.max} dB</div>
            <div className="text-xs text-gray-500">Plage RSB</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-orange-600" />
          <div>
            <div className="text-2xl font-bold">{new Date(overview.last_test_date).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">Dernier test</div>
          </div>
        </div>
      </div>
    </div>
  );
} 