/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay,
  isAfter,
  isBefore,
  startOfToday,
  startOfWeek,
  endOfWeek,
  isWithinInterval
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  History, 
  Target,
  Flame,
  MessageSquareQuote
} from 'lucide-react';
import { TutorStorage, Student, Session } from '../types';
import { BENGALI_WEEKDAYS, SCHEDULED_DAYS } from '../constants';
import SessionModal from './SessionModal';
import { cn } from '../lib/utils';

interface DashboardProps {
  data: TutorStorage;
  user: Student;
  onUpdateSession: (monthKey: string, dateKey: string, sessionData: any) => void;
}

export default function Dashboard({ data, user, onUpdateSession }: DashboardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const today = startOfToday();

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const sessions = data.sessions[monthKey] || {};

  // Scheduled Days Logic
  const isScheduled = (date: Date) => SCHEDULED_DAYS.includes(getDay(date));

  // Stats Calculation
  const stats = useMemo(() => {
    const scheduledDays = daysInMonth.filter(isScheduled);
    const sessionEntries = Object.entries(sessions);
    
    const taughtSessions = sessionEntries.filter(([_, s]) => s.taught);
    const absentSessions = sessionEntries.filter(([date, s]) => !s.taught && isScheduled(new Date(date)));
    
    const pendingDays = scheduledDays.filter(d => !sessions[format(d, 'yyyy-MM-dd')] && (isBefore(d, today) || isSameDay(d, today)));
    
    const totalHours = taughtSessions.reduce((acc, [_, curr]) => acc + curr.duration, 0);
    
    const progress = scheduledDays.length > 0 
      ? Math.round((taughtSessions.filter(([date, _]) => isScheduled(new Date(date))).length / scheduledDays.length) * 100) 
      : 0;

    return {
      totalScheduled: scheduledDays.length,
      taught: taughtSessions.length,
      absent: absentSessions.length,
      pending: pendingDays.length,
      totalHours,
      progress
    };
  }, [daysInMonth, sessions, today]);

  // Streak Counter
  const streak = useMemo(() => {
    let count = 0;
    // We check all logged sessions across all months, but for simplicity let's check current and previous month
    // Real implementation would flatten all sessions
    const sortedAllDates = Object.entries(data.sessions)
      .flatMap(([mKey, mSessions]) => Object.entries(mSessions).map(([dKey, s]) => ({ date: new Date(dKey), ...s })))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    for (const s of sortedAllDates) {
      if (s.taught) count++;
      else break;
    }
    return count;
  }, [data.sessions]);

  // Motivational Messages
  const motivationalMessage = useMemo(() => {
    if (stats.progress >= 100) return { text: "অসাধারণ! আপনি এই মাসের সব লক্ষ্য পূরণ করেছেন। 🔥", emoji: "🏆" };
    if (stats.progress >= 70) return { text: "খুব সুন্দর! পড়ার মান বজায় রাখুন।", emoji: "✨" };
    if (stats.progress >= 40) return { text: "চেষ্টা করুন বন্ধ না দিতে, পড়াশোনায় গতি আনুন।", emoji: "📚" };
    if (stats.progress > 0) return { text: "এখনও অনেক পথ বাকি, মনোযোগ দিন!", emoji: "🌱" };
    return { text: "নতুন মাস শুরু করুন উদ্যম নিয়ে।", emoji: "🚀" };
  }, [stats.progress]);

  // Week Breakdown
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weekIntervals: { start: Date; end: Date }[] = [];
    
    let curr = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    while (isBefore(curr, monthEnd)) {
      weekIntervals.push({ start: curr, end: endOfWeek(curr, { weekStartsOn: 0 }) });
      curr = addMonths(curr, 0); // Placeholder
      curr = new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return weekIntervals.map(interval => {
      const scheduledInWeek = eachDayOfInterval(interval).filter(d => isScheduled(d) && isWithinInterval(d, { start: monthStart, end: monthEnd }));
      const taughtInWeek = scheduledInWeek.filter(d => sessions[format(d, 'yyyy-MM-dd')]?.taught);
      const absentInWeek = scheduledInWeek.filter(d => sessions[format(d, 'yyyy-MM-dd')] && !sessions[format(d, 'yyyy-MM-dd')]?.taught);
      const pendingInWeek = scheduledInWeek.filter(d => !sessions[format(d, 'yyyy-MM-dd')] && (isBefore(d, today) || isSameDay(d, today)));
      
      const isComplete = scheduledInWeek.length > 0 && taughtInWeek.length === scheduledInWeek.length;
      const isFailed = absentInWeek.length > 0;
      
      return {
        interval,
        scheduled: scheduledInWeek.length,
        taught: taughtInWeek.length,
        absent: absentInWeek.length,
        pending: pendingInWeek.length,
        isComplete,
        isFailed
      };
    }).filter(w => w.scheduled > 0);
  }, [currentMonth, sessions, today]);

  const history = useMemo(() => {
    return Object.entries(sessions)
      .map(([date, s]) => ({ date, ...s }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions]);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="w-full lg:max-w-2xl">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <MessageSquareQuote className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">টনিক অফ দ্য ডে</span>
          </div>
          <div className="glass-dark border-indigo-500/20 p-4 md:p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <h2 className="text-lg md:text-2xl font-medium flex items-center gap-3 leading-tight">
              <span className="text-2xl md:text-3xl">{motivationalMessage.emoji}</span>
              {motivationalMessage.text}
            </h2>
          </div>
          {streak > 1 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 text-orange-400 rounded-full text-[10px] md:text-xs font-bold border border-orange-500/20 shadow-lg shadow-orange-500/10"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              টানা {streak} দিন পড়ানো হয়েছে
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto bg-black/20 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2.5 md:p-3 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-1.5 text-base md:text-xl font-light tracking-wide flex-1 lg:flex-none text-center min-w-[140px]">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2.5 md:p-3 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Calendar & Stats */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          
          {/* Progress Overview Card */}
          <div className="glass rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 md:gap-8 items-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/10">
            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * stats.progress) / 100 }}
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="283"
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000",
                    stats.progress < 40 ? "text-red-500" : stats.progress < 71 ? "text-yellow-500" : "text-emerald-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold tracking-tighter">{stats.progress}%</span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-white/40 tracking-widest">Progress</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
               <div className="p-3 md:p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 group hover:border-white/10 transition-colors">
                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-white/30 tracking-wider">Scheduled</p>
                 <p className="text-xl md:text-2xl font-semibold">{stats.totalScheduled}</p>
               </div>
               <div className="p-3 md:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 space-y-1 group hover:border-emerald-500/20 transition-colors">
                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-emerald-400/60 tracking-wider">Taught</p>
                 <p className="text-xl md:text-2xl font-semibold text-emerald-400">{stats.taught}</p>
               </div>
               <div className="p-3 md:p-4 rounded-2xl bg-red-500/10 border border-red-500/10 space-y-1 group hover:border-red-500/20 transition-colors">
                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-red-400/60 tracking-wider">Absent</p>
                 <p className="text-xl md:text-2xl font-semibold text-red-400">{stats.absent}</p>
               </div>
               <div className="p-3 md:p-4 rounded-2xl bg-blue-500/10 border border-blue-500/10 space-y-1 group hover:border-blue-500/20 transition-colors">
                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-blue-400/60 tracking-wider">Hours</p>
                 <p className="text-xl md:text-2xl font-semibold text-blue-400">{stats.totalHours}</p>
               </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="glass rounded-3xl p-4 md:p-6 overflow-hidden">
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
              {BENGALI_WEEKDAYS.map((day, idx) => (
                <div key={day} className={cn(
                  "text-center text-[10px] md:text-xs font-bold py-2 uppercase tracking-tighter opacity-30",
                  SCHEDULED_DAYS.includes(idx) && "opacity-100 text-indigo-400"
                )}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-3">
              {/* Empty days at the start */}
              {Array.from({ length: getDay(daysInMonth[0]) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {daysInMonth.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const session = sessions[dateKey];
                const scheduled = isScheduled(day);
                const isToday = isSameDay(day, today);
                const isFuture = isAfter(day, today);
                const isPast = isBefore(day, today);

                let cellStyles = "bg-white/5 border border-white/5 opacity-10";
                let label = "";

                if (session) {
                  if (session.taught) {
                    if (session.isExtra) {
                      cellStyles = "bg-indigo-500/20 border border-indigo-500/40 shadow-lg shadow-indigo-500/10 text-indigo-100";
                      label = "Extra";
                    } else {
                      cellStyles = "bg-emerald-500/20 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 text-emerald-100";
                      label = "Done";
                    }
                  } else {
                    cellStyles = "bg-red-500/20 border border-red-500/40 shadow-lg shadow-red-500/10 text-red-100";
                    label = "Off";
                  }
                } else if (scheduled) {
                  if (isPast || isToday) {
                    cellStyles = "bg-amber-500/20 border border-amber-500/40 shadow-lg shadow-amber-500/10 text-amber-100";
                    label = "Log";
                  } else {
                    cellStyles = "bg-white/5 border border-dashed border-white/20 text-white/40";
                    label = "";
                  }
                } else if (!isFuture) {
                  cellStyles = "bg-white/5 border border-white/10 opacity-40 hover:opacity-100";
                  label = "+";
                }

                return (
                  <motion.button
                    whileHover={!isFuture ? { scale: 1.05 } : {}}
                    whileTap={!isFuture ? { scale: 0.95 } : {}}
                    key={dateKey}
                    onClick={() => !isFuture && setSelectedDate(day)}
                    disabled={isFuture}
                    className={cn(
                      "aspect-square rounded-lg md:rounded-2xl flex flex-col items-center justify-center transition-all relative overflow-hidden border",
                      cellStyles,
                      isToday && "ring-1 md:ring-2 ring-blue-400 ring-offset-2 md:ring-offset-4 ring-offset-[#1b1b36]",
                      label === "Log" && isToday && "animate-pulse"
                    )}
                  >
                    <span className={cn(
                      "text-sm md:text-lg font-semibold", 
                      !scheduled && !session && "text-white/40"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {label && (
                      <span className={cn(
                        "text-[7px] md:text-[9px] font-bold uppercase tracking-tighter mt-0.5",
                        label === "Done" && "text-emerald-400",
                        label === "Off" && "text-red-400",
                        label === "Log" && "text-amber-400",
                        label === "Extra" && "text-indigo-400",
                        label === "+" && "text-white/20"
                      )}>
                        {label}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-white/30 border-t border-white/5 pt-6">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" /> Taught</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-indigo-500/30 border border-indigo-500/50" /> Extra</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500/50" /> Off</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500/50" /> Pending</div>
              <div className="flex items-center gap-1.5 opacity-50 underline decoration-blue-500 underline-offset-4 decoration-2">Today</div>
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Breakdown & History */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Monthly Goals Card */}
          <div className="glass rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              মাসিক লক্ষ্যমাত্রা
            </h3>
            
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-bold">{stats.progress}%</p>
              <p className="text-xs text-white/40">{stats.taught} / {stats.totalScheduled} দিন</p>
            </div>

            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                className={cn(
                  "h-full transition-all duration-1000 bg-gradient-to-r",
                  stats.progress < 40 ? "from-red-600 to-red-400" : stats.progress < 71 ? "from-amber-500 to-yellow-400" : "from-emerald-500 to-green-400"
                )}
              />
            </div>
            
            <p className={cn(
              "mt-4 text-xs font-medium leading-relaxed",
              stats.progress < 40 ? "text-red-400" : stats.progress < 71 ? "text-amber-400" : "text-emerald-400"
            )}>
              {motivationalMessage.text}
            </p>

            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Total Hours</p>
                 <p className="text-xl font-bold text-white/80">{stats.totalHours} ঘণ্টা</p>
               </div>
               <div className="space-y-1 text-right">
                 <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Absences</p>
                 <p className="text-xl font-bold text-red-400/80">{stats.absent} দিন</p>
               </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="glass rounded-3xl p-6 flex flex-col flex-1 overflow-hidden">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <History className="w-4 h-4" />
              সাম্প্রতিক কার্যক্রম
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-10 text-white/20">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-10" />
                  <p className="text-sm">No sessions logged yet</p>
                </div>
              ) : (
                history.map((s) => (
                  <div key={s.date} className="flex gap-4 items-start group">
                    <div className={cn(
                      "w-1.5 h-10 rounded-full shrink-0 transition-all group-hover:h-12",
                      s.taught ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{format(new Date(s.date), 'dd MMMM, yyyy')}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        {s.isExtra && <span className="text-indigo-400">Extra Class • </span>}
                        {s.taught ? `সময়: ${s.duration} ঘণ্টা` : 'বন্ধ ছিল'} • Logged by {s.loggedBy}
                      </p>
                      {s.notes && <p className="text-[11px] text-white/60 mt-1 italic line-clamp-1">"{s.notes}"</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {selectedDate && (
          <SessionModal
            date={selectedDate}
            session={sessions[format(selectedDate, 'yyyy-MM-dd')]}
            user={user}
            onClose={() => setSelectedDate(null)}
            onSave={(sessionData) => {
              onUpdateSession(monthKey, format(selectedDate, 'yyyy-MM-dd'), sessionData);
              setSelectedDate(null);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
