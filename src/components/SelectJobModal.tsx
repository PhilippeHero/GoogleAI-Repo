/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC } from 'react';
import { Button } from './ui';
import { Job } from '../types';
import { translations } from '../../translations';


export const SelectJobModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (job: Job) => void;
  jobs: Job[];
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ isOpen, onClose, onSelect, jobs, t }) => {
  if (!isOpen) return null;

  const handleSelect = (job: Job) => {
      onSelect(job);
      onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="select-job-title">
      <div className="modal-content selection-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="select-job-title">{t('selectJobTitle')}</h2>
        {jobs.length > 0 ? (
            <ul className="selection-list">
                {jobs.map(job => (
                    <li key={job.id}>
                        <button onClick={() => handleSelect(job)}>
                            <span className="selection-list-name">{job.title}</span>
                            <span className="selection-list-filename">{job.company} - {job.location}</span>
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
