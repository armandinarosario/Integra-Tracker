import { WEEK_STATE_LABEL, type WeekState } from '../lib/progress';
import { STATUS_LABEL, type Status } from '../lib/types';

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill ${status}`}>
      <span className="dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function WeekStatePill({ state }: { state: WeekState }) {
  return (
    <span className={`pill ${state}`}>
      <span className="dot" aria-hidden />
      {WEEK_STATE_LABEL[state]}
    </span>
  );
}
