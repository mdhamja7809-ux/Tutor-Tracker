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
  MessageSquareQuote,
  BookOpen,
  ClipboardList,
  Eye,
  Plus,
  Trash2,
  ExternalLink,
  X,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { TutorStorage, Student, Session, HomeworkItem, MonthSessions } from '../types';
import { BENGALI_WEEKDAYS, SCHEDULED_DAYS } from '../constants';
import SessionModal from './SessionModal';
import { cn } from '../lib/utils';

interface DashboardProps {
  data: TutorStorage;
  user: Student;
  onUpdateSession: (monthKey: string, dateKey: string, sessionData: any) => void;
  onUpdateHomework: (homeworks: HomeworkItem[]) => void;
  activeTab?: string;
  onLogout?: () => void;
}

export default function Dashboard({ data, user, onUpdateSession, onUpdateHomework, activeTab = 'home', onLogout }: DashboardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const today = startOfToday();

  const handleAddHomework = () => {
    const task = prompt("HW Task Description:");
    if (!task) return;
    const dueDate = prompt("Due Date (e.g. Saturday 5pm or 2026-05-15):") || "TBD";
    const submissionDate = prompt("Submission Date (optional):") || "";
    
    const newItem: HomeworkItem = {
      id: Math.random().toString(36).substr(2, 9),
      task,
      dueDate,
      submissionDate,
      isCompleted: false,
      createdAt: Date.now()
    };
    
    onUpdateHomework([...(data.homeworks || []), newItem]);
  };

  const toggleHW = (id: string) => {
    const updated = (data.homeworks || []).map(hw => 
      hw.id === id ? { ...hw, isCompleted: !hw.isCompleted } : hw
    );
    onUpdateHomework(updated);
  };

  const deleteHW = (id: string) => {
    if (confirm("Delete this HW?")) {
      const updated = (data.homeworks || []).filter(hw => hw.id !== id);
      onUpdateHomework(updated);
    }
  };

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const sessions = (data.sessions[monthKey] || {}) as MonthSessions;

  // Scheduled Days Logic
  const isScheduled = (date: Date) => SCHEDULED_DAYS.includes(getDay(date));

  // Stats Calculation
  const stats = useMemo(() => {
    const scheduledDays = daysInMonth.filter(isScheduled);
    const sessionEntries = Object.entries(sessions) as [string, Session][];
    
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
    // We check all logged sessions across all months
    const allMonths = Object.values(data.sessions) as MonthSessions[];
    const sortedAllDates = allMonths
      .flatMap(mSessions => Object.entries(mSessions).map(([dKey, s]) => ({ date: new Date(dKey), ...s })))
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
      
      {/* Top Header & Navigation - Only show on Home tab on mobile, or always on desktop */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-6",
        activeTab !== 'home' && "hidden lg:flex"
      )}>
        <div className="w-full lg:max-w-2xl">
          <div className="flex items-center gap-2 mb-3 text-neon-blue">
            <MessageSquareQuote className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocol Message</span>
          </div>
          <div className="glass-card p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-blue shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <h2 className="text-xl md:text-3xl font-bold flex items-center gap-4 leading-tight">
              <span className="text-3xl md:text-4xl filter drop-shadow-lg">{motivationalMessage.emoji}</span>
              {motivationalMessage.text}
            </h2>
          </div>
          
          {/* Streak Card spec: "A prominent horizontal orange-tinted card: 'টানা ৩ দিন পড়ানো হয়েছে' with a fire emoji." */}
          {streak > 0 && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="mt-6 flex items-center gap-4 p-4 md:p-5 bg-orange-500/10 border border-orange-500/30 rounded-[28px] shadow-[0_0_20px_rgba(249,115,22,0.1)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/40 relative z-10">
                🔥
              </div>
              <div className="relative z-10">
                <p className="text-orange-400 font-black tracking-widest text-[10px] uppercase mb-0.5">Global Streak</p>
                <p className="text-lg md:text-xl font-bold text-white">টানা {streak} দিন পড়ানো হয়েছে</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto bg-midnight/40 p-2.5 rounded-[28px] border border-white/5 backdrop-blur-xl">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-3 md:p-4 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="px-6 py-2 text-lg md:text-2xl font-black uppercase tracking-tighter flex-1 lg:flex-none text-center min-w-[160px] font-display">
            {format(currentMonth, 'MMM yyyy')}
          </div>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-3 md:p-4 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Calendar & Stats */}
        <div className={cn(
          "lg:col-span-8 space-y-6 md:space-y-8",
          activeTab !== 'home' && "hidden lg:block"
        )}>
          
          {/* Progress Overview Card spec: "Create a large, thick circular progress bar (15%) with a glow effect on the progress tip." */}
          <div className="glass-card p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center justify-center bg-gradient-to-br from-neon-blue/5 to-transparent relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-3xl pointer-events-none" />
            
            <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <motion.circle
                  initial={{ strokeDashoffset: 263.89 }}
                  animate={{ strokeDashoffset: 263.89 - (263.89 * Math.min(stats.progress, 100)) / 100 }}
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#progressGradient)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray="263.89"
                  strokeLinecap={stats.progress > 0 ? "round" : "butt"}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl md:text-5xl font-black text-white font-display tracking-tighter">{stats.progress}%</span>
                <span className="text-[10px] md:text-sm uppercase font-black text-white/30 tracking-[0.3em] mt-1">Efficiency</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
               <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                 <p className="text-[10px] uppercase font-black text-white/20 tracking-widest mb-1">Scheduled</p>
                 <p className="text-2xl md:text-3xl font-bold text-white font-display">{stats.totalScheduled}</p>
               </div>
               <div className="p-5 rounded-[24px] bg-emerald-accent/5 border border-emerald-accent/10 hover:bg-emerald-accent/10 transition-all group">
                 <p className="text-[10px] uppercase font-black text-emerald-accent/40 tracking-widest mb-1">Completed</p>
                 <p className="text-2xl md:text-3xl font-bold text-emerald-accent font-display">{stats.taught}</p>
               </div>
               <div className="p-5 rounded-[24px] bg-pink-500/5 border border-pink-500/10 hover:bg-pink-500/10 transition-all group">
                 <p className="text-[10px] uppercase font-black text-rose-400/40 tracking-widest mb-1">Missed</p>
                 <p className="text-2xl md:text-3xl font-bold text-rose-400 font-display">{stats.absent}</p>
               </div>
               <div className="p-5 rounded-[24px] bg-neon-blue/5 border border-neon-blue/10 hover:bg-neon-blue/10 transition-all group">
                 <p className="text-[10px] uppercase font-black text-neon-blue/40 tracking-widest mb-1">Hours Logged</p>
                 <p className="text-2xl md:text-3xl font-bold text-neon-blue font-display">{stats.totalHours}</p>
               </div>
            </div>
          </div>

          {/* Calendar Grid spec: "7-column grid. Days should be dark circles; 'Today' should have a bright blue ring. Use Bengali abbreviations" */}
          <div className="glass-card p-6 md:p-8">
            <div className="grid grid-cols-7 gap-2 mb-8">
              {BENGALI_WEEKDAYS.map((day, idx) => (
                <div key={day} className={cn(
                  "text-center text-[11px] font-black py-2 uppercase tracking-widest transition-opacity",
                  SCHEDULED_DAYS.includes(idx) ? "text-neon-blue opacity-100" : "text-white opacity-20"
                )}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-3 md:gap-5">
              {Array.from({ length: getDay(daysInMonth[0]) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {daysInMonth.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const session = sessions[dateKey];
                const scheduled = isScheduled(day);
                const isToday = isSameDay(day, today);
                const isFuture = isAfter(day, today);

                let cellClass = "bg-midnight/30 border border-white/5 text-white/30";
                
                if (session) {
                  if (session.taught) {
                    cellClass = "bg-emerald-accent text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-transparent";
                  } else {
                    cellClass = "bg-rose-500/20 border-rose-500/40 text-rose-400";
                  }
                } else if (scheduled && !isFuture) {
                  cellClass = "bg-amber-500/20 border-amber-500/40 text-amber-400";
                } else if (isToday) {
                  cellClass = "bg-midnight border-neon-blue text-white";
                }

                return (
                  <motion.button
                    whileHover={!isFuture ? { scale: 1.1, zIndex: 10 } : {}}
                    whileTap={!isFuture ? { scale: 0.9 } : {}}
                    key={dateKey}
                    onClick={() => !isFuture && setSelectedDate(day)}
                    disabled={isFuture}
                    className={cn(
                      "aspect-square rounded-full flex items-center justify-center transition-all relative border-2 text-sm md:text-base font-bold",
                      cellClass,
                      isToday && "border-neon-blue shadow-[0_0_15px_rgba(59,130,246,0.6)] ring-4 ring-neon-blue/20",
                      isFuture && "opacity-20 cursor-default"
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                    {scheduled && !session && !isFuture && !isToday && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#1e1b4b] animate-pulse" />
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[10px] uppercase font-black tracking-[0.2em] text-white/20 border-t border-white/5 pt-8">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-accent" /> Completed</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500" /> Cancelled</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500" /> Pending</div>
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Breakdown & History */}
        <div className={cn(
          "lg:col-span-4 space-y-8",
          activeTab === 'home' && "hidden lg:block"
        )}>
          
          {/* Student Profile Card - Desktop Only */}
          <div className="glass-card p-6 hidden lg:flex flex-col gap-5 border-white/5">
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-lg border-2 border-white/10",
                user.color || "bg-midnight"
              )}>
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black truncate text-white leading-tight font-display">{user.name}</h3>
                <p className="text-neon-blue font-black tracking-[0.2em] text-[10px] uppercase mt-1">{user.grade || 'Explorer'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-[20px] bg-white/5 border border-white/5">
                <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Protocol ID</p>
                <p className="text-sm font-mono text-white mt-1">{user.idNumber || 'XP-72'}</p>
              </div>
              <div className="p-4 rounded-[20px] bg-white/5 border border-white/5">
                <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Enlist Date</p>
                <p className="text-sm font-bold text-white mt-1">{user.joiningDate || '24.05.26'}</p>
              </div>
            </div>
          </div>

          {/* Monthly Goals Card - Only home desktop */}
          <div className="glass-card p-6 hidden lg:block">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-blue" />
              Quota Status
            </h3>
            
            <div className="flex items-end justify-between mb-2">
              <p className="text-4xl font-black tracking-tighter text-white font-display">{stats.progress}%</p>
              <p className="text-[10px] uppercase font-black text-white/20">{stats.taught} / {stats.totalScheduled} SESSIONS</p>
            </div>

            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                className={cn(
                  "h-full transition-all duration-1000 shimmer",
                  stats.progress < 40 ? "bg-rose-500" : stats.progress < 71 ? "bg-amber-500" : "bg-emerald-accent"
                )}
              />
            </div>
            
            <p className={cn(
              "mt-5 text-[12px] font-bold leading-relaxed px-4 py-3 rounded-2xl",
              stats.progress < 40 ? "text-rose-400 bg-rose-400/5 border border-rose-400/10" : stats.progress < 71 ? "text-amber-400 bg-amber-400/5 border border-amber-400/10" : "text-emerald-accent bg-emerald-accent/5 border border-emerald-accent/10"
            )}>
              {motivationalMessage.text}
            </p>
          </div>

          {/* Homework (HW) Management Card spec: "Ensure the 'Work' list items have a vertical green indicator line on the left for completed items." */}
          <div className={cn(
            "glass-card p-6 flex flex-col border-white/5",
            activeTab === 'homework' ? "flex min-h-[70vh] lg:min-h-0" : "hidden lg:flex max-h-[500px]"
          )}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-neon-blue" />
                Active Directives (HW)
              </h3>
              <button 
                onClick={handleAddHomework}
                className="w-10 h-10 rounded-full bg-neon-blue text-white shadow-lg shadow-neon-blue/30 hover:scale-110 active:scale-90 transition-transform flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {(!data.homeworks || data.homeworks.length === 0) ? (
                <div className="text-center py-16 opacity-10">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm uppercase tracking-[0.3em] font-black">No active tasks</p>
                </div>
              ) : (
                data.homeworks.sort((a, b) => b.createdAt - a.createdAt).map(hw => {
                  const isUrgent = hw.dueDate.toLowerCase().includes('today') || hw.dueDate.toLowerCase().includes('tomorrow');

                  return (
                    <div key={hw.id} className={cn(
                      "p-5 rounded-[24px] border transition-all group flex flex-col gap-4 relative overflow-hidden",
                      hw.isCompleted 
                        ? "bg-emerald-accent/5 border-emerald-accent/20" 
                        : isUrgent 
                          ? "bg-rose-500/5 border-rose-500/30" 
                          : "bg-white/5 border-white/5 hover:bg-white/[0.08]"
                    )}>
                      {/* Indicator Line spec: "vertical green indicator line on the left for completed items" */}
                      {hw.isCompleted && (
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-accent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <button 
                          onClick={() => toggleHW(hw.id)} 
                          className={cn(
                            "shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                            hw.isCompleted 
                              ? "bg-emerald-accent border-emerald-accent shadow-lg shadow-emerald-accent/30" 
                              : "border-white/20 hover:border-neon-blue"
                          )}
                        >
                          {hw.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-bold leading-relaxed text-white transition-opacity", 
                            hw.isCompleted && "text-white/40"
                          )}>
                            {hw.task}
                          </p>
                        </div>
                        <button onClick={() => deleteHW(hw.id)} className="p-2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-500 transition-all rounded-full hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          isUrgent ? "bg-rose-500 text-white" : "bg-midnight/60 text-white/50 border border-white/5"
                        )}>
                          <Clock className="w-3 h-3" />
                          Deadline: {hw.dueDate}
                        </div>
                        
                        {hw.submissionDate && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-blue/10 text-neon-blue text-[9px] font-black uppercase tracking-widest border border-neon-blue/20">
                            <Plus className="w-3 h-3" />
                            Submit: {hw.submissionDate}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className={cn(
            "glass-card p-6 flex flex-col flex-1 overflow-hidden",
            activeTab === 'history' ? "flex min-h-[70vh] lg:min-h-0" : "hidden lg:flex"
          )}>
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <History className="w-5 h-5 text-neon-blue" />
              Chronological Logs
            </h3>
            <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-20 opacity-10">
                  <History className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm uppercase tracking-[0.3em] font-black">Archive Empty</p>
                </div>
              ) : (
                history.map((s) => (
                  <div key={s.date} className="flex gap-6 group relative">
                    <div className="flex flex-col items-center shrink-0 w-6 relative">
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-[30px] -translate-y-1/2 shrink-0 relative z-20 transition-transform group-hover:scale-125 border-2 border-midnight shadow-lg",
                        s.taught 
                          ? "bg-emerald-accent shadow-[0_0_15px_rgba(16,185,129,0.8)]" 
                          : "bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                      )} />
                      <div className={cn(
                        "absolute top-[30px] bottom-0 w-[2px] opacity-20 group-last:hidden",
                        s.taught ? "bg-emerald-accent" : "bg-rose-500"
                      )} />
                    </div>

                    {/* Class Details */}
                    <div className="flex-1 min-w-0 pb-10 group-last:pb-2">
                      <div className="bg-midnight/40 border border-white/5 rounded-[24px] p-5 transition-all hover:bg-midnight/60 hover:border-white/20 group-hover:-translate-y-1 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <p className="text-sm font-black text-white leading-none font-display uppercase tracking-tight">{format(new Date(s.date), 'dd MMM, yyyy')}</p>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border self-start",
                            s.taught 
                              ? "text-emerald-accent border-emerald-accent/30 bg-emerald-accent/5" 
                              : "text-rose-400 border-rose-400/30 bg-rose-400/5"
                          )}>
                            {s.taught ? 'Verified Log' : 'Operation Halted'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neon-blue" />
                            <span className="text-[11px] text-white/60 font-black uppercase tracking-widest">
                              {s.taught ? `${s.duration} Hours` : 'Zero Contact'}
                            </span>
                          </div>
                          {s.isExtra && (
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-neon-blue/20 rounded-md border border-neon-blue/30">
                              <Plus className="w-3 h-3 text-neon-blue" />
                              <span className="text-[9px] text-neon-blue font-black uppercase tracking-widest">Expansion</span>
                            </div>
                          )}
                        </div>

                        {s.notes && (
                          <div className="mt-4 relative group/note">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-white/10 rounded-full" />
                            <p className="text-[12px] text-white/50 leading-relaxed pl-5 font-medium italic">
                              "{s.notes}"
                            </p>
                          </div>
                        )}
                        
                        {(s.homework || (s.classNotes && s.classNotes.length > 0)) && (
                          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/5">
                            {s.homework && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white/70 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                                <BookOpen className="w-3.5 h-3.5" /> Directive Assigned
                              </div>
                            )}
                            {s.classNotes && s.classNotes.length > 0 && (
                              <button
                                onClick={() => setSelectedPhotos(s.classNotes!)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-accent/20 hover:scale-105 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Review Notes ({s.classNotes.length})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="glass-card p-12 text-center flex flex-col items-center gap-8 relative overflow-hidden">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-neon-blue/10 blur-[100px] rounded-full" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-accent/10 blur-[100px] rounded-full" />
                
                <div className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center text-6xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/10 hover:scale-110 transition-all duration-500 relative z-10",
                  user.color || "bg-gradient-to-tr from-neon-blue to-violet-600"
                )}>
                  <span className="drop-shadow-2xl leading-none">{user.name.charAt(0)}</span>
                </div>
                
                <div className="relative">
                  <h3 className="text-4xl font-black uppercase tracking-tighter text-white font-display">{user.name}</h3>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neon-blue/20 rounded-full border border-neon-blue/30 mt-4 backdrop-blur-xl">
                    <ShieldCheck className="w-4 h-4 text-neon-blue" />
                    <span className="text-neon-blue font-black tracking-[0.3em] text-[10px] uppercase">{user.grade || 'Beta Enlistee'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5 w-full mt-4 text-center">
                  <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-inner flex flex-col items-center justify-center">
                    <p className="text-neon-blue font-black text-3xl font-display leading-none">{streak}</p>
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-3">Continuity</p>
                  </div>
                  <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-inner flex flex-col items-center justify-center">
                    <p className="text-emerald-accent font-black text-3xl font-display leading-none">{stats.taught}</p>
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-3">Completed</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 space-y-10">
                <div className="space-y-8">
                  <h3 className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] mb-4 flex items-center gap-2 justify-center">
                    <UserIcon className="w-4 h-4 text-neon-blue" />
                    Protocol Credentials
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-[24px] border border-white/5 group hover:bg-white/10 hover:border-white/20 transition-all">
                      <span className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em]">User ID</span>
                      <span className="text-sm font-mono text-neon-blue font-bold">{user.idNumber || 'AUTH_0X72'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-[24px] border border-white/5 group hover:bg-white/10 hover:border-white/20 transition-all">
                      <span className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em]">Onboard Time</span>
                      <span className="text-sm text-white font-bold">{user.joiningDate || '21.04.26'}</span>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-[24px] border border-white/5 group hover:bg-white/10 hover:border-white/20 transition-all">
                      <span className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em]">Validation Status</span>
                      <span className="text-[10px] font-black text-emerald-accent uppercase tracking-widest flex items-center gap-3 bg-emerald-accent/10 px-4 py-2 rounded-full border border-emerald-accent/30">
                        <Smartphone className="w-4 h-4" /> Secure Protocol
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={onLogout}
                    className="w-full py-6 px-8 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-[32px] border border-rose-500/30 font-black transition-all flex items-center justify-center gap-4 active:scale-95 group shadow-2xl shadow-rose-500/10 uppercase tracking-[0.3em] text-[12px]"
                  >
                    <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Terminate Connection
                  </button>
                </div>
              </div>
            </div>
          )}
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
      
      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {selectedPhotos && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl h-full flex flex-col"
            >
              <button 
                onClick={() => setSelectedPhotos(null)}
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
              >
                Close <X className="w-6 h-6" />
              </button>
              
              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                {selectedPhotos.map((photo, i) => (
                  <div key={i} className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={photo} alt={`Class Note ${i}`} className="w-full h-auto" />
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white/80 border border-white/10 uppercase tracking-widest">
                      Note Page {i + 1}
                    </div>
                    <a 
                      href={photo} 
                      download={`class-note-${i+1}.png`}
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-indigo-500 rounded-full backdrop-blur-md transition-all text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
