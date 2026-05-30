import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

const TIPOS_OCUPACAO = ['Aula', 'Ensaio', 'Manutenção', 'Reunião', 'Outro'];

interface NovaOcupacaoModalProps {
  sala?: { id: string; nome: string };
  salas: { id: string; nome: string }[];
  data: string;
  onClose: () => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    salaId: string;
    data: string;
    horainicio: string;
    horafim: string;
    tipo: string;
    responsavel: string;
    observacoes: string;
  } | null;
}

export function NovaOcupacaoModal({ sala, salas, data, onClose, onSuccess, editData }: NovaOcupacaoModalProps) {
  const [salaId, setSalaId] = useState(editData?.salaId ?? sala?.id ?? salas[0]?.id ?? '');
  const [dataEditavel, setDataEditavel] = useState(editData?.data ?? data);
  const [horainicio, setHorainicio] = useState(editData?.horainicio ?? '09:00');
  const [horafim, setHorafim] = useState(editData?.horafim ?? '10:00');
  const [tipo, setTipo] = useState(editData?.tipo ?? 'Aula');
  const [responsavel, setResponsavel] = useState(editData?.responsavel ?? '');
  const [observacoes, setObservacoes] = useState(editData?.observacoes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salaNome = salas.find(s => s.id === salaId)?.nome ?? sala?.nome ?? '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!horainicio || !horafim) {
      setError('Preencha a hora de início e fim');
      return;
    }
    if (horainicio >= horafim) {
      setError('A hora de fim deve ser posterior à hora de início');
      return;
    }

    if (!salaId) {
      setError('Selecione uma sala');
      return;
    }

    if (!editData) {
      const agora = new Date();
      const dataHora = new Date(`${dataEditavel}T${horainicio}:00`);
      if (dataHora <= agora) {
        setError('Não é permitido criar ocupação para datas e horas que já passaram');
        return;
      }
    }

    setSubmitting(true);
    try {
      let res;
      if (editData) {
        res = await api.updateOcupacaoSala(editData.id, {
          salaId: parseInt(salaId),
          data: dataEditavel,
          horainicio,
          horafim,
          tipo,
          responsavel,
          observacoes,
        });
      } else {
        res = await api.criarOcupacaoSala({
          salaId: parseInt(salaId),
          data: dataEditavel,
          horainicio,
          horafim,
          tipo,
          responsavel,
          observacoes,
        });
      }
      if (res.success) {
        toast.success(editData ? 'Ocupação atualizada com sucesso!' : 'Ocupação criada com sucesso!');
        onSuccess();
        onClose();
      } else {
        setError(res.error || (editData ? 'Erro ao atualizar ocupação' : 'Erro ao criar ocupação'));
      }
    } catch (err: any) {
      setError(err.message || (editData ? 'Erro ao atualizar ocupação' : 'Erro ao criar ocupação'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0d6b5e]/8">
          <h3 className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>
            {editData ? 'Editar Ocupação' : 'Marcar Ocupação'} — {salaNome}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f4f9f8] transition-colors">
            <X className="w-4 h-4 text-[#4d7068]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Sala / Estúdio</label>
            <select value={salaId} onChange={e => setSalaId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Data</label>
              <input type="date" value={dataEditavel} onChange={e => setDataEditavel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
            </div>
            <div>
              <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                {TIPOS_OCUPACAO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Hora início</label>
              <input type="time" value={horainicio} onChange={e => setHorainicio(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
            </div>
            <div>
              <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Hora fim</label>
              <input type="time" value={horafim} onChange={e => setHorafim(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Responsável</label>
            <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)}
              placeholder="Nome do responsável (opcional)"
              className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
          </div>

          <div>
            <label className="block text-xs text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Observações (opcional)"
              rows={2}
              className="w-full px-3 py-2 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] resize-none" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg text-xs hover:bg-[#065147] transition-colors disabled:opacity-50"
              style={{ fontWeight: 600 }}>
              {submitting ? (editData ? 'A guardar...' : 'A criar...') : (editData ? 'Guardar Alterações' : 'Criar Ocupação')}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#deecea] text-[#0d6b5e] px-4 py-2 rounded-lg text-xs hover:bg-[#c8e0dc] transition-colors"
              style={{ fontWeight: 600 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
