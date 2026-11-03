import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../shared/cn';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Renders its children only when the wrapper enters the viewport.
 * Falls back to an inert placeholder where IntersectionObserver is unavailable.
 */
export function LazySection({ children, className }: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!visible) {
    return (
      <div ref={ref} className={cn('w-full', className)}>
        <div aria-hidden="true" className="h-44 w-full" />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {children}
    </div>
  );
}
