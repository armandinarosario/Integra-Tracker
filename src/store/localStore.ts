import type { Assessment, BlockLog, Deliverable, PlanData, PlanInstance, PlanTemplate, WeeklySlot } from '../lib/types';
import { newId, nowISO, type Store } from './store';

const KEY = 'integra-tracker:v1';

interface LocalDb {
  plans: (PlanInstance & { archived: boolean })[];
  blockLogs: BlockLog[];
  deliverables: Deliverable[];
  assessments: Assessment[];
}

const empty = (): LocalDb => ({ plans: [], blockLogs: [], deliverables: [], assessments: [] });

/** Guarda tudo no localStorage deste browser. Útil para experimentar a app. */
export class LocalStore implements Store {
  readonly mode = 'local' as const;
  private memory: LocalDb | null = null;

  private read(): LocalDb {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...empty(), ...JSON.parse(raw) };
    } catch {
      /* storage indisponível: usa memória */
    }
    return this.memory ?? empty();
  }

  private write(db: LocalDb) {
    this.memory = db;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* storage indisponível: fica só em memória */
    }
  }

  async loadActive(): Promise<PlanData | null> {
    const db = this.read();
    const active = [...db.plans].reverse().find((p) => !p.archived);
    if (!active) return null;
    const { archived: _a, ...plan } = active;
    void _a;
    return {
      plan,
      blockLogs: db.blockLogs.filter((l) => l.planId === plan.id),
      deliverables: db.deliverables.filter((d) => d.planId === plan.id),
      assessments: db.assessments.filter((a) => a.planId === plan.id),
    };
  }

  async createPlan(template: PlanTemplate, startDate: string, schedule: WeeklySlot[]): Promise<PlanInstance> {
    const db = this.read();
    db.plans.forEach((p) => (p.archived = true));
    const plan: PlanInstance = { id: newId(), template, startDate, schedule, createdAt: nowISO() };
    db.plans.push({ ...plan, archived: false });
    this.write(db);
    return plan;
  }

  async updatePlan(plan: PlanInstance): Promise<void> {
    const db = this.read();
    db.plans = db.plans.map((p) => (p.id === plan.id ? { ...plan, archived: p.archived } : p));
    this.write(db);
  }

  async saveBlockLog(log: BlockLog): Promise<void> {
    const db = this.read();
    db.blockLogs = db.blockLogs.filter((l) => !(l.planId === log.planId && l.week === log.week && l.blockKey === log.blockKey));
    db.blockLogs.push(log);
    this.write(db);
  }

  async saveDeliverable(d: Deliverable): Promise<void> {
    const db = this.read();
    db.deliverables = db.deliverables.filter((x) => !(x.planId === d.planId && x.week === d.week));
    db.deliverables.push(d);
    this.write(db);
  }

  async addAssessment(a: Assessment): Promise<void> {
    const db = this.read();
    db.assessments.push(a);
    this.write(db);
  }

  async deleteAssessment(id: string): Promise<void> {
    const db = this.read();
    db.assessments = db.assessments.filter((a) => a.id !== id);
    this.write(db);
  }

  async importBackup(data: PlanData): Promise<void> {
    const db = this.read();
    const id = data.plan.id;
    db.plans = db.plans.filter((p) => p.id !== id).map((p) => ({ ...p, archived: true }));
    db.plans.push({ ...data.plan, archived: false });
    db.blockLogs = db.blockLogs.filter((l) => l.planId !== id).concat(data.blockLogs);
    db.deliverables = db.deliverables.filter((d) => d.planId !== id).concat(data.deliverables);
    db.assessments = db.assessments.filter((a) => a.planId !== id).concat(data.assessments);
    this.write(db);
  }
}
