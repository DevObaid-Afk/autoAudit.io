import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";

export function CustomCursor() {
  const { theme } = useTheme();
  const [position, setPosition] = useState({ x: -40, y: -40 });
  const [isInteractive, setInteractive] = useState(false);
  const [isFinePointer, setFinePointer] = useState(false);

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
      setPosition({ x: event.clientX, y: event.clientY });
      setInteractive(Boolean((event.target as Element | null)?.closest("button, a, input, textarea, select, [role='button']")));
    };

    const handleLeave = () => setPosition({ x: -40, y: -40 });

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      document.documentElement.classList.remove("custom-cursor-enabled");
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [isFinePointer]);

  if (!isFinePointer) {
    return null;
  }

  const cursorFill = theme === "dark" ? "rgb(245 251 255)" : "rgb(23 32 38)";
  const cursorStroke = theme === "dark" ? "rgb(10 15 20)" : "rgb(255 255 255)";

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[9999] transition-transform duration-75 ease-out"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${isInteractive ? 1.14 : 1})`,
      }}
      aria-hidden="true"
    >
      <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
        <path
          d="M3 2.5 22.5 21.4l-9.2 1.4-4.8 8.1L3 2.5Z"
          fill={cursorFill}
          stroke={cursorStroke}
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

