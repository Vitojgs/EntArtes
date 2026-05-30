import { useState, useEffect } from 'react';
import { User } from '../types';
import api from '../services/api';
import { toast } from 'sonner';
import { Save, Music2, BarChart3, CalendarDays } from 'lucide-react';

const NIVEIS = ['Iniciante', 'Intermédio', 'Avançado'];

interface AlunoProfileFormProps {
  user: User;
  onSaved?: () => void;
}

export default function AlunoProfileForm({ user, onSaved }: AlunoProfileFormProps) {
  const [dataNascimento, setDataNascimento] = useState(user.dataNascimento?.split('T')[0] || '');
  const [nivel, setNivel] = useState(user.nivel || '');
  const [selectedMods, setSelectedMods] = useState<number[]>(
    user.modalidades?.map(m => m.id) || []
  );
  const [allModalidades, setAllModalidades] = useState<{ idmodalidade: number; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getModalidades().then(res => {
      if (res.success && res.data) setAllModalidades(res.data);
    }).catch(() => {});
  }, []);

  const toggleModalidade = (id: number) => {
    setSelectedMods(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateUser(parseInt(user.id), {
        dataNascimento: dataNascimento || undefined,
        nivel: nivel || undefined,
        alunoModalidades: selectedMods,
      });
      if (res.success) {
        toast.success('Perfil atualizado com sucesso!');
        onSaved?.();
      } else {
        toast.error(res.error || 'Erro ao guardar perfil');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
      <h3 className="text-[#0a1a17] text-lg font-semibold mb-4">Perfil do Aluno</h3>

      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm text-[#0a1a17] font-medium mb-2">
          <CalendarDays className="w-4 h-4 text-[#0d6b5e]" />
          Data de Nascimento
        </label>
        <input
          type="date"
          value={dataNascimento}
          onChange={e => setDataNascimento(e.target.value)}
          className="w-full border border-[#0d6b5e]/20 rounded-lg px-3 py-2 text-sm bg-white text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
        />
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm text-[#0a1a17] font-medium mb-2">
          <BarChart3 className="w-4 h-4 text-[#0d6b5e]" />
          Nível
        </label>
        <select
          value={nivel}
          onChange={e => setNivel(e.target.value)}
          className="w-full border border-[#0d6b5e]/20 rounded-lg px-3 py-2 text-sm bg-white text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
        >
          <option value="">Selecionar nível</option>
          {NIVEIS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm text-[#0a1a17] font-medium mb-2">
          <Music2 className="w-4 h-4 text-[#0d6b5e]" />
          Modalidades
        </label>
        {allModalidades.length === 0 ? (
          <p className="text-sm text-[#4d7068]">A carregar modalidades…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allModalidades.map(mod => {
              const checked = selectedMods.includes(mod.idmodalidade);
              return (
                <label
                  key={mod.idmodalidade}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    checked
                      ? 'bg-[#0d6b5e] text-white border-[#0d6b5e]'
                      : 'bg-[#f4f9f8] text-[#0a1a17] border-[#0d6b5e]/10 hover:border-[#0d6b5e]/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModalidade(mod.idmodalidade)}
                    className="sr-only"
                  />
                  {mod.nome}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-[#c9a84c] text-[#0a1a17] px-5 py-2 rounded-lg hover:bg-[#e8c97a] transition-colors text-sm font-semibold disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'A guardar…' : 'Guardar Alterações'}
      </button>
    </div>
  );
}
