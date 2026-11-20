import { useState } from 'react';
import { downloadFile } from '../lib/files';
import { buildIcs } from '../lib/ics';
import { formatDate, planEndDate, WEEKDAY_NAMES } from '../lib/schedule';
import type { WeeklySlot } from '../lib/types';
import { store, supabase } from '../store';
import { PageHeader } from '../components/PageHeader';
import { IconLogout } from '../components/Icons';
import { getTheme, setThemePref, type ThemePref } from '../lib/theme';
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
  const [theme, setThemeState] = useState<ThemePref>(getTheme());
  const setTheme = (t: ThemePref) => {
    setThemePref(t);
    setThemeState(t);
  };

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
      <PageHeader
        overline="Configuração"
        title="Ajustes do plano"
        lead={
          store.mode === 'local'
            ? 'Modo local: os dados ficam só neste browser. Configure o Supabase para os ter em todas as máquinas.'
            : 'Os dados estão guardados no Supabase e sincronizados entre as suas máquinas.'
        }
      />

      <section className="card stack">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="overline">Plano em curso</span>
          <h2>{t.name}</h2>
          <span className="muted small">
            {t.institution} · {t.role} · {t.weeks.length} semanas
          </span>
        </div>
        <label className="field" style={{ maxWidth: 240 }}>
          Data do dia 1
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <span className="small muted">
          Termina a {formatDate(planEndDate(t, startDate))}. Ao mudar a data, as semanas e as avaliações são recalculadas; os
          registos mantêm-se.
        </span>
      </section>

      <section className="card stack">
        <div className="stack-sm" style={{ gap: 4 }}>
          <h2>Agenda semanal dos blocos</h2>
          <span className="small muted">
            Usada no calendário de lembretes. Pode dividir um bloco em vários momentos acrescentando linhas.
          </span>
        </div>
        <div className="slot-list">
          <div className="slot-labels" aria-hidden>
            <span>Bloco</span>
            <span>Dia</span>
            <span>Hora</span>
            <span>Minutos</span>
            <span />
          </div>
          {schedule.map((s, i) => (
            <div className="slot" key={i}>
              <select aria-label="Bloco" value={s.blockKey} onChange={(e) => setSlot(i, { blockKey: e.target.value })}>
                {t.blockTypes.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select aria-label="Dia" value={s.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAY_NAMES[d]}
                  </option>
                ))}
              </select>
              <input aria-label="Hora" type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} />
              <input
                aria-label="Duração em minutos"
                type="number"
                min={15}
                step={15}
                value={s.durationMinutes}
                onChange={(e) => setSlot(i, { durationMinutes: Math.max(15, Number(e.target.value) || 15) })}
              />
              <button
                className="btn small"
                aria-label={`Remover ${blockName(s.blockKey)} de ${WEEKDAY_NAMES[s.weekday]}`}
                onClick={() => setSchedule(schedule.filter((_, j) => j !== i))}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        <div>
          <button
            className="btn small"
            onClick={() =>
              setSchedule([...schedule, { blockKey: t.blockTypes[0].key, weekday: 1, time: '08:00', durationMinutes: 60 }])
            }
          >
            Acrescentar momento
          </button>
        </div>
        {t.blockTypes.map((b) => {
          const mins = schedule.filter((s) => s.blockKey === b.key).reduce((a, s) => a + s.durationMinutes, 0);
          return mins !== b.plannedHours * 60 ? (
            <div key={b.key} className="small muted">
              {b.name}: agendadas {(mins / 60).toLocaleString('pt-PT')} h de {b.plannedHours} h previstas.
            </div>
          ) : null;
        })}
      </section>

      <div className="row">
        <button className="btn primary" disabled={!dirty} onClick={save}>
          Guardar alterações
        </button>
        {msg && <span className="small muted">{msg}</span>}
      </div>

      <section className="card stack">
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
      </section>

      <section className="card stack">
        <h2>Aparência</h2>
        <div className="seg" role="group" aria-label="Tema">
          {(
            [
              ['auto', 'Automático'],
              ['light', 'Areia'],
              ['dark', 'Petróleo'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={theme === k ? 'on' : ''} aria-pressed={theme === k} onClick={() => setTheme(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="small muted">Automático segue o modo claro ou escuro do computador ou do telemóvel.</span>
      </section>

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

      {supabase && (
        <div>
          <button className="btn" onClick={() => supabase!.auth.signOut()}>
            <IconLogout /> Terminar sessão
          </button>
        </div>
      )}
    </div>
  );
}
