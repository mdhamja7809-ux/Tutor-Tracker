/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from './types';

export const STUDENTS: Student[] = [
  { name: 'Shobnom', username: 'smj', passwordHash: '8383', color: 'bg-pink-500' },
  { name: 'Hamja', username: 'amir', passwordHash: 'pass2', color: 'bg-blue-500' },
  { name: 'Kotha', username: 'kotha', passwordHash: 'pass3', color: 'bg-purple-500' },
  { name: 'Mishu', username: 'mishu', passwordHash: 'pass4', color: 'bg-green-500' },
];

// Saturday = 6, Monday = 1, Wednesday = 3
export const SCHEDULED_DAYS = [6, 1, 3];

export const BENGALI_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
export const STORAGE_KEY = 'tutorTrackerData';
export const AUTH_STORAGE_KEY = 'tutorAuth';
