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
}

export interface MonthSessions {
  [date: string]: Session; // YYYY-MM-DD
}

export interface TutorStorage {
  sessions: {
    [month: string]: MonthSessions; // YYYY-MM
  };
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
