import { useEffect, useRef, useState } from 'react';
import { WeekStatePill } from '../components/StatusPill';
import { PageHeader } from '../components/PageHeader';
import { IconArrowLeft, IconArrowRight, IconExternal, IconLock } from '../components/Icons';
import { findDeliverable, findLog, weekHours, weekState } from '../lib/progress';
import { go } from '../lib/router';
import { currentWeek, formatShort, todayISO, weekEndDate, weekStartDate } from '../lib/schedule';
import { STATUS_LABEL, type BlockLog, type BlockType, type Deliverable, type Status } from '../lib/types';
import { nowISO } from '../store/store';
import { usePlan, usePlanData } from '../state';

const STATUSES: Status[] = ['todo', 'doing', 'done'];

/**
 * Guarda automaticamente 700 ms depois da última alteração. Se a pessoa sair
 * da página antes disso, guarda de imediato para não perder o que escreveu.
 */
function useAutosave(save: () => void, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const savedKey = useRef(key);
  const saveRef = useRef(save);
  saveRef.current = save;
  const latestKey = useRef(key);
  latestKey.current = key;
  const [pending, setPending] = useState(false);

  const flush = () => {
    if (latestKey.current === savedKey.current) return;
    savedKey.current = latestKey.current;
    saveRef.current();
  };

  useEffect(() => {
    if (key === savedKey.current) return;
    setPending(true);
    const id = setTimeout(() => {
      flush();
      setPending(false);
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), []);
  return pending;
}

/** Janela de confirmação com o estilo da app. */
function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="confirm" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <span className="overline">Confirmar</span>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn primary" onClick={onConfirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/**
 * Estado com confirmação: "Feito" só fica disponível com evidências e pede
 * confirmação; depois o registo fica bloqueado até ser reaberto.
 */
function StatusControl({
  value,
  onChange,
  canFinish,
  missing,
  what,
}: {
  value: Status;
  onChange: (s: Status) => void;
  canFinish: boolean;
  missing: string;
  what: string;
}) {
  const [ask, setAsk] = useState<'done' | 'reopen' | null>(null);
  const done = value === 'done';
  return (
    <>
      {done ? (
        <div className="locked-bar">
          <span className="locked-label">
            <IconLock /> Concluído e bloqueado
          </span>
          <button className="btn small ghost" onClick={() => setAsk('reopen')}>
            Reabrir
          </button>
        </div>
      ) : (
        <div className="stack-sm" style={{ gap: 6 }}>
          <div className="seg fill" role="group" aria-label="Estado">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={value === s ? 'on' : ''}
                aria-pressed={value === s}
                disabled={s === 'done' && !canFinish}
                title={s === 'done' && !canFinish ? missing : undefined}
                onClick={() => (s === 'done' ? setAsk('done') : onChange(s))}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {!canFinish && <span className="small muted">{missing}</span>}
        </div>
      )}
      <ConfirmDialog
        open={ask === 'done'}
        title={`Concluir ${what}?`}
        body="Confirme que a atividade está concluída e que as evidências estão registadas. Depois de confirmar, o registo fica bloqueado."
        confirmLabel="Sim, está concluída"
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          setAsk(null);
          onChange('done');
        }}
      />
      <ConfirmDialog
        open={ask === 'reopen'}
        title={`Reabrir ${what}?`}
        body="O registo volta a ficar editável, com o estado Em curso, e deixa de contar como concluído até o voltar a fechar."
        confirmLabel="Reabrir"
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          setAsk(null);
          onChange('doing');
        }}
      />
    </>
  );
}

function BlockEditor({ planId, week, block }: { planId: string; week: number; block: BlockType }) {
  const { data, saveBlockLog } = usePlan();
  const existing = findLog(data!.blockLogs, week, block.key);
  const [status, setStatus] = useState<Status>(existing?.status ?? 'todo');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [principles, setPrinciples] = useState<string[]>(existing?.principles?.length ? existing.principles : ['', '', '']);
  const locked = status === 'done';

  const build = (): BlockLog => ({
    planId,
    week,
    blockKey: block.key,
    status,
    // As horas não se registam: um bloco concluído conta com as horas previstas.
    hours: status === 'done' ? block.plannedHours : 0,
    notes,
    principles: block.capturePrinciples ? principles : [],
    updatedAt: nowISO(),
  });
  const pending = useAutosave(() => saveBlockLog(build()), [status, notes, principles.join('\u0001')]);

  const missingPrinciples = block.capturePrinciples ? principles.filter((p) => !p.trim()).length : 0;
  const hasNotes = notes.trim().length > 0;
  const canFinish = hasNotes && missingPrinciples === 0;
  const missing = [
    block.capturePrinciples && missingPrinciples > 0 ? 'os três princípios' : null,
    !hasNotes ? 'as evidências' : null,
  ]
    .filter(Boolean)
    .join(' e ');

  return (
    <div className={`block-card${locked ? ' locked' : ''}`}>
      <div className="block-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="overline">{block.plannedHours} h previstas</span>
          <h3>{block.name}</h3>
          <span className="small muted">{block.description}</span>
        </div>
        {pending && <span className="saving">A guardar…</span>}
      </div>
      <StatusControl
        value={status}
        onChange={setStatus}
        canFinish={canFinish}
        missing={`Para marcar como Feito, registe ${missing}.`}
        what={`o bloco ${block.name}`}
      />
      {block.capturePrinciples && (
        <div className="stack-sm" style={{ gap: 8 }}>
          <span className="small muted" style={{ fontWeight: 600 }}>
            Três princípios úteis
          </span>
          {principles.map((p, i) => (
            <input
              key={i}
              value={p}
              disabled={locked}
              placeholder={`Princípio ${i + 1}`}
              aria-label={`Princípio ${i + 1}`}
              onChange={(e) => setPrinciples(principles.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
      )}
      <label className="field">
        Evidências: o que fez e o que concluiu
        <textarea
          value={notes}
          disabled={locked}
          placeholder="Por exemplo: li o capítulo 2, preparei a nota para o caso X, ligação para o rascunho…"
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
    </div>
  );
}

function DeliverableEditor({ planId, week, description }: { planId: string; week: number; description: string }) {
  const { data, saveDeliverable } = usePlan();
  const existing = findDeliverable(data!.deliverables, week);
  const [status, setStatus] = useState<Status>(existing?.status ?? 'todo');
  const [link, setLink] = useState(existing?.link ?? '');
  const [deliveredOn, setDeliveredOn] = useState(existing?.deliveredOn ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const locked = status === 'done';

  const build = (): Deliverable => ({
    planId,
    week,
    status,
    link: link.trim(),
    deliveredOn: deliveredOn || null,
    notes,
    updatedAt: nowISO(),
  });
  const pending = useAutosave(() => saveDeliverable(build()), [status, link, deliveredOn, notes]);
  const isUrl = /^https?:\/\//i.test(link.trim());

  return (
    <div className={`block-card deliverable${locked ? ' locked' : ''}`}>
      <div className="block-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="overline">Entregável da semana</span>
          <h3>{description}</h3>
        </div>
        {pending && <span className="saving">A guardar…</span>}
      </div>
      <StatusControl
        value={status}
        onChange={(s) => {
          setStatus(s);
          if (s === 'done' && !deliveredOn) setDeliveredOn(todayISO());
        }}
        canFinish={link.trim().length > 0}
        missing="Para marcar como Feito, registe a ligação para o entregável."
        what="o entregável"
      />
      <label className="field">
        Evidência: ligação para o ficheiro (OneDrive, SharePoint ou caminho na pasta)
        <input
          value={link}
          disabled={locked}
          placeholder="https://… ou D:\Integra-Tracker\…"
          onChange={(e) => setLink(e.target.value)}
        />
      </label>
      {link && (
        <span className="small">
          {isUrl ? (
            <a href={link.trim()} target="_blank" rel="noreferrer" className="row" style={{ display: 'inline-flex', gap: 6 }}>
              Abrir o entregável <IconExternal />
            </a>
          ) : (
            <span className="muted">Caminho local: abra-o a partir do explorador de ficheiros.</span>
          )}
        </span>
      )}
      <label className="inline-field">
        Entregue em
        <input type="date" value={deliveredOn} disabled={locked} onChange={(e) => setDeliveredOn(e.target.value)} />
      </label>
      <label className="field">
        Notas
        <textarea value={notes} disabled={locked} onChange={(e) => setNotes(e.target.value)} />
      </label>
    </div>
  );
}

export default function WeekPage({ week }: { week?: number }) {
  const data = usePlanData();
  const { plan, blockLogs } = data;
  const t = plan.template;
  const today = todayISO();
  const total = t.weeks.length;
  const n = week ?? Math.min(Math.max(currentWeek(plan.startDate, today, total), 1), total);
  const w = t.weeks.find((x) => x.number === n);
  if (!w) return <p>Semana inexistente.</p>;
  const phase = t.phases.find((p) => n >= p.weekRange[0] && n <= p.weekRange[1]);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="week-nav">
          <button className="btn icon" disabled={n <= 1} onClick={() => go(`/semana/${n - 1}`)} aria-label="Semana anterior">
            <IconArrowLeft />
          </button>
          <select value={n} onChange={(e) => go(`/semana/${e.target.value}`)} aria-label="Escolher semana">
            {t.weeks.map((x) => (
              <option key={x.number} value={x.number}>
                Semana {x.number}
              </option>
            ))}
          </select>
          <button className="btn icon" disabled={n >= total} onClick={() => go(`/semana/${n + 1}`)} aria-label="Semana seguinte">
            <IconArrowRight />
          </button>
        </div>
        <WeekStatePill state={weekState(data, n, today)} />
      </div>

      <PageHeader
        overline={`${phase ? `Fase ${phase.number} · ` : ''}Semana ${n} · ${formatShort(weekStartDate(plan.startDate, n))} a ${formatShort(
          weekEndDate(plan.startDate, n),
        )}`}
        title={w.title}
        lead={
          <>
            {w.objective}{' '}
            <span className="small" style={{ whiteSpace: 'nowrap' }}>
              ({weekHours(blockLogs, n).toLocaleString('pt-PT')} de {t.weeklyHours} h)
            </span>
          </>
        }
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <span className="overline">Exercício prático</span>
          <div style={{ height: 16 }} />
          <ol className="exercise-list">
            {w.exercises.map((e) => (
              <li key={e}>
                <span>{e}</span>
              </li>
            ))}
          </ol>
        </section>
        {w.resource && (
          <section className="resource">
            <span className="overline">Recurso da semana</span>
            <h2>
              {w.resource.url ? (
                <a href={w.resource.url} target="_blank" rel="noreferrer">
                  {w.resource.title}
                </a>
              ) : (
                w.resource.title
              )}
            </h2>
            {w.resource.author && <div className="small muted">{w.resource.author}</div>}
            <div className="rule" aria-hidden />
            <p className="small" style={{ lineHeight: '21px' }}>{w.resource.summary}</p>
            {w.resource.keyPoints && (
              <ul className="small" style={{ lineHeight: '21px' }}>
                {w.resource.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* key = semana: ao mudar de semana, os formulários recomeçam com os dados certos */}
      <div className="stack" key={n} style={{ gap: 16 }}>
        <DeliverableEditor planId={plan.id} week={n} description={w.deliverable} />
        {t.blockTypes.map((b) => (
          <BlockEditor key={b.key} planId={plan.id} week={n} block={b} />
        ))}
      </div>
    </div>
  );
}
