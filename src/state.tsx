import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Assessment, BlockLog, Deliverable, PlanData, PlanInstance } from './lib/types';
import { store } from './store';

interface Ctx {
  data: PlanData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveBlockLog: (l: BlockLog) => Promise<void>;
  saveDeliverable: (d: Deliverable) => Promise<void>;
  addAssessment: (a: Assessment) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  updatePlan: (p: PlanInstance) => Promise<void>;
}

const PlanContext = createContext<Ctx | null>(null);

export function usePlan(): Ctx {
  const c = useContext(PlanContext);
  if (!c) throw new Error('usePlan fora do PlanProvider');
  return c;
}

/** Plano garantidamente carregado (usar só dentro das páginas do plano). */
export function usePlanData(): PlanData {
  const { data } = usePlan();
  if (!data) throw new Error('Sem plano carregado');
  return data;
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await store.loadActive());
      setError(null);
    } catch (e) {
      setError(`Não foi possível carregar os dados: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Atualiza o ecrã de imediato e grava em segundo plano; em caso de erro, recarrega.
  const run = useCallback(
    async (apply: (d: PlanData) => PlanData, persist: () => Promise<void>) => {
      setData((d) => (d ? apply(d) : d));
      try {
        await persist();
        setError(null);
      } catch (e) {
        setError(`Não foi possível guardar: ${(e as Error).message}`);
        await reload();
      }
    },
    [reload],
  );

  const value: Ctx = {
    data,
    loading,
    error,
    reload,
    saveBlockLog: (l) =>
      run(
        (d) => ({
          ...d,
          blockLogs: [...d.blockLogs.filter((x) => !(x.week === l.week && x.blockKey === l.blockKey)), l],
        }),
        () => store.saveBlockLog(l),
      ),
    saveDeliverable: (dv) =>
      run((d) => ({ ...d, deliverables: [...d.deliverables.filter((x) => x.week !== dv.week), dv] }), () => store.saveDeliverable(dv)),
    addAssessment: (a) => run((d) => ({ ...d, assessments: [...d.assessments, a] }), () => store.addAssessment(a)),
    deleteAssessment: (id) =>
      run((d) => ({ ...d, assessments: d.assessments.filter((a) => a.id !== id) }), () => store.deleteAssessment(id)),
    updatePlan: (p) => run((d) => ({ ...d, plan: p }), () => store.updatePlan(p)),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
