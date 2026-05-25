"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1400, className }: Props) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let start = 0;
    let played = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        const tick = (t: number) => {
          if (!start) start = t;
          const p = Math.min((t - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.floor(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
          else setDisplay(value);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}
