import { useState } from 'react';
import { downloadFile } from '../lib/files';
import { buildIcs } from '../lib/ics';
import { formatDate, planEndDate, WEEKDAY_NAMES } from '../lib/schedule';
import type { WeeklySlot } from '../lib/types';
import { store } from '../store';
import { usePlan, usePlanData } from '../state';
import Setup from './Setup';

export default function SettingsPage() {
  const data = usePlanData();
  const { updatePlan } = usePlan();
  const { plan } = data;
  const t = plan.template;
  const [startDate, setStartDate] = useState(plan.startDate);
  const [schedule, setSchedule] = useState<WeeklySlot[]>(plan.schedule);
  const [msg, setMsg] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState(false);

  if (newPlan) return <Setup onCancel={() => setNewPlan(false)} />;

  const blockName = (k: string) => t.blockTypes.find((b) => b.key === k)?.name ?? k;
  const dirty = startDate !== plan.startDate || JSON.stringify(schedule) !== JSON.stringify(plan.schedule);
  const slug = t.id || 'plano';

  function setSlot(i: number, patch: Partial<WeeklySlot>) {
    setSchedule(schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    await updatePlan({ ...plan, startDate, schedule });
    setMsg('Alterações guardadas. Descarregue de novo o calendário para atualizar os lembretes.');
  }

  return (
    <div className="stack">
      <div>
        <h1>Configuração</h1>
        <p className="muted" style={{ margin: 0 }}>
          {store.mode === 'local'
            ? 'Modo local: os dados ficam só neste browser. Configure o Supabase para os ter em todas as máquinas.'
            : 'Os dados estão guardados no Supabase e sincronizados entre máquinas.'}
        </p>
      </div>

      <div className="card stack">
        <h2>Plano em curso</h2>
        <div>
          <b>{t.name}</b>
          <div className="small muted">
            {t.institution} · {t.role} · {t.weeks.length} semanas
          </div>
        </div>
        <label className="field" style={{ maxWidth: 220 }}>
          Data do dia 1
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <span className="small muted">
          Termina a {formatDate(planEndDate(t, startDate))}. Ao mudar a data, as semanas e as avaliações são
          recalculadas; os registos mantêm-se.
        </span>
      </div>

      <div className="card stack">
        <h2>Agenda semanal dos blocos</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Usada no calendário de lembretes. Pode dividir um bloco em vários momentos acrescentando linhas.
        </p>
        <div className="table-wrap">
          <table className="score-grid">
            <thead>
              <tr>
                <th>Bloco</th>
                <th>Dia</th>
                <th>Hora</th>
                <th>Duração (min)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schedule.map((s, i) => (
                <tr key={i}>
                  <td style={{ minWidth: 170 }}>
                    <select value={s.blockKey} onChange={(e) => setSlot(i, { blockKey: e.target.value })}>
                      {t.blockTypes.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <select value={s.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <option key={d} value={d}>
                          {WEEKDAY_NAMES[d]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <input type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} />
                  </td>
                  <td style={{ minWidth: 90 }}>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={s.durationMinutes}
                      onChange={(e) => setSlot(i, { durationMinutes: Math.max(15, Number(e.target.value) || 15) })}
                    />
                  </td>
                  <td>
                    <button
                      className="btn small"
                      aria-label={`Remover ${blockName(s.blockKey)} de ${WEEKDAY_NAMES[s.weekday]}`}
                      onClick={() => setSchedule(schedule.filter((_, j) => j !== i))}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <button
            className="btn small"
            onClick={() =>
              setSchedule([
                ...schedule,
                { blockKey: t.blockTypes[0].key, weekday: 1, time: '08:00', durationMinutes: 60 },
              ])
            }
          >
            Acrescentar momento
          </button>
        </div>
        {t.blockTypes.map((b) => {
          const mins = schedule.filter((s) => s.blockKey === b.key).reduce((a, s) => a + s.durationMinutes, 0);
          return mins !== b.plannedHours * 60 ? (
            <div key={b.key} className="small muted">
              {b.name}: agendadas {mins / 60} h de {b.plannedHours} h previstas.
            </div>
          ) : null;
        })}
      </div>

      <div className="row">
        <button className="btn primary" disabled={!dirty} onClick={save}>
          Guardar alterações
        </button>
        {msg && <span className="small muted">{msg}</span>}
      </div>

      <div className="card stack">
        <h2>Lembretes e cópias</h2>
        <p className="small muted" style={{ margin: 0 }}>
          O calendário (.ics) tem os blocos de cada semana com lembrete 15 minutos antes, o prazo de cada entregável e as
          datas de autoavaliação. Importe-o no Outlook (Ficheiro &gt; Abrir e exportar &gt; Importar) ou no telemóvel.
        </p>
        <div className="row">
          <button
            className="btn"
            onClick={() => downloadFile(`${slug}-calendario.ics`, buildIcs(plan), 'text/calendar;charset=utf-8')}
          >
            Descarregar calendário (.ics)
          </button>
          <button
            className="btn"
            onClick={() =>
              downloadFile(`${slug}-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
            }
          >
            Exportar cópia de segurança
          </button>
          <button
            className="btn"
            onClick={() => downloadFile(`${slug}-modelo.json`, JSON.stringify(t, null, 2), 'application/json')}
          >
            Exportar modelo do plano
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>Outro plano</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Para uma nova integração ou outro cargo, carregue outro modelo. O plano atual fica arquivado.
        </p>
        <div>
          <button className="btn" onClick={() => setNewPlan(true)}>
            Iniciar outro plano…
          </button>
        </div>
      </div>
    </div>
  );
}
