/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type JobStatus = 'to apply' | 'do not apply' | 'applied';

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  posted: string; // Stored as YYYY-MM-DD
  applicationDate: string; // Stored as YYYY-MM-DD
  description: string;
  url: string;
  status: JobStatus;
};

export type DocumentItem = {
    id: string;
    name: string; // The user-defined document name, e.g., "CV for Stark Industries"
    type: string; // 'cv', 'coverLetter', etc.
    fileName?: string;
    fileContent?: string; // Data URL of the file
    fileMimeType?: string; // Mime type of the file
    lastUpdated?: string; // ISO String
};

export type ExtractedJobData = Omit<Job, 'id' | 'applicationDate' | 'status'>;

export type Page = 'landing' | 'generator' | 'jobs' | 'documents';