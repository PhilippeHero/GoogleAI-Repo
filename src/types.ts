/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { LanguageCode } from '../translations';

export type JobStatus = 'to apply' | 'do not apply' | 'applied';

export type Job = {
  id: string; // UUID from Supabase
  user_id: string;
  created_at: string;
  title: string;
  company: string;
  location: string;
  posted: string; // Stored as YYYY-MM-DD
  applicationDate: string | null; // Stored as YYYY-MM-DD
  description: string;
  url: string;
  status: JobStatus;
  internalNotes?: string;
  myShortProfile?: string;
  myCoverLetter?: string;
};

export type DocumentItem = {
    id: string; // UUID from Supabase
    user_id: string;
    created_at: string;
    name: string; // The user-defined document name, e.g., "CV for Stark Industries"
    type: string; // 'cv', 'coverLetter', etc.
    fileName?: string;
    storagePath?: string; // Path to the file in Supabase Storage
    fileMimeType?: string; // Mime type of the file
    updatedAt?: string; // ISO String
    textExtract?: string;
};

export type ExtractedJobData = Omit<Job, 'id' | 'applicationDate' | 'status' | 'user_id' | 'created_at'>;

export type Page = 'landing' | 'generator' | 'jobs' | 'documents' | 'profile' | 'perfect-week';

export type Gender = 'man' | 'woman' | 'other' | 'unspecified';

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  defaultLanguage: LanguageCode;
  gender: Gender;
};

export type WeeklyStat = {
  id?: string; // UUID from Supabase, if it exists
  user_id: string;
  year: number;
  weekNumber: number;
  // Derived fields, not in DB
  yearWeek: string; // "YYYY-WW"
  applicationCount: number;
  // Editable fields, in DB
  interviews: number;
  newContacts: number;
};