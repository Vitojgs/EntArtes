import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Holidays = require('date-holidays');

const hd = new Holidays('PT', { timezone: 'Europe/Lisbon' });

function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export const getFeriados = (ano) => {
  const holidays = hd.getHolidays(ano);
  const feriados = [];

  for (const h of holidays) {
    if (h.type === 'public') {
      const dateObj = new Date(h.date);
      feriados.push({
        data: formatDateStr(dateObj),
        nome: h.name,
        tipo: 'NACIONAL',
      });
    }
  }

  feriados.push({
    data: `${ano}-06-24`,
    nome: 'São João (Feriado Municipal de Braga)',
    tipo: 'MUNICIPAL',
  });

  feriados.sort((a, b) => a.data.localeCompare(b.data));
  return feriados;
};
