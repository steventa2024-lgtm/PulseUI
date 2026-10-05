import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** Wrap every page: scrolls to top on route changes (or to the #hash). */
export function PageLayout({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}
