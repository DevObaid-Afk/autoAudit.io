import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";

const TRAIL_COUNT = 14;

type CursorPoint = {
  x: number;
  y: number;
};

export function CustomCursor() {
  const { theme } = useTheme();
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const trailRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const targetRef = useRef<CursorPoint>({ x: -80, y: -80 });
  const trailPointsRef = useRef<CursorPoint[]>(Array.from({ length: TRAIL_COUNT }, () => ({ x: -80, y: -80 })));
  const isVisibleRef = useRef(false);
  const isInteractiveRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const [isInteractive, setInteractive] = useState(false);
  const [isFinePointer, setFinePointer] = useState(false);

  const colors = useMemo(() => {
    if (theme === "dark") {
      return {
        ring: "rgb(125 211 252)",
        trail: "rgb(56 189 248 / 0.26)",
        interactive: "rgb(16 185 129)",
        shadow: "0 0 28px rgb(56 189 248 / 0.26)",
      };
    }

    return {
      ring: "rgb(56 189 248)",
      trail: "rgb(10 16 24 / 0.18)",
      interactive: "rgb(245 158 11)",
      shadow: "0 0 22px rgb(56 189 248 / 0.18)",
    };
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const updatePointer = () => setFinePointer(media.matches);

    updatePointer();
    media.addEventListener("change", updatePointer);

    return () => media.removeEventListener("change", updatePointer);
  }, []);

  useEffect(() => {
    if (!isFinePointer) {
      document.documentElement.classList.remove("custom-cursor-enabled");
      return;
    }

    document.documentElement.classList.add("custom-cursor-enabled");

    const handleMove = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const nextInteractive = Boolean(target?.closest("button, a, input, textarea, select, label, [role='button']"));

      targetRef.current = { x: event.clientX, y: event.clientY };
      isVisibleRef.current = true;

      if (nextInteractive !== isInteractiveRef.current) {
        isInteractiveRef.current = nextInteractive;
        setInteractive(nextInteractive);
      }
    };

    const handleLeave = () => {
      isVisibleRef.current = false;
      targetRef.current = { x: -80, y: -80 };
    };

    const animate = () => {
      const target = targetRef.current;
      const points = trailPointsRef.current;
      const visible = isVisibleRef.current;
      const cursorSize = isInteractiveRef.current ? 34 : 28;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = visible ? "1" : "0";
        cursorRef.current.style.transform = `translate3d(${target.x - cursorSize / 2}px, ${target.y - cursorSize / 2}px, 0)`;
      }

      points.forEach((point, index) => {
        const leader = index === 0 ? target : points[index - 1];
        const ease = index === 0 ? 0.36 : 0.28;
        point.x += (leader.x - point.x) * ease;
        point.y += (leader.y - point.y) * ease;

        const node = trailRefs.current[index];
        if (!node) return;

        const size = 26 - index * 0.85;
        const opacity = visible ? Math.max(0, 0.34 - index * 0.018) : Math.max(0, Number(node.style.opacity || 0) - 0.035);

        node.style.opacity = String(opacity);
        node.style.transform = `translate3d(${point.x - size / 2}px, ${point.y - size / 2}px, 0) scale(${Math.max(0.28, 1 - index * 0.045)})`;
      });

      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      document.documentElement.classList.remove("custom-cursor-enabled");
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isFinePointer]);

  if (!isFinePointer) {
    return null;
  }

  return (
    <>
      {Array.from({ length: TRAIL_COUNT }).map((_, index) => {
        const size = 26 - index * 0.85;

        return (
          <span
            className="pointer-events-none fixed left-0 top-0 z-[9997] rounded-full will-change-transform"
            key={index}
            ref={(node) => {
              trailRefs.current[index] = node;
            }}
            style={{
              width: size,
              height: size,
              opacity: 0,
              background: colors.trail,
            }}
            aria-hidden="true"
          />
        );
      })}
      <span
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border will-change-transform transition-[width,height,border-color,box-shadow] duration-150 ease-out"
        ref={cursorRef}
        style={{
          width: isInteractive ? 34 : 28,
          height: isInteractive ? 34 : 28,
          opacity: 0,
          borderColor: isInteractive ? colors.interactive : colors.ring,
          background: "transparent",
          boxShadow: colors.shadow,
        }}
        aria-hidden="true"
      />
    </>
  );
}
