/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User } from 'lucide-react';
import { AuthState, TutorStorage, Student } from './types';
import { STUDENTS, STORAGE_KEY, AUTH_STORAGE_KEY } from './constants';
import { cn } from './lib/utils';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });

  const [data, setData] = useState<TutorStorage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return { sessions: {} };
  });

  // Keep localStorage in sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setData(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogin = (user: Student) => {
    const newState = { isAuthenticated: true, user };
    setAuth(newState);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
    toast.success(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    const newState = { isAuthenticated: false, user: null };
    setAuth(newState);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    toast.info("Logged out successfully");
  };

  const updateSession = (monthKey: string, dateKey: string, sessionData: any) => {
    setData((prev) => {
      const newData = {
        ...prev,
        sessions: {
          ...prev.sessions,
          [monthKey]: {
            ...(prev.sessions[monthKey] || {}),
            [dateKey]: {
              ...sessionData,
              updatedAt: Date.now(),
            },
          },
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  };

  if (!auth.isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" richColors theme="dark" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" richColors theme="dark" />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 h-16 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
            T
          </div>
          <h1 className="text-xl font-semibold tracking-tight uppercase">
            Tutor<span className="text-indigo-400">Track</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {/* Streak Counter in Nav for all students to see */}
          {(() => {
            let streakCount = 0;
            const sortedAllDates = Object.entries(data.sessions)
              .flatMap(([_, mSessions]) => Object.entries(mSessions).map(([dKey, s]) => ({ date: new Date(dKey), ...s })))
              .sort((a, b) => b.date.getTime() - a.date.getTime());

            for (const s of sortedAllDates) {
              if (s.taught) streakCount++;
              else break;
            }

            return streakCount > 0 ? (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
                <span className="text-orange-400">🔥</span>
                <span className="text-sm font-medium tracking-wide">টানা {streakCount} দিন পড়ানো হয়েছে</span>
              </div>
            ) : null;
          })()}

          <div className="flex items-center gap-4 border-l border-white/10 pl-4 md:pl-8">
            <div className="text-right hidden xs:block">
              <p className="text-sm font-semibold">{auth.user?.name}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Student</p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/20 font-bold shadow-inner text-white",
              auth.user?.color || "bg-gradient-to-tr from-purple-500 to-pink-500"
            )}>
              {auth.user?.name.charAt(0)}
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Dashboard 
          data={data} 
          user={auth.user!} 
          onUpdateSession={updateSession} 
        />
      </main>

      <footer className="py-8 text-center text-white/30 text-sm">
        &copy; {new Date().getFullYear()} Tutor Session Tracker • Built for Students
      </footer>
    </div>
  );
}
