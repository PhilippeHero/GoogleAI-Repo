/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useMemo } from 'react';
import { Button } from './ui';
import { Job } from '../types';
import { translations } from '../../translations';


export const SelectJobModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (job: Job) => void;
  jobs: Job[];
  t: (key: keyof typeof translations['EN']) => string;
  recommendedJobId?: number | null;
}> = ({ isOpen, onClose, onSelect, jobs, t, recommendedJobId }) => {
  if (!isOpen) return null;

  const handleSelect = (job: Job) => {
      onSelect(job);
      onClose();
  };
  
  const sortedJobs = useMemo(() => {
    if (!recommendedJobId) return jobs;

    const recommendedJob = jobs.find(j => j.id === recommendedJobId);
    if (!recommendedJob) return jobs;

    const otherJobs = jobs.filter(j => j.id !== recommendedJobId);
    return [recommendedJob, ...otherJobs];
  }, [jobs, recommendedJobId]);


  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="select-job-title">
      <div className="modal-content selection-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="select-job-title">{t('selectJobTitle')}</h2>
        {sortedJobs.length > 0 ? (
            <ul className="selection-list">
                {sortedJobs.map(job => (
                    <li key={job.id}>
                        <button 
                            onClick={() => handleSelect(job)}
                            className={recommendedJobId === job.id ? 'recommended' : ''}
                        >
                            <div>
                                <span className="selection-list-name">{job.title}</span>
                                <span className="selection-list-filename">{job.company} - {job.location}</span>
                            </div>
                            {recommendedJobId === job.id && <span className="recommended-indicator">★</span>}
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p>{t('noJobsAvailable')}</p>
        )}
        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
        </div>
      </div>
    </div>
  );
};