import React, { useEffect, useRef, useState } from "react";
import { useAnimate } from "framer-motion";

// Change this date to your target countdown date (3 days from now)
const COUNTDOWN_FROM = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export default function ShiftingCountdown() {
  return (
    <div className="flex w-full items-center justify-center py-1 bg-transparent">
      <CountdownItem unit="Day" label="Days" />
      <CountdownItem unit="Hour" label="Hours" />
      <CountdownItem unit="Minute" label="Minutes" />
      <CountdownItem unit="Second" label="Seconds" />
    </div>
  );
}

function CountdownItem({ unit, label }) {
  const { ref, time } = useTimer(unit);
  // For seconds, ensure two digits (00–59)
  const display = unit === "Second" ? String(time).padStart(2, '0') : time;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 sm:px-3 py-2">
      <div className="relative w-full overflow-hidden text-center">
        <span
          ref={ref}
          className="block text-2xl sm:text-3xl font-mono font-bold text-tether-teal md:text-4xl transition-colors duration-500"
        >
          {display}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-widest transition-colors duration-500 mt-1">
        {label}
      </span>
      <div className="h-px w-[80%] bg-tether-teal/20 mt-1 transition-colors duration-500"></div>
    </div>
  );
}

function useTimer(unit) {
  const [ref, animate] = useAnimate();
  const intervalRef = useRef(null);
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    handleCountdown();
    intervalRef.current = setInterval(handleCountdown, 1000);
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountdown = async () => {
    const end = new Date(COUNTDOWN_FROM);
    const now = new Date();
    const distance = end - now;

    let newTime = 0;
    switch (unit) {
      case "Day":
        newTime = Math.max(0, Math.floor(distance / DAY));
        break;
      case "Hour":
        newTime = Math.max(0, Math.floor((distance % DAY) / HOUR));
        break;
      case "Minute":
        newTime = Math.max(0, Math.floor((distance % HOUR) / MINUTE));
        break;
      default:
        newTime = Math.max(0, Math.floor((distance % MINUTE) / SECOND));
    }

    if (newTime !== timeRef.current) {
      if (ref.current) {
        await animate(
          ref.current,
          { y: ["0%", "-50%"], opacity: [1, 0] },
          { duration: 0.35 }
        );

        timeRef.current = newTime;
        setTime(newTime);

        await animate(
          ref.current,
          { y: ["50%", "0%"], opacity: [0, 1] },
          { duration: 0.35 }
        );
      }
    }
  };

  return { ref, time };
}
