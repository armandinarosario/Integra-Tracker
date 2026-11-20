import { useEffect, useRef, useState } from 'react';

/** Largura real do contentor, para desenhar o gráfico em píxeis (texto sempre legível). */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const fmtH = (h: number) => h.toLocaleString('pt-PT', { maximumFractionDigits: 1 });

interface Tip {
  x: number;
  y: number;
  content: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Horas feitas por semana (barras) com a referência das horas previstas.
// ---------------------------------------------------------------------------

export interface WeekHours {
  week: number;
  hours: number;
  planned: number;
  isCurrent: boolean;
  isFuture: boolean;
}

export function HoursChart({ data }: { data: WeekHours[] }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [ref, W] = useWidth();
  const H = W < 520 ? 200 : 240;
  const m = { t: 12, r: 8, b: 26, l: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const planned = Math.max(...data.map((d) => d.planned), 1);
  const maxV = Math.max(planned * 1.3, ...data.map((d) => d.hours));
  const step = maxV > 20 ? 10 : 5;
  const top = Math.ceil(maxV / step) * step;
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const band = iw / data.length;
  const bw = Math.min(28, band * 0.6);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--series-1)' }} /> Horas feitas
        </span>
        <span>
          <i className="line" /> Previsto ({fmtH(planned)} h)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Horas feitas por semana">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = m.l + band * i + band / 2;
          const h = Math.max(0, y(0) - y(d.hours));
          const r = Math.min(4, h / 2, bw / 2);
          const x0 = cx - bw / 2;
          const yTop = y(d.hours);
          // Barra com cantos arredondados só no topo, ancorada à base.
          const path =
            h > 0
              ? `M${x0},${y(0)} L${x0},${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} L${x0 + bw - r},${yTop} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r} L${x0 + bw},${y(0)} Z`
              : '';
          return (
            <g key={d.week}>
              {path && <path d={path} fill="var(--series-1)" opacity={d.isCurrent ? 0.55 : 1} />}
              {(band >= 30 || d.week % 2 === 1 || d.isCurrent) && <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                style={d.isCurrent ? { fill: 'var(--text)', fontWeight: 700 } : undefined}
              >
                S{d.week}
              </text>}
              <rect
                x={m.l + band * i}
                y={m.t}
                width={band}
                height={ih}
                fill="transparent"
                onMouseMove={() =>
                  setTip({
                    x: ((cx) / W) * 100,
                    y: (Math.min(yTop, y(d.planned)) / H) * 100,
                    content: (
                      <>
                        Semana {d.week}
                        {d.isCurrent ? ' (atual)' : ''}: <b>{fmtH(d.hours)} h</b> de {fmtH(d.planned)} h
                      </>
                    ),
                  })
                }
              />
            </g>
          );
        })}
        <line
          x1={m.l}
          x2={W - m.r}
          y1={y(planned)}
          y2={y(planned)}
          stroke="var(--text-3)"
          strokeWidth={2}
          strokeDasharray="5 4"
          pointerEvents="none"
        />
        <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke="var(--text-3)" strokeWidth={1} />
      </svg>
      {tip && (
        <div className="tooltip" style={{ left: `${tip.x}%`, top: `calc(${tip.y}% + 22px)` }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evolução das competências: um ponto por momento de avaliação, por competência.
// ---------------------------------------------------------------------------

export interface CompetencySeries {
  key: string;
  label: string;
  scores: Record<string, number>;
}

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

export function CompetencyChart({
  competencies,
  series,
  scaleMax,
}: {
  competencies: { key: string; name: string }[];
  series: CompetencySeries[];
  scaleMax: number;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [ref, W] = useWidth();
  const narrow = W < 560;
  // Até três momentos ficam distinguíveis por cor; os anteriores dobram-se nos três mais recentes.
  const shown = series.slice(-3);
  const rowH = narrow ? 50 : 36;
  const m = { t: 8, r: 16, b: 26, l: narrow ? 16 : 200 };
  const H = m.t + competencies.length * rowH + m.b;
  const iw = W - m.l - m.r;
  const x = (v: number) => m.l + ((v - 1) / (scaleMax - 1)) * iw;
  const ticks = Array.from({ length: scaleMax }, (_, i) => i + 1);

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="legend" style={{ margin: 0 }}>
          {shown.map((s, i) => (
            <span key={s.key}>
              <i style={{ background: SERIES[i] }} /> {s.label}
            </span>
          ))}
        </div>
        <div className="seg">
          <button className={!asTable ? 'on' : ''} onClick={() => setAsTable(false)}>
            Gráfico
          </button>
          <button className={asTable ? 'on' : ''} onClick={() => setAsTable(true)}>
            Tabela
          </button>
        </div>
      </div>
      {asTable ? (
        <div className="table-wrap">
          <table className="score-grid">
            <thead>
              <tr>
                <th>Competência</th>
                {series.map((s) => (
                  <th key={s.key} className="num">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencies.map((c) => (
                <tr key={c.key}>
                  <td>{c.name}</td>
                  {series.map((s) => (
                    <td key={s.key} className="num">
                      {s.scores[c.key] ?? '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução das competências por momento de avaliação">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} stroke="var(--grid)" strokeWidth={1} />
              <text x={x(t)} y={H - 8} textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {competencies.map((c, ci) => {
            const cy = m.t + ci * rowH + (narrow ? rowH - 14 : rowH / 2);
            const vals = shown.map((s) => s.scores[c.key]).filter((v): v is number => typeof v === 'number');
            return (
              <g key={c.key}>
                <text
                  x={narrow ? 0 : m.l - 12}
                  y={narrow ? cy - 14 : cy + 4}
                  textAnchor={narrow ? 'start' : 'end'}
                  style={{ fill: 'var(--text)', fontSize: 12 }}
                >
                  {c.name}
                </text>
                {vals.length > 1 && (
                  <line
                    x1={x(Math.min(...vals))}
                    x2={x(Math.max(...vals))}
                    y1={cy}
                    y2={cy}
                    stroke="var(--text-3)"
                    strokeWidth={2}
                  />
                )}
                {shown.map((s, si) => {
                  const v = s.scores[c.key];
                  if (typeof v !== 'number') return null;
                  // Pontos com o mesmo valor ficam ligeiramente desfasados na vertical.
                  const tied = shown.filter((o) => o.scores[c.key] === v);
                  const idx = tied.indexOf(s);
                  const dy = (idx - (tied.length - 1) / 2) * 11;
                  return (
                    <circle
                      key={s.key}
                      cx={x(v)}
                      cy={cy + dy}
                      r={6}
                      fill={SERIES[si]}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      onMouseMove={() =>
                        setTip({
                          x: (x(v) / W) * 100,
                          y: ((cy + dy - 8) / H) * 100,
                          content: (
                            <>
                              {c.name} · {s.label}: <b>{v}</b>
                            </>
                          ),
                        })
                      }
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
      {tip && !asTable && (
        <div className="tooltip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}
