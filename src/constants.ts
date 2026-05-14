/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from './types';

export const STUDENTS: Student[] = [
  { 
    name: 'Shobnom', 
    username: 'smj', 
    passwordHash: '8383', 
    color: 'bg-pink-500',
    idNumber: 'S-2026-001',
    grade: 'Grade 10',
    joiningDate: 'Jan 2024'
  },
  { 
    name: 'Hamja', 
    username: 'amir', 
    passwordHash: 'pass2', 
    color: 'bg-blue-500',
    idNumber: 'H-2026-002',
    grade: 'Grade 10',
    joiningDate: 'Feb 2024'
  },
  { 
    name: 'Kotha', 
    username: 'kotha', 
    passwordHash: 'pass3', 
    color: 'bg-purple-500',
    idNumber: 'K-2026-003',
    grade: 'Grade 10',
    joiningDate: 'Mar 2024'
  },
  { 
    name: 'Mishu', 
    username: 'mishu', 
    passwordHash: 'pass4', 
    color: 'bg-green-500',
    idNumber: 'M-2026-004',
    grade: 'Grade 10',
    joiningDate: 'Apr 2024'
  },
];

// Saturday = 6, Monday = 1, Wednesday = 3
export const SCHEDULED_DAYS = [6, 1, 3];

export const BENGALI_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
export const STORAGE_KEY = 'tutorTrackerData';
export const AUTH_STORAGE_KEY = 'tutorAuth';
