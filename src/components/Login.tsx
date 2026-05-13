/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { STUDENTS } from '../constants';
import { Student } from '../types';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: Student) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = STUDENTS.find((u) => u.username === username && u.passwordHash === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          x: isShaking ? [-10, 10, -10, 10, 0] : 0
        }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-dark rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative backdrop */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl" />

        <div className="text-center mb-8 relative">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <h2 className="text-3xl font-light tracking-tight mb-2 uppercase">Student <span className="text-indigo-400 font-semibold">Login</span></h2>
          <p className="text-white/40 text-sm">Enter your credentials to access the shared tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-white/70">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-white/20"
                placeholder="Enter Username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-white/70">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-white/20"
                placeholder="••••"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            Access Dashboard
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Authorized Students</p>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-white/40">
            {STUDENTS.map(s => <span key={s.username} className="px-2 py-1 rounded bg-white/5 border border-white/10">{s.name}</span>)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
