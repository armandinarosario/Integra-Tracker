import type { Assessment, BlockLog, Deliverable, PlanData, PlanInstance, PlanTemplate, WeeklySlot } from '../lib/types';

/**
 * Onde os dados vivem. Há duas implementações:
 *  - SupabaseStore: dados na nuvem, acessíveis de qualquer máquina (com login);
 *  - LocalStore: dados só neste browser (modo de demonstração, sem configuração).
 */
export interface Store {
  readonly mode: 'local' | 'supabase';
  /** Plano em curso com todos os registos, ou null se ainda não há plano. */
  loadActive(): Promise<PlanData | null>;
  /** Inicia um plano novo; o anterior fica arquivado (não é apagado). */
  createPlan(template: PlanTemplate, startDate: string, schedule: WeeklySlot[]): Promise<PlanInstance>;
  updatePlan(plan: PlanInstance): Promise<void>;
  saveBlockLog(log: BlockLog): Promise<void>;
  saveDeliverable(d: Deliverable): Promise<void>;
  addAssessment(a: Assessment): Promise<void>;
  deleteAssessment(id: string): Promise<void>;
  /** Repõe uma cópia de segurança como plano em curso. */
  importBackup(data: PlanData): Promise<void>;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nowISO(): string {
  return new Date().toISOString();
}
