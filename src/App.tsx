/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User } from 'lucide-react';
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
    const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });

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
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
    toast.success(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    const newState = { isAuthenticated: false, user: null };
    setAuth(newState);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
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
          onUpdateHomework={updateHomework}
        />
      </main>

      <footer className="py-8 text-center text-white/30 text-sm">
        &copy; {new Date().getFullYear()} Tutor Session Tracker • Built for Students
      </footer>
    </div>
  );
}
