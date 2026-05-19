import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface Feriado {
  data: string;
  nome: string;
  tipo: string;
}

interface FeriadosContextType {
  feriados: Feriado[];
  isDiaWarning: (dataStr: string) => { isWarning: boolean; mensagem?: string };
  loading: boolean;
}

const FeriadosContext = createContext<FeriadosContextType | undefined>(undefined);

function getAnosParaFetch(): number[] {
  const anoAtual = new Date().getFullYear();
  return [anoAtual, anoAtual + 1];
}

export function FeriadosProvider({ children }: { children: ReactNode }) {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeriados = async () => {
      try {
        const anos = getAnosParaFetch();
        const results = await Promise.all(anos.map(ano => api.getFeriados(ano)));
        const todos: Feriado[] = [];
        for (const res of results) {
          if (res.success && res.data) {
            todos.push(...res.data);
          }
        }
        setFeriados(todos);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchFeriados();
  }, []);

  const isDiaWarning = (dataStr: string): { isWarning: boolean; mensagem?: string } => {
    if (!dataStr) return { isWarning: false };

    const date = new Date(dataStr + 'T12:00:00');
    if (isNaN(date.getTime())) return { isWarning: false };

    if (date.getDay() === 0) {
      return { isWarning: true, mensagem: 'Domingo' };
    }

    const feriado = feriados.find(f => f.data === dataStr);
    if (feriado) {
      return { isWarning: true, mensagem: feriado.nome };
    }

    return { isWarning: false };
  };

  return (
    <FeriadosContext.Provider value={{ feriados, isDiaWarning, loading }}>
      {children}
    </FeriadosContext.Provider>
  );
}

export function useFeriados() {
  const ctx = useContext(FeriadosContext);
  if (!ctx) {
    throw new Error('useFeriados must be used within a FeriadosProvider');
  }
  return ctx;
}
