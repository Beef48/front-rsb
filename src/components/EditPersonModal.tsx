import React, { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';
import apiService, { Person } from '../services/api';

interface EditPersonModalProps {
  person: Person | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Person) => void;
}

export default function EditPersonModal({ person, open, onClose, onSaved }: EditPersonModalProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [pathology, setPathology] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setName(person.person_name || '');
      setAge(typeof person.age === 'number' ? person.age : '');
      setPathology(person.pathology ?? person.pathologie ?? '');
      setComment(person.comment ?? person.commentaire ?? '');
    }
  }, [person]);

  if (!open || !person) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updates: Partial<Person> = {
        person_name: name || undefined,
        age: typeof age === 'number' ? age : undefined,
        pathology: pathology || undefined,
        comment: comment || undefined,
      };

      const updated = await apiService.updatePerson(person.id, updates);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Modifier {person.person_name}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2"
                placeholder="Nom du participant"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Âge</label>
            <input
              type="number"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex: 23"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pathologie</label>
            <input
              type="text"
              value={pathology}
              onChange={(e) => setPathology(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex: Surdité, Acouphènes, ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ajoutez des notes cliniques ou contextuelles"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-60"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

