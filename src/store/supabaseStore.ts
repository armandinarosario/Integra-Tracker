import type { SupabaseClient } from '@supabase/supabase-js';
import type { Assessment, BlockLog, Deliverable, PlanData, PlanInstance, PlanTemplate, Status, WeeklySlot } from '../lib/types';
import { nowISO, type Store } from './store';

// Linhas tal como existem na base de dados (snake_case).
interface PlanRow {
  id: string;
  template: PlanTemplate;
  start_date: string;
  schedule: WeeklySlot[];
  created_at: string;
}
interface LogRow {
  plan_id: string;
  week: number;
  block_key: string;
  status: Status;
  hours: number | string;
  notes: string;
  principles: string[];
  updated_at: string;
}
interface DelivRow {
  plan_id: string;
  week: number;
  status: Status;
  link: string;
  delivered_on: string | null;
  notes: string;
  updated_at: string;
}
interface AssessRow {
  id: string;
  plan_id: string;
  moment_key: string;
  assessed_on: string;
  scores: Record<string, number>;
  notes: string;
  created_at: string;
}

const toPlan = (r: PlanRow): PlanInstance => ({
  id: r.id,
  template: r.template,
  startDate: r.start_date,
  schedule: r.schedule ?? [],
  createdAt: r.created_at,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseStore implements Store {
  readonly mode = 'supabase' as const;
  constructor(private db: SupabaseClient) {}

  async loadActive(): Promise<PlanData | null> {
    const plans = check(
      await this.db.from('plans').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(1),
    ) as PlanRow[];
    if (!plans.length) return null;
    const plan = toPlan(plans[0]);
    const [logs, delivs, assess] = await Promise.all([
      this.db.from('block_logs').select('*').eq('plan_id', plan.id),
      this.db.from('deliverables').select('*').eq('plan_id', plan.id),
      this.db.from('assessments').select('*').eq('plan_id', plan.id).order('assessed_on'),
    ]);
    return {
      plan,
      blockLogs: (check(logs) as LogRow[]).map((r) => ({
        planId: r.plan_id,
        week: r.week,
        blockKey: r.block_key,
        status: r.status,
        hours: Number(r.hours),
        notes: r.notes,
        principles: r.principles ?? [],
        updatedAt: r.updated_at,
      })),
      deliverables: (check(delivs) as DelivRow[]).map((r) => ({
        planId: r.plan_id,
        week: r.week,
        status: r.status,
        link: r.link,
        deliveredOn: r.delivered_on,
        notes: r.notes,
        updatedAt: r.updated_at,
      })),
      assessments: (check(assess) as AssessRow[]).map((r) => ({
        id: r.id,
        planId: r.plan_id,
        momentKey: r.moment_key,
        assessedOn: r.assessed_on,
        scores: r.scores,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    };
  }

  async createPlan(template: PlanTemplate, startDate: string, schedule: WeeklySlot[]): Promise<PlanInstance> {
    check(await this.db.from('plans').update({ archived: true }).eq('archived', false));
    const row = check(
      await this.db.from('plans').insert({ template, start_date: startDate, schedule }).select('*').single(),
    ) as PlanRow;
    return toPlan(row);
  }

  async updatePlan(plan: PlanInstance): Promise<void> {
    check(
      await this.db
        .from('plans')
        .update({ template: plan.template, start_date: plan.startDate, schedule: plan.schedule })
        .eq('id', plan.id),
    );
  }

  async saveBlockLog(l: BlockLog): Promise<void> {
    check(
      await this.db.from('block_logs').upsert({
        plan_id: l.planId,
        week: l.week,
        block_key: l.blockKey,
        status: l.status,
        hours: l.hours,
        notes: l.notes,
        principles: l.principles,
        updated_at: nowISO(),
      }),
    );
  }

  async saveDeliverable(d: Deliverable): Promise<void> {
    check(
      await this.db.from('deliverables').upsert({
        plan_id: d.planId,
        week: d.week,
        status: d.status,
        link: d.link,
        delivered_on: d.deliveredOn,
        notes: d.notes,
        updated_at: nowISO(),
      }),
    );
  }

  async addAssessment(a: Assessment): Promise<void> {
    check(
      await this.db.from('assessments').insert({
        id: a.id,
        plan_id: a.planId,
        moment_key: a.momentKey,
        assessed_on: a.assessedOn,
        scores: a.scores,
        notes: a.notes,
      }),
    );
  }

  async deleteAssessment(id: string): Promise<void> {
    check(await this.db.from('assessments').delete().eq('id', id));
  }

  async importBackup(data: PlanData): Promise<void> {
    check(await this.db.from('plans').update({ archived: true }).eq('archived', false));
    const { plan } = data;
    check(
      await this.db.from('plans').upsert({
        id: plan.id,
        template: plan.template,
        start_date: plan.startDate,
        schedule: plan.schedule,
        archived: false,
      }),
    );
    for (const l of data.blockLogs) await this.saveBlockLog({ ...l, planId: plan.id });
    for (const d of data.deliverables) await this.saveDeliverable({ ...d, planId: plan.id });
    for (const a of data.assessments) {
      check(
        await this.db.from('assessments').upsert({
          id: a.id,
          plan_id: plan.id,
          moment_key: a.momentKey,
          assessed_on: a.assessedOn,
          scores: a.scores,
          notes: a.notes,
        }),
      );
    }
  }
}
