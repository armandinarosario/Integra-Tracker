import type { ReactNode } from 'react';

/** Sobrelinha, título em Gloock, filete âmbar e introdução: o padrão da marca. */
export function PageHeader({
  overline,
  title,
  lead,
  aside,
  display = false,
}: {
  overline?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  display?: boolean;
}) {
  return (
    <header className="page-head">
      {overline && <span className="overline">{overline}</span>}
      <div className="head-row">
        <h1 className={display ? 'display' : undefined}>{title}</h1>
        {aside}
      </div>
      <div className="rule" aria-hidden />
      {lead && <p className="lead">{lead}</p>}
    </header>
  );
}

export const BRAND_ICON = `${import.meta.env.BASE_URL}brand/icone-AR-quadrado.svg`;
export const BRAND_MONOGRAM_LIGHT = `${import.meta.env.BASE_URL}brand/monograma-AR-reforcado-areia.svg`;
