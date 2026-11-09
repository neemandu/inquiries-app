import { Fragment } from 'react';

export interface Crumb {
  label: string;
  onClick?: () => void;
}

// Breadcrumbs from the home screen to the current page; the last crumb is the current page
export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="מיקום בעמוד" className="flex w-full flex-wrap items-center gap-2 text-[14px] leading-[normal]">
      {crumbs.map(({ label, onClick }, i) => {
        const isCurrent = i === crumbs.length - 1;
        return (
          <Fragment key={`${label}-${i}`}>
            {i > 0 && <span className="text-[#9ca3af]">/</span>}
            {isCurrent ? (
              <span aria-current="page" className="font-semibold text-[#1e3465]">{label}</span>
            ) : (
              <button type="button" onClick={onClick} className="text-[#9ca3af]">{label}</button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
