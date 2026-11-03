import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, AlertCircle, Crown, CheckCircle2 } from 'lucide-react';

interface CountdownProps {
  status?: 'active' | 'expired' | 'none' | string;
  endDate?: string | null;
  lang?: 'ar' | 'en';
  size?: 'sm' | 'md' | 'lg';
}

export const SubscriptionCountdown: React.FC<CountdownProps> = ({
  status = 'none',
  endDate,
  lang = 'ar',
  size = 'md'
}) => {
  const isAr = lang === 'ar';
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLifetime: boolean;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLifetime: false,
    isExpired: false
  });

  useEffect(() => {
    const calculateTime = () => {
      if (!endDate || status === 'none' || status === 'expired') {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLifetime: false, isExpired: true });
        return;
      }

      const target = new Date(endDate).getTime();
      const now = Date.now();
      const diff = target - now;

      // Check lifetime (e.g. year 2099 or > 10 years out)
      if (diff > 10 * 365 * 24 * 60 * 60 * 1000) {
        setTimeLeft({ days: 999, hours: 23, minutes: 59, seconds: 59, isLifetime: true, isExpired: false });
        return;
      }

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLifetime: false, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isLifetime: false, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endDate, status]);

  if (timeLeft.isLifetime) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold text-xs">
        <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
        <span>{isAr ? 'اشتراك مدى الحياة (LIFETIME)' : 'LIFETIME VIP ACCESS'}</span>
      </div>
    );
  }

  if (timeLeft.isExpired || status === 'expired') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f23645]/20 border border-[#f23645]/40 text-[#f23645] font-mono font-bold text-xs">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{isAr ? 'الاشتراك منتهي' : 'EXPIRED'}</span>
      </div>
    );
  }

  if (status === 'none' || !endDate) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#2a2e39] text-[#787b86] font-mono text-xs">
        <span>{isAr ? 'لا يوجد اشتراك' : 'NO SUBSCRIPTION'}</span>
      </div>
    );
  }

  const format2Digits = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-xl border bg-[#089981]/15 border-[#089981]/40 text-[#089981] ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
    }`}>
      <Clock className={`shrink-0 text-[#089981] animate-pulse ${size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
      <span>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {format2Digits(timeLeft.hours)}h:{format2Digits(timeLeft.minutes)}m:{format2Digits(timeLeft.seconds)}s
      </span>
    </div>
  );
};
