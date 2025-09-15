import { useEffect, useState } from 'react';

export function useIsDesktop(query = '(min-width: 1024px)') {
  const [isDesktop, set] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.matchMedia(query).matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia(query);
    const on = () => set(m.matches);
    // modern + legacy fallback
    // @ts-ignore
    (m.addEventListener ? m.addEventListener('change', on) : m.addListener(on));
    on();
    return () => {
      // @ts-ignore
      (m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on));
    };
  }, [query]);
  return isDesktop;
}

export default useIsDesktop;

