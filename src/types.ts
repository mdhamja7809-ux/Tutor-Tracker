/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Session {
  taught: boolean;
  duration: number;
  loggedBy: string;
  notes: string;
  updatedAt: number;
  isExtra?: boolean;
  homework?: string;
  classNotes?: string[]; // Array of base64 image strings
}

export interface HomeworkItem {
  id: string;
  task: string;
  dueDate: string;
  submissionDate?: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface MonthSessions {
  [date: string]: Session; // YYYY-MM-DD
}

export interface TutorStorage {
  sessions: {
    [month: string]: MonthSessions; // YYYY-MM
  };
  homeworks?: HomeworkItem[];
}

export interface Student {
  name: string;
  username: string;
  passwordHash: string;
  color: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Student | null;
}
