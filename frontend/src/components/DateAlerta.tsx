import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useFeriados } from '../contexts/FeriadosContext';

interface DateAlertaProps {
  data: string;
  children?: ReactNode;
  showIcon?: boolean;
  className?: string;
}

export function DateAlerta({ data, children, showIcon = true, className = '' }: DateAlertaProps) {
  const { isDiaWarning } = useFeriados();
  const warning = isDiaWarning(data);

  if (!warning.isWarning) {
    return <>{children}</>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={warning.mensagem}>
      {showIcon && (
        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
      )}
      {children}
      <span className="text-[10px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
        {warning.mensagem}
      </span>
    </span>
  );
}

export function DateWarningIcon({ data }: { data: string }) {
  const { isDiaWarning } = useFeriados();
  const warning = isDiaWarning(data);

  if (!warning.isWarning) return null;

  return (
    <span title={warning.mensagem} className="inline-flex items-center gap-0.5">
      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      <span className="text-[10px] font-semibold text-red-600">{warning.mensagem}</span>
    </span>
  );
}
