// ---------------------------------------------------------------------------
// Modelo de plano (template). É o único sítio onde o conteúdo de um plano vive.
// A app não conhece nenhum plano em concreto: lê esta estrutura.
// ---------------------------------------------------------------------------

export interface PlanTemplate {
  /** Versão do formato do modelo, para evoluções futuras. */
  schemaVersion: 1;
  /** Identificador curto e estável, ex.: "nosi-100-dias". */
  id: string;
  name: string;
  institution: string;
  role: string;
  description?: string;
  /** Regra aplicada a cada semana, mostrada no plano. */
  goldenRule?: string;
  /** Horas previstas por semana (soma dos blocos). */
  weeklyHours: number;
  blockTypes: BlockType[];
  phases: Phase[];
  weeks: Week[];
  competencies: Competency[];
  scale: ScaleLevel[];
  assessmentMoments: AssessmentMoment[];
  /** Notas finais do plano (ex.: portefólio esperado). */
  closingNote?: string;
}

export interface BlockType {
  key: string;
  name: string;
  description: string;
  plannedHours: number;
  /** Se true, o registo do bloco pede três princípios úteis. */
  capturePrinciples?: boolean;
}

export interface Phase {
  number: number;
  name: string;
  objective: string;
  /** Semanas incluídas, ex.: [1, 3] = semanas 1 a 3. */
  weekRange: [number, number];
}

export interface Resource {
  title: string;
  author?: string;
  url?: string;
  /** Resumo em linguagem simples, escrito por pessoa ou por IA. */
  summary: string;
  /** Princípios-chave do recurso, para leitura rápida. */
  keyPoints?: string[];
}

export interface Week {
  number: number;
  title: string;
  objective: string;
  exercises: string[];
  deliverable: string;
  resource?: Resource;
}

export interface Competency {
  key: string;
  name: string;
  description: string;
}

export interface ScaleLevel {
  value: number;
  label: string;
}

export interface AssessmentMoment {
  key: string;
  label: string;
  /** Dia do plano (1 = dia de início). */
  day: number;
}

// ---------------------------------------------------------------------------
// Plano em curso e registos da pessoa (guardados no Supabase ou no browser).
// ---------------------------------------------------------------------------

export interface WeeklySlot {
  /** Chave do tipo de bloco. */
  blockKey: string;
  /** 1 = segunda ... 7 = domingo. */
  weekday: number;
  /** "HH:MM" */
  time: string;
  durationMinutes: number;
}

export interface PlanInstance {
  id: string;
  template: PlanTemplate;
  /** "AAAA-MM-DD": dia 1 do plano. */
  startDate: string;
  schedule: WeeklySlot[];
  createdAt: string;
}

export type Status = 'todo' | 'doing' | 'done';

export interface BlockLog {
  planId: string;
  week: number;
  blockKey: string;
  status: Status;
  hours: number;
  notes: string;
  /** Usado no bloco de aprendizagem: três princípios úteis. */
  principles: string[];
  updatedAt: string;
}

export interface Deliverable {
  planId: string;
  week: number;
  status: Status;
  link: string;
  deliveredOn: string | null;
  notes: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  planId: string;
  momentKey: string;
  assessedOn: string;
  /** chave da competência -> nota */
  scores: Record<string, number>;
  notes: string;
  createdAt: string;
}

export interface PlanData {
  plan: PlanInstance;
  blockLogs: BlockLog[];
  deliverables: Deliverable[];
  assessments: Assessment[];
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Por fazer',
  doing: 'Em curso',
  done: 'Feito',
};
