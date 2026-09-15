'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetHour?: number;
  className?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function getTargetTimestamp(targetHour: number = 18): number {
  try {
    const now = new Date();
    const arFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = arFormatter.formatToParts(now);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || String(now.getFullYear()), 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || String(now.getMonth() + 1), 10) - 1;
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || String(now.getDate()), 10);

    // Argentina is UTC-3 (18:00 ART = 21:00 UTC)
    return Date.UTC(year, month, day, targetHour + 3, 0, 0);
  } catch {
    const fallback = new Date();
    fallback.setHours(targetHour, 0, 0, 0);
    return fallback.getTime();
  }
}

function calculateTimeLeft(targetTime: number): TimeLeft {
  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, isExpired: false };
}

export function CountdownTimer({ targetHour = 18, className = '' }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    setMounted(true);
    const targetTimestamp = getTargetTimestamp(targetHour);
    setTimeLeft(calculateTimeLeft(targetTimestamp));

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft(targetTimestamp);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetHour]);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl border border-[#aa825e]/30 bg-black/40 px-4 py-2.5 backdrop-blur-md sm:gap-3 sm:px-5 sm:py-3 ${className}`}>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl">00</span>
          <span className="text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">Horas</span>
        </div>
        <span className="text-xl font-bold text-[#aa825e]/60 sm:text-2xl -mt-3">:</span>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl">00</span>
          <span className="text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">Minutos</span>
        </div>
        <span className="text-xl font-bold text-[#aa825e]/60 sm:text-2xl -mt-3">:</span>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl">00</span>
          <span className="text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">Segundos</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border border-[#aa825e]/35 bg-black/50 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md sm:gap-3.5 sm:px-5 sm:py-3 ${className}`}
      aria-label={`Tiempo restante: ${timeLeft.hours} horas, ${timeLeft.minutes} minutos, ${timeLeft.seconds} segundos`}
    >
      {/* Horas */}
      <div className="flex flex-col items-center min-w-[48px] sm:min-w-[58px]">
        <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
          {pad(timeLeft.hours)}
        </span>
        <span className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">
          Horas
        </span>
      </div>

      <span className="text-xl font-bold text-[#aa825e]/70 sm:text-2xl -mt-3 animate-pulse">:</span>

      {/* Minutos */}
      <div className="flex flex-col items-center min-w-[48px] sm:min-w-[58px]">
        <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
          {pad(timeLeft.minutes)}
        </span>
        <span className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">
          Minutos
        </span>
      </div>

      <span className="text-xl font-bold text-[#aa825e]/70 sm:text-2xl -mt-3 animate-pulse">:</span>

      {/* Segundos */}
      <div className="flex flex-col items-center min-w-[48px] sm:min-w-[58px]">
        <span className="font-mono text-2xl font-bold tracking-tight text-[#aa825e] tabular-nums sm:text-3xl lg:text-4xl drop-shadow-[0_2px_12px_rgba(170,130,94,0.35)]">
          {pad(timeLeft.seconds)}
        </span>
        <span className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-[#aa825e] uppercase sm:text-[10px]">
          Segundos
        </span>
      </div>
    </div>
  );
}
