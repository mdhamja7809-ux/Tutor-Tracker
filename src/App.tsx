/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User, Calendar as CalendarIcon, ClipboardList, History } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDocs, writeBatch, limit, getDoc } from 'firebase/firestore';
import { AuthState, TutorStorage, Student, Session, HomeworkItem } from './types';
import { STUDENTS, STORAGE_KEY, AUTH_STORAGE_KEY } from './constants';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });

  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState<TutorStorage>({ sessions: {}, homeworks: [] });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    console.log("Firebase Data Sync Effect started. Current Database ID:", db.app.options.projectId);
    
    // Explicitly test a write to check permissions
    const testWrite = async () => {
      try {
        const testRef = doc(db, '_connection_test', 'test-' + Date.now());
        await setDoc(testRef, { timestamp: Date.now(), status: 'testing' });
        console.log("Firestore Write Test: SUCCESS");
      } catch (err) {
        console.error("Firestore Write Test: FAILED", err);
      }
    };
    testWrite();

    const sessionsQuery = query(collection(db, 'sessions'));
    const homeworksQuery = query(collection(db, 'homeworks'));

    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      console.log("Sessions updated from Firestore, count:", snapshot.size);
      setData(prev => {
        const newSessions: { [month: string]: { [date: string]: Session } } = {};
        snapshot.docs.forEach(docSnap => {
          const dateKey = docSnap.id;
          const session = docSnap.data() as Session;
          const monthKey = dateKey.substring(0, 7); // YYYY-MM
          if (!newSessions[monthKey]) newSessions[monthKey] = {};
          newSessions[monthKey][dateKey] = session;
        });
        return { ...prev, sessions: newSessions };
      });
      setIsDataLoaded(true);
    }, (err) => {
      console.error("Sessions Snapshot Error (Details):", {
        code: (err as any).code,
        message: err.message,
        name: err.name,
      });
      // handleFirestoreError(err, OperationType.LIST, 'sessions')
    });

    const unsubHomeworks = onSnapshot(homeworksQuery, (snapshot) => {
      console.log("Homeworks updated from Firestore, count:", snapshot.size);
      const homeworks = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as HomeworkItem[];
      setData(prev => ({ ...prev, homeworks }));
    }, (err) => {
      console.error("Homeworks Snapshot Error (Details):", {
        code: (err as any).code,
        message: err.message,
        name: err.name,
      });
      // handleFirestoreError(err, OperationType.LIST, 'homeworks')
    });

    return () => {
      unsubSessions();
      unsubHomeworks();
    };
  }, []);

  // Initial Migration from LocalStorage (one-time)
  useEffect(() => {
    const migrate = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !isDataLoaded) {
        const localData = JSON.parse(saved) as TutorStorage;
        const batch = writeBatch(db);
        let count = 0;

        // Migrate sessions
        Object.entries(localData.sessions).forEach(([monthKey, mSessions]) => {
          Object.entries(mSessions).forEach(([dateKey, session]) => {
            const docRef = doc(db, 'sessions', dateKey);
            batch.set(docRef, session);
            count++;
          });
        });

        // Migrate homeworks
        if (localData.homeworks) {
          localData.homeworks.forEach(hw => {
            const docRef = doc(db, 'homeworks', hw.id);
            const { id, ...rest } = hw;
            batch.set(docRef, rest);
            count++;
          });
        }

        if (count > 0) {
          await batch.commit();
          toast.success("Migrated local data to cloud sync!");
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    
    if (isDataLoaded) migrate();
  }, [isDataLoaded]);

  const handleLogin = (user: Student) => {
    const newState = { isAuthenticated: true, user };
    setAuth(newState);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
    toast.success(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    const newState = { isAuthenticated: false, user: null };
    setAuth(newState);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    toast.info("Logged out successfully");
  };

  const updateSession = async (monthKey: string, dateKey: string, sessionData: any) => {
    try {
      const docRef = doc(db, 'sessions', dateKey);
      await setDoc(docRef, {
        ...sessionData,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${dateKey}`);
    }
  };

  const updateHomework = async (homeworks: HomeworkItem[]) => {
    try {
      // For homeworks, it's easier to just sync the specific change, but the prompt passed the whole list
      // So let's compare and update Firestore
      const batch = writeBatch(db);
      
      // Since Dashboard passes the full new list, we need to handle deletes too
      // However, for simplicity in a shared tracker, we'll just write the latest state
      // Actually, a better API would be addHomework, deleteHomework, toggleHomework
      // But we follow the existing props pattern for now.
      
      // Let's just find the items that changed
      const currentHwIds = new Set(data.homeworks?.map(h => h.id) || []);
      const newHwIds = new Set(homeworks.map(h => h.id));

      // Deletes
      data.homeworks?.forEach(hw => {
        if (!newHwIds.has(hw.id)) {
          batch.delete(doc(db, 'homeworks', hw.id));
        }
      });

      // Updates/Adds
      homeworks.forEach(hw => {
        const { id, ...rest } = hw;
        batch.set(doc(db, 'homeworks', id), rest);
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'homeworks');
    }
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
    <div className="min-h-screen relative flex flex-col">
      <Toaster position="top-right" richColors theme="dark" />
      
      {/* Top Header: Specs match "Left-aligned logo 'T', right-aligned profile 'H' with a circular neon border" */}
      <nav className="sticky top-0 z-50 h-20 px-6 md:px-12 flex items-center justify-between border-b border-white/5 backdrop-blur-2xl bg-navy/60">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-12 h-12 bg-neon-blue rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl shadow-neon-blue/40 group-hover:scale-105 transition-transform font-display text-white">
            T
          </div>
          <h1 className="text-xl font-extrabold tracking-tighter uppercase font-display hidden sm:block">
            Tutor<span className="text-neon-blue">Track</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {/* User Profile spec: right-aligned profile 'H' with a circular neon border */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white uppercase tracking-widest leading-none">{auth.user?.name}</p>
              <p className="text-[10px] font-medium text-neon-blue uppercase tracking-[0.2em] mt-1">{auth.user?.grade}</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white transition-transform hover:scale-110 cursor-pointer",
              auth.user?.color || "bg-midnight",
              "border-neon-blue"
            )}>
              {auth.user?.name.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8 pb-32 lg:pb-12">
        <Dashboard 
          data={data} 
          user={auth.user!} 
          onUpdateSession={updateSession} 
          onUpdateHomework={updateHomework}
          activeTab={activeTab}
          onLogout={handleLogout}
        />
      </main>

      {/* Bottom Navigation: pill shaped dark container */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md lg:hidden">
        <div className="flex items-center justify-between bg-midnight/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => setActiveTab('home')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-3 transition-all rounded-[24px] relative",
              activeTab === 'home' ? "text-neon-blue" : "text-white/30 hover:text-white/60"
            )}
          >
            {activeTab === 'home' && (
              <motion.div 
                layoutId="active-pill" 
                className="absolute inset-0 bg-white/5 border border-white/10 rounded-[24px]" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <CalendarIcon className="w-5 h-5 relative z-10" />
            <span className="text-[9px] font-bold uppercase tracking-widest relative z-10">Home</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('homework')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-3 transition-all rounded-[24px] relative",
              activeTab === 'homework' ? "text-neon-blue" : "text-white/30 hover:text-white/60"
            )}
          >
            {activeTab === 'homework' && (
              <motion.div 
                layoutId="active-pill" 
                className="absolute inset-0 bg-white/5 border border-white/10 rounded-[24px]" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <ClipboardList className="w-5 h-5 relative z-10" />
            <span className="text-[9px] font-bold uppercase tracking-widest relative z-10">Work</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-3 transition-all rounded-[24px] relative",
              activeTab === 'history' ? "text-neon-blue" : "text-white/30 hover:text-white/60"
            )}
          >
            {activeTab === 'history' && (
              <motion.div 
                layoutId="active-pill" 
                className="absolute inset-0 bg-white/5 border border-white/10 rounded-[24px]" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <History className="w-5 h-5 relative z-10" />
            <span className="text-[9px] font-bold uppercase tracking-widest relative z-10">Recents</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-3 transition-all rounded-[24px] relative",
              activeTab === 'profile' ? "text-neon-blue" : "text-white/30 hover:text-white/60"
            )}
          >
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="active-pill" 
                className="absolute inset-0 bg-white/5 border border-white/10 rounded-[24px]" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <User className="w-5 h-5 relative z-10" />
            <span className="text-[9px] font-bold uppercase tracking-widest relative z-10">User</span>
          </button>
        </div>
      </nav>

      <footer className="py-12 pb-40 lg:pb-12 text-center text-white/20 text-[10px] uppercase font-bold tracking-[0.3em]">
        &copy; {new Date().getFullYear()} TutorTrack • Global Session Protocol
      </footer>
    </div>
  );
}
