/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { format, getDay } from 'date-fns';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare, 
  User, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Pin,
  BookOpen,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { Session, Student } from '../types';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { SCHEDULED_DAYS } from '../constants';

interface SessionModalProps {
  date: Date;
  session: Session | undefined;
  user: Student;
  onClose: () => void;
  onSave: (data: Partial<Session>) => void;
}

export default function SessionModal({ date, session, user, onClose, onSave }: SessionModalProps) {
  const [taught, setTaught] = useState(session ? session.taught : true);
  const [duration, setDuration] = useState(session ? session.duration.toString() : '1.5');
  const [notes, setNotes] = useState(session ? session.notes : '');
  const [homework, setHomework] = useState(session?.homework || '');
  const [classNotes, setClassNotes] = useState<string[]>(session?.classNotes || []);

  const isExtraDay = !SCHEDULED_DAYS.includes(getDay(date));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Check size (rough check for localStorage)
        if (base64String.length > 500000) { // ~500KB
           toast.error("Image too large. Please use a smaller photo.");
           return;
        }
        setClassNotes(prev => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setClassNotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taught && !duration) {
      toast.error("Please enter a valid duration");
      return;
    }

    onSave({
      taught,
      duration: taught ? parseFloat(duration) : 0,
      notes,
      homework,
      classNotes,
      loggedBy: user.name,
      isExtra: isExtraDay && taught
    });
    
    toast.success(session ? "Session info updated" : "Session logged successfully");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg glass-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-light tracking-wide">{format(date, 'MMMM d, yyyy')}</h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">{format(date, 'EEEE')}</p>
                {isExtraDay && (
                  <span className="flex items-center gap-1 text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-indigo-500/20">
                    <Pin className="w-2 h-2" /> Extra Class
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Status Toggle */}
          <div className="space-y-4">
            <label className="block text-[10px] md:text-sm font-bold text-white/40 uppercase tracking-[0.2em]">Attendance Status</label>
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setTaught(true)}
                className={cn(
                  "p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all flex items-center sm:flex-col gap-4 sm:gap-2",
                  taught 
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
                    : "bg-white/5 border-white/10 text-white/30 grayscale hover:grayscale-0"
                )}
              >
                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0", taught ? "bg-emerald-500/20" : "bg-white/5")}>
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="text-left sm:text-center">
                  <span className="block font-bold text-sm md:text-base">পড়ানো হয়েছে</span>
                  <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">Lesson was held</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTaught(false)}
                className={cn(
                  "p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all flex items-center sm:flex-col gap-4 sm:gap-2",
                  !taught 
                    ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.05)]" 
                    : "bg-white/5 border-white/10 text-white/30 grayscale hover:grayscale-0"
                )}
              >
                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0", !taught ? "bg-red-500/20" : "bg-white/5")}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-left sm:text-center">
                  <span className="block font-bold text-sm md:text-base">বন্ধ ছিল</span>
                  <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">Lesson was cancelled</span>
                </div>
              </button>
            </div>
          </div>

          {taught && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <label className="block text-sm font-bold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> Duration (Hours)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {['1.0', '1.5', '2.0', '2.5'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDuration(val)}
                    className={cn(
                      "py-2.5 px-2 rounded-xl border text-sm font-bold transition-all",
                      duration === val ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20" : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    {val}h
                  </button>
                ))}
                <input
                  type="number"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Custom"
                  className="col-span-4 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            <label className="block text-sm font-bold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Optional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
              placeholder="e.g. স্যার অনেক ভালো করে পড়িয়েছেন..."
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Homework (HW)
            </label>
            <textarea
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] resize-none"
              placeholder="e.g. Math Page 42, Reading Chapter 3..."
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" /> Class Notes (Photos)
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              {classNotes.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img} alt={`Note ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label 
                className={cn(
                  "aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/5 hover:border-indigo-500/50 transition-all",
                  classNotes.length >= 6 && "hidden"
                )}
              >
                <ImageIcon className="w-6 h-6 text-white/20" />
                <span className="text-[10px] text-white/40 font-bold uppercase">Add Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>
            {classNotes.length > 0 && (
              <p className="text-[10px] text-white/20 text-center italic">Max 6 photos. Keep files small for speed.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/10">
            {session && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/5 rounded-full w-fit mx-auto text-[10px] text-white/30 uppercase font-bold tracking-[0.2em] border border-white/5">
                <User className="w-3 h-3 text-indigo-400" /> Last logged by {session.loggedBy}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all hover:-translate-y-1 shadow-xl shadow-indigo-600/20"
            >
              <Save className="w-5 h-5" />
              Save Session Log
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
