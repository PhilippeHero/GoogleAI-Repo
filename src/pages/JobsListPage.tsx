/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, FC, useEffect } from 'react';
import saveAs from 'file-saver';
import { GoogleGenAI, Type } from '@google/genai';
import { translations } from '../../translations';
import { Job, ExtractedJobData, JobStatus } from '../types';
import { getTodayDate, isDateBeforeTomorrow, formatDate } from '../utils';
import { Card, Button, ConfirmationModal, Textarea } from '../components/ui';
import { FileSpreadsheetIcon, SortIcon, CheckCircleIcon } from '../components/icons';

const JobModal: FC<{
  job: Partial<Job> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Partial<Job>) => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ job, isOpen, onClose, onSave, t }) => {
  const [formData, setFormData] = useState<Partial<Job> | null>(job);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(job);
    setError(''); // Clear errors when modal opens or job changes
  }, [job]);

  if (!isOpen || !formData) return null;

  const isEditing = formData.id !== undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'applicationDate' && value === '') {
      setFormData(prev => prev ? { ...prev, applicationDate: null } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
    if (error) {
      setError('');
    }
  };

  const handleSave = () => {
    if (formData) {
      if (formData.status === 'applied' && !formData.applicationDate) {
        setError(t('errorApplicationDateRequired'));
        return;
      }
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="job-dialog-title">
      <div className="modal-content edit-job-modal">
        <h2 id="job-dialog-title">{isEditing ? t('editJobTitle') : t('addJobTitle')}</h2>
        <p>{isEditing ? t('editJobDetailsSubtitle') : t('confirmJobDetailsSubtitle')}</p>
        <div className="form-group-stack">
          <label htmlFor="title">{t('jobColumnTitle')}</label>
          <input id="title" name="title" value={formData.title || ''} onChange={handleChange} className="input" />

          <label htmlFor="company">{t('jobColumnCompany')}</label>
          <input id="company" name="company" value={formData.company || ''} onChange={handleChange} className="input" />
          
          <label htmlFor="location">{t('jobColumnLocation')}</label>
          <input id="location" name="location" value={formData.location || ''} onChange={handleChange} className="input" />

          <label htmlFor="url">{t('jobColumnUrl')}</label>
          <input id="url" name="url" type="url" value={formData.url || ''} onChange={handleChange} className="input" />
          
          <label htmlFor="posted">{t('jobColumnPosted')}</label>
          <input id="posted" name="posted" type="date" value={formData.posted || ''} onChange={handleChange} className="input" />

          <label htmlFor="status">{t('jobColumnStatus')}</label>
            <select id="status" name="status" value={formData.status || 'to apply'} onChange={handleChange} className="input">
                <option value="to apply">{t('jobStatusToApply')}</option>
                <option value="do not apply">{t('jobStatusDoNotApply')}</option>
                <option value="applied">{t('jobStatusApplied')}</option>
            </select>
          
          <label htmlFor="applicationDate">
            {t('jobColumnApplicationDate')}
            {formData.status === 'applied' && <span style={{ color: 'hsl(var(--destructive))', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <div className="field-with-icon">
            <input id="applicationDate" name="applicationDate" type="date" value={formData.applicationDate || ''} onChange={handleChange} className="input" />
            {isDateBeforeTomorrow(formData.applicationDate || null) && (
              <span title={t('applicationSubmittedTooltip')}>
                <CheckCircleIcon className="checkmark-icon" />
              </span>
            )}
          </div>
          {error && <p className="error-inline" style={{ marginTop: '0.25rem' }}>{error}</p>}


          <label htmlFor="description">{t('jobColumnDescription')}</label>
          <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} placeholder="" style={{minHeight: '100px'}} />
        
          <label htmlFor="internalNotes">{t('jobColumnInternalNotes')}</label>
          <Textarea id="internalNotes" name="internalNotes" value={formData.internalNotes || ''} onChange={handleChange} placeholder={t('internalNotesPlaceholder')} style={{minHeight: '100px'}} />
        </div>
        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
          <Button onClick={handleSave}>{isEditing ? t('saveButton') : t('addButton')}</Button>
        </div>
      </div>
    </div>
  );
};

const JobEditSidePane: FC<{
  job: Partial<Job> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Partial<Job>) => void;
  onDelete: (jobId: string) => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ job, isOpen, onClose, onSave, onDelete, t }) => {
  const [formData, setFormData] = useState<Partial<Job> | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(job);
    setError('');
  }, [job]);

  if (!formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'applicationDate' && value === '') {
      setFormData(prev => prev ? { ...prev, applicationDate: null } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
    if (error) {
        setError('');
    }
  };

  const handleSave = () => {
    if (formData) {
      if (formData.status === 'applied' && !formData.applicationDate) {
        setError(t('errorApplicationDateRequired'));
        return;
      }
      setError('');
      onSave(formData);
    }
  };

  const handleDelete = () => {
    if (formData?.id) {
        setIsConfirmDeleteOpen(true);
    }
  };
  
  const handleConfirmDelete = () => {
      if(formData?.id) {
          onDelete(formData.id);
      }
      setIsConfirmDeleteOpen(false);
  }

  return (
    <>
      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('deleteJobConfirmationTitle')}
        t={t}
        className="modal-overlay-top"
      >
        <p>{t('deleteJobConfirmation')}</p>
      </ConfirmationModal>
      
      <div className={`side-pane-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`side-pane ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="side-pane-title">
        <div className="side-pane-header">
            <h2 id="side-pane-title">{t('editJobTitle')}</h2>
              <Button onClick={onClose} variant="secondary" className="btn-icon" aria-label={t('closeButton')}>
                <span style={{fontSize: '1.5rem', lineHeight: '1'}}>&times;</span>
            </Button>
        </div>
        <div className="side-pane-body">
          <p>{t('editJobDetailsSubtitle')}</p>
          <div className="side-pane-columns">
            <div className="side-pane-column">
              <div className="form-group-stack">
                <label htmlFor="edit-title">{t('jobColumnTitle')}</label>
                <input id="edit-title" name="title" value={formData.title || ''} onChange={handleChange} className="input" />

                <label htmlFor="edit-company">{t('jobColumnCompany')}</label>
                <input id="edit-company" name="company" value={formData.company || ''} onChange={handleChange} className="input" />
                
                <label htmlFor="edit-location">{t('jobColumnLocation')}</label>
                <input id="edit-location" name="location" value={formData.location || ''} onChange={handleChange} className="input" />

                <label htmlFor="edit-url">{t('jobColumnUrl')}</label>
                <input id="edit-url" name="url" type="url" value={formData.url || ''} onChange={handleChange} className="input" />

                <label htmlFor="edit-posted">{t('jobColumnPosted')}</label>
                <input id="edit-posted" name="posted" type="date" value={formData.posted || ''} onChange={handleChange} className="input" />
                
                <div className="form-group-row">
                    <div className="form-group-column">
                        <label htmlFor="edit-status">{t('jobColumnStatus')}</label>
                        <select id="edit-status" name="status" value={formData.status || 'to apply'} onChange={handleChange} className="input">
                            <option value="to apply">{t('jobStatusToApply')}</option>
                            <option value="do not apply">{t('jobStatusDoNotApply')}</option>
                            <option value="applied">{t('jobStatusApplied')}</option>
                        </select>
                    </div>
                    <div className="form-group-column">
                        <label htmlFor="edit-applicationDate">
                            {t('jobColumnApplicationDate')}
                            {formData.status === 'applied' && <span style={{ color: 'hsl(var(--destructive))', marginLeft: '0.25rem' }}>*</span>}
                        </label>
                        <div className="field-with-icon">
                            <input id="edit-applicationDate" name="applicationDate" type="date" value={formData.applicationDate || ''} onChange={handleChange} className="input" />
                            {isDateBeforeTomorrow(formData.applicationDate) && (
                                <span title={t('applicationSubmittedTooltip')}>
                                    <CheckCircleIcon className="checkmark-icon" />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {error && <p className="error-inline" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>{error}</p>}
                <div className="form-group-expand">
                  <label htmlFor="edit-description">{t('jobColumnDescription')}</label>
                  <Textarea id="edit-description" name="description" value={formData.description || ''} onChange={handleChange} placeholder="" />
                </div>
              </div>
            </div>
            <div className="side-pane-column">
              <div className="form-group-stack">
                <div className="form-group-expand">
                    <label htmlFor="edit-internalNotes">{t('jobColumnInternalNotes')}</label>
                    <Textarea id="edit-internalNotes" name="internalNotes" value={formData.internalNotes || ''} onChange={handleChange} placeholder={t('internalNotesPlaceholder')} />
                </div>
                <div className="form-group-expand">
                    <label htmlFor="edit-myShortProfile">{t('jobColumnMyShortProfile')}</label>
                    <Textarea id="edit-myShortProfile" name="myShortProfile" value={formData.myShortProfile || ''} onChange={handleChange} placeholder="" />
                </div>
                <div className="form-group-expand" style={{ flexGrow: 2 }}>
                    <label htmlFor="edit-myCoverLetter">{t('jobColumnMyCoverLetter')}</label>
                    <Textarea id="edit-myCoverLetter" name="myCoverLetter" value={formData.myCoverLetter || ''} onChange={handleChange} placeholder="" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="side-pane-footer">
            <Button onClick={handleDelete} variant="secondary" className="btn-destructive" style={{ marginRight: 'auto' }}>
            {t('deleteButton')}
          </Button>
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
          <Button onClick={handleSave}>{t('saveButton')}</Button>
        </div>
      </div>
    </>
  );
};


export const JobsListPage: FC<{
    t: (key: keyof typeof translations['EN']) => string;
    jobs: Job[];
    onAddJob: (job: Omit<Job, 'id' | 'user_id' | 'created_at'>) => Promise<{ data: any; error: any; }>;
    onUpdateJob: (job: Partial<Job>) => void;
    onDeleteJob: (jobId: string) => void;
}> = ({ t, jobs, onAddJob, onUpdateJob, onDeleteJob }) => {
    type SortConfig = { key: keyof Job; direction: 'ascending' | 'descending' } | null;

    const [jobUrl, setJobUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState('');
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [isSidePaneOpen, setIsSidePaneOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Partial<Job> | null>(null);

    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const sortedAndFilteredJobs = useMemo(() => {
        let processableJobs = [...jobs];
        
        // Filtering
        if (filterStartDate || filterEndDate) {
            processableJobs = processableJobs.filter(job => {
                const jobDate = job.posted;
                if (filterStartDate && jobDate < filterStartDate) return false;
                if (filterEndDate && jobDate > filterEndDate) return false;
                return true;
            });
        }
        
        // Sorting
        if (sortConfig !== null) {
            processableJobs.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';
                let comparison = 0;
                
                if (typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.localeCompare(valB);
                } else {
                    if (valA < valB) comparison = -1;
                    else if (valA > valB) comparison = 1;
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }

        return processableJobs;
    }, [jobs, sortConfig, filterStartDate, filterEndDate]);

    const requestSort = (key: keyof Job) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleAddJob = async () => {
        if (!jobUrl) {
            setSelectedJob({ posted: getTodayDate(), status: 'to apply', applicationDate: null });
            setIsJobModalOpen(true);
            return;
        }

        setIsExtracting(true);
        setExtractionError('');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const searchPrompt = `Please provide the full text of the job description from the following URL: ${jobUrl}`;
            const searchResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: searchPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const jobPageContent = searchResponse.text;
            if (!jobPageContent || jobPageContent.length < 50) {
                 throw new Error("Could not retrieve sufficient information from the URL via search.");
            }

            const extractionPrompt = `From the following job posting text, extract the job title, company, location, posted date, and a brief description.
- For the "posted" key, you MUST provide the date in YYYY-MM-DD format. If the date is relative (e.g., "3 days ago"), calculate the absolute date based on today's date. If it is impossible to determine the date, use an empty string.
- For the "description", provide a brief summary of 50-100 words.
- If any piece of information cannot be found, use an empty string "" as the value for that key.

Job Posting Text:
${jobPageContent}`;

            const extractResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: extractionPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            company: { type: Type.STRING },
                            location: { type: Type.STRING },
                            posted: { type: Type.STRING, description: "The date in YYYY-MM-DD format. If not found, use empty string." },
                            description: { type: Type.STRING, description: "A brief summary of 50-100 words." },
                        },
                        required: ["title", "company", "location", "posted", "description"]
                    }
                }
            });
            
            const extractedData = JSON.parse(extractResponse.text.trim());

            const validatedData: Omit<ExtractedJobData, 'internalNotes'> = {
                title: extractedData.title || 'N/A',
                company: extractedData.company || 'N/A',
                location: extractedData.location || 'N/A',
                posted: extractedData.posted || getTodayDate(),
                description: extractedData.description || 'Could not extract description.',
                url: jobUrl,
            };

            setSelectedJob({ ...validatedData, status: 'to apply', applicationDate: null });
            setIsJobModalOpen(true);
            setJobUrl('');

        } catch (error) {
            console.error(error);
            setExtractionError(t('errorUrlExtraction'));
        } finally {
            setIsExtracting(false);
        }
    };
    
    const handleOpenEditPane = (job: Job) => {
        setSelectedJob(job);
        setIsSidePaneOpen(true);
    };

    const handleCloseAll = () => {
        setIsJobModalOpen(false);
        setIsSidePaneOpen(false);
        setSelectedJob(null);
    };
    
    const handleSaveJob = (jobData: Partial<Job>) => {
        if (jobData.id) {
            onUpdateJob(jobData);
        } else {
            const newJobData: Omit<Job, 'id' | 'user_id' | 'created_at'> = {
                title: jobData.title || '',
                company: jobData.company || '',
                location: jobData.location || '',
                posted: jobData.posted || getTodayDate(),
                applicationDate: jobData.applicationDate || null,
                description: jobData.description || '',
                url: jobData.url || '',
                status: jobData.status || 'to apply',
                internalNotes: jobData.internalNotes || '',
                myShortProfile: jobData.myShortProfile || '',
                myCoverLetter: jobData.myCoverLetter || '',
            };
            onAddJob(newJobData);
        }
        handleCloseAll();
    };

    const handleDeleteJob = (jobId: string) => {
        onDeleteJob(jobId);
        handleCloseAll();
    };

    const getJobStatusName = (status: JobStatus) => {
        switch (status) {
            case 'to apply': return t('jobStatusToApply');
            case 'do not apply': return t('jobStatusDoNotApply');
            case 'applied': return t('jobStatusApplied');
            default: return status;
        }
    };

    const handleExport = () => {
        const headers = [t('jobColumnTitle'), t('jobColumnCompany'), t('jobColumnLocation'), t('jobColumnDescription'), t('jobColumnInternalNotes'), t('jobColumnUrl'), t('jobColumnPosted'), t('jobColumnApplicationDate'), t('jobColumnStatus')];
        const escapeCsv = (str: string) => `"${String(str || '').replace(/"/g, '""')}"`;

        const csvContent = [
            headers.join(','),
            ...sortedAndFilteredJobs.map(job => [
                escapeCsv(job.title),
                escapeCsv(job.company),
                escapeCsv(job.location),
                escapeCsv(job.description),
                escapeCsv(job.internalNotes || ''),
                escapeCsv(job.url),
                escapeCsv(formatDate(job.posted)),
                escapeCsv(formatDate(job.applicationDate)),
                escapeCsv(getJobStatusName(job.status)),
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'jobs-export.xls');
    };

    const getSortClasses = (key: keyof Job) => {
        if (!sortConfig || sortConfig.key !== key) return 'sortable-header';
        return `sortable-header sorted-${sortConfig.direction}`;
    };
    
    return (
        <>
            <JobModal 
                isOpen={isJobModalOpen}
                onClose={handleCloseAll}
                job={selectedJob}
                onSave={handleSaveJob}
                t={t}
            />
            <JobEditSidePane
                isOpen={isSidePaneOpen}
                job={selectedJob}
                onClose={handleCloseAll}
                onSave={onUpdateJob}
                onDelete={handleDeleteJob}
                t={t}
            />
            <Card className="add-job-card">
                <h3 className="card-header">{t('addJobFromUrlTitle')}</h3>
                <div className="add-job-controls">
                    <input 
                        type="url" 
                        value={jobUrl}
                        onChange={e => setJobUrl(e.target.value)}
                        placeholder={t('jobUrlPlaceholder')}
                        className="input"
                        disabled={isExtracting}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddJob();}}
                    />
                    <Button onClick={handleAddJob} disabled={isExtracting}>
                        {isExtracting ? (
                            <>
                                <span className="spinner" style={{width: '1rem', height: '1rem', borderWidth: '2px'}}/>
                                {t('addingButton')}
                            </>
                        ) : t('addButton')}
                    </Button>
                </div>
                {extractionError && <p className="error-inline">{extractionError}</p>}
            </Card>

            <Card className="jobs-list-card">
                <div className="card-header-wrapper">
                  <h3 className="card-header">{t('jobsListTitle')}</h3>
                  <div className="card-header-actions">
                    <Button onClick={handleExport} variant="secondary" className="btn-icon" aria-label={t('exportButtonLabel')} title={t('exportButtonLabel')}>
                      <FileSpreadsheetIcon />
                    </Button>
                  </div>
                </div>

                <div className="table-filters">
                  <div className="form-group">
                    <label htmlFor="startDate">{t('filterDateStart')}</label>
                    <input type="date" id="startDate" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="input"/>
                  </div>
                  <div className="form-group">
                    <label htmlFor="endDate">{t('filterDateEnd')}</label>
                    <input type="date" id="endDate" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="input"/>
                  </div>
                  <Button variant="secondary" className="btn-filter-clear" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}>{t('clearFilterButton')}</Button>
                </div>

                <div className="table-responsive">
                    <table className="jobs-table">
                        <thead>
                            <tr>
                                <th className={getSortClasses('title')} onClick={() => requestSort('title')}>
                                  <div className="header-content"><span>{t('jobColumnTitle')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th className={getSortClasses('company')} onClick={() => requestSort('company')}>
                                  <div className="header-content"><span>{t('jobColumnCompany')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th className={getSortClasses('location')} onClick={() => requestSort('location')}>
                                  <div className="header-content"><span>{t('jobColumnLocation')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th style={{minWidth: '250px'}} className={getSortClasses('description')} onClick={() => requestSort('description')}>
                                  <div className="header-content"><span>{t('jobColumnDescription')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th style={{minWidth: '250px'}} className={getSortClasses('internalNotes')} onClick={() => requestSort('internalNotes')}>
                                  <div className="header-content"><span>{t('jobColumnInternalNotes')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th style={{minWidth: '200px'}} className={getSortClasses('url')} onClick={() => requestSort('url')}>
                                  <div className="header-content"><span>{t('jobColumnUrl')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th className={getSortClasses('posted')} onClick={() => requestSort('posted')}>
                                  <div className="header-content"><span>{t('jobColumnPosted')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th className={getSortClasses('status')} onClick={() => requestSort('status')}>
                                    <div className="header-content"><span>{t('jobColumnStatus')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                                <th className={getSortClasses('applicationDate')} onClick={() => requestSort('applicationDate')}>
                                  <div className="header-content"><span>{t('jobColumnApplicationDate')}</span><SortIcon className="sort-icon" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredJobs.map(job => (
                                <tr key={job.id} onClick={() => handleOpenEditPane(job)}>
                                    <td>{job.title}</td>
                                    <td>{job.company}</td>
                                    <td>{job.location}</td>
                                    <td><div className="truncate-text">{job.description}</div></td>
                                    <td><div className="truncate-text">{job.internalNotes}</div></td>
                                    <td>
                                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="truncate-text" onClick={(e) => e.stopPropagation()}>
                                        {job.url}
                                      </a>
                                    </td>
                                    <td>{formatDate(job.posted)}</td>
                                    <td>{getJobStatusName(job.status)}</td>
                                    <td>
                                      <div className="field-with-icon justify-start">
                                        <span>{formatDate(job.applicationDate)}</span>
                                        {isDateBeforeTomorrow(job.applicationDate) && (
                                          <span title={t('applicationSubmittedTooltip')}><CheckCircleIcon className="checkmark-icon"/></span>
                                        )}
                                      </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <footer className="landing-footer">
                <p>AI driven Transformational Excellence</p>
            </footer>
        </>
    );
};