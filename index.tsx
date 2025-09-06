/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from '@google/genai';
import { useState, useRef, FC, CSSProperties, useEffect, ChangeEvent } from 'react';
import ReactDOM from 'react-dom/client';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import { translations, LanguageCode } from './translations';

// --- UI Components (Styled with CSS to mimic SHADCN) ---

const Card: FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`card ${className || ''}`}>{children}</div>
);

const Button: FC<{ children: React.ReactNode, onClick?: () => void, disabled?: boolean, variant?: 'primary' | 'secondary', className?: string, style?: CSSProperties, 'aria-label'?: string }> = 
({ children, onClick, disabled, variant = 'primary', className, style, 'aria-label': ariaLabel }) => (
  <button onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className || ''}`} style={style} aria-label={ariaLabel}>
    {children}
  </button>
);

// FIX: Updated Textarea to accept id, name, and a more generic onChange handler to fix type errors.
const Textarea: FC<{
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  placeholder: string;
  style?: CSSProperties;
  id?: string;
  name?: string;
}> = ({ value, onChange, placeholder, style, id, name }) => (
  <textarea
    className="input"
    value={value}
    // FIX: Corrected the type cast for the onChange event handler. The namespace 'Change' was incorrect.
    onChange={onChange as (e: ChangeEvent<HTMLTextAreaElement>) => void}
    placeholder={placeholder}
    style={style}
    id={id}
    name={name}
  />
);

const Collapsible: FC<{ title: string, children: React.ReactNode, isOpen: boolean, onToggle: () => void }> = ({ title, children, isOpen, onToggle }) => {
  return (
    <section className="collapsible">
      <div 
        className="collapsible-header" 
        onClick={onToggle} 
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }} 
        aria-expanded={isOpen}
      >
        <h2>{title}</h2>
        <span className={`collapsible-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">▼</span>
      </div>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </section>
  );
};

const Modal: FC<{ message: string, footerText: string }> = ({ message, footerText }) => {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="loading-dialog-title">
      <div className="modal-content">
        <div className="spinner" />
        <div>
          <p id="loading-dialog-title">{message}</p>
          <small className="modal-footer-text">{footerText}</small>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ isOpen, onClose, onConfirm, title, children, t }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="modal-content confirmation-modal">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirmation-modal-body">{children}</div>
        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
          <Button onClick={onConfirm} className="btn-destructive">{t('confirmButton')}</Button>
        </div>
      </div>
    </div>
  );
};

// --- Icon Components ---
const SunIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const MoonIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const SparkIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
  </svg>
);

const FileTextIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
);

const BriefcaseIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const UserIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const ChevronLeftIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);

const MenuIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);

// --- App-specific Components ---
type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  posted: string; // Stored as YYYY-MM-DD
  description: string;
  url: string;
};

type DocumentItem = {
    id: string;
    name: string; // The user-defined document name, e.g., "CV for Stark Industries"
    type: string; // 'cv', 'coverLetter', etc.
    fileName?: string;
    fileContent?: string; // Data URL of the file
    fileMimeType?: string; // Mime type of the file
    lastUpdated?: string; // ISO String
};

type ExtractedJobData = Omit<Job, 'id'>;

const getInitialDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

const initialJobs: Job[] = [
    { id: 1, title: 'Senior Frontend Engineer', company: 'Stark Industries', location: 'New York, NY', posted: getInitialDate(2), url: 'https://example.com/job/1', description: 'Seeking a talented frontend engineer to build next-generation UIs for our advanced projects. Must be proficient in React and Stark-Tech.' },
    { id: 2, title: 'Product Manager', company: 'Wayne Enterprises', location: 'Gotham City', posted: getInitialDate(3), url: 'https://example.com/job/2', description: 'Lead the product development lifecycle for our new line of public safety solutions. Experience in hardware and software is a plus.' },
    { id: 3, title: 'UX/UI Designer', company: 'Cyberdyne Systems', location: 'Sunnyvale, CA', posted: getInitialDate(7), url: 'https://example.com/job/3', description: 'Design intuitive and engaging user experiences for our global defense network. Strong portfolio in complex systems required.' },
    { id: 4, title: 'Backend Developer (Go)', company: 'Oscorp', location: 'New York, NY', posted: getInitialDate(8), url: 'https://example.com/job/4', description: 'Develop and maintain high-performance backend services for genetic research applications. Experience with large-scale databases is essential.' },
    { id: 5, title: 'Data Scientist', company: 'Tyrell Corporation', location: 'Los Angeles, CA', posted: getInitialDate(14), url: 'https://example.com/job/5', description: 'Analyze and interpret complex data sets to create more-human-than-human replicants. Advanced degree in a quantitative field preferred.' },
];


const JobModal: FC<{
  job: Partial<Job> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Partial<Job>) => void;
  onDelete: (jobId: number) => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ job, isOpen, onClose, onSave, onDelete, t }) => {
  const [formData, setFormData] = useState<Partial<Job> | null>(job);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setFormData(job);
  }, [job]);

  if (!isOpen || !formData) return null;

  const isEditing = formData.id !== undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  const handleDelete = () => {
    if (isEditing) {
        setIsConfirmDeleteOpen(true);
    }
  };

  const handleConfirmDelete = () => {
      if(isEditing && formData.id) {
          onDelete(formData.id);
      }
  }

  return (
    <>
      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('deleteJobConfirmationTitle')}
        t={t}
      >
        <p>{t('deleteJobConfirmation')}</p>
      </ConfirmationModal>

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
            
            <label htmlFor="description">{t('jobColumnDescription')}</label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} placeholder="" style={{minHeight: '100px'}} />
          </div>
          <div className="modal-actions">
            {isEditing && (
              <Button onClick={handleDelete} variant="secondary" className="btn-destructive" style={{ marginRight: 'auto' }}>
                {t('deleteButton')}
              </Button>
            )}
            <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
            <Button onClick={handleSave}>{isEditing ? t('saveButton') : t('addButton')}</Button>
          </div>
        </div>
      </div>
    </>
  );
};

const formatDate = (isoDate: string): string => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) { // Adjusted regex to support ISO strings
    return 'N/A';
  }
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return isoDate; // Fallback to original string if something goes wrong
  }
};

const JobsListPage: FC<{ t: (key: keyof typeof translations['EN']) => string }> = ({ t }) => {
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [jobUrl, setJobUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState('');

    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Partial<Job> | null>(null);

    // FIX: Refactored to a two-step process to reliably extract job data from a URL.
    // 1. Use `googleSearch` tool to retrieve text content related to the job URL.
    // 2. Use a second API call with `responseSchema` to extract structured JSON from the text.
    // This approach is more robust and aligns with API best practices for using tools and getting structured output.
    const handleAddJob = async () => {
        if (!jobUrl) {
            setSelectedJob({ posted: getTodayDate() });
            setIsJobModalOpen(true);
            return;
        }

        setIsExtracting(true);
        setExtractionError('');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Step 1: Use Google Search to get information about the job at the URL.
            const searchPrompt = `Please provide the full text of the job description from the following URL: ${jobUrl}`;
            const searchResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: searchPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const jobPageContent = searchResponse.text;
            if (!jobPageContent || jobPageContent.length < 50) { // Simple check for useful content
                 throw new Error("Could not retrieve sufficient information from the URL via search.");
            }

            // Step 2: Extract structured data from the retrieved content.
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

            const validatedData: ExtractedJobData = {
                title: extractedData.title || 'N/A',
                company: extractedData.company || 'N/A',
                location: extractedData.location || 'N/A',
                posted: extractedData.posted || getTodayDate(),
                description: extractedData.description || 'Could not extract description.',
                url: jobUrl,
            };

            setSelectedJob(validatedData);
            setIsJobModalOpen(true);
            setJobUrl('');

        } catch (error) {
            console.error(error);
            setExtractionError(t('errorUrlExtraction'));
        } finally {
            setIsExtracting(false);
        }
    };
    
    const handleOpenEditModal = (job: Job) => {
        setSelectedJob(job);
        setIsJobModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsJobModalOpen(false);
        setSelectedJob(null);
    };
    
    const handleSaveJob = (jobData: Partial<Job>) => {
        if (jobData.id) { // Editing existing job
            setJobs(jobs.map(j => j.id === jobData.id ? { ...j, ...jobData } as Job : j));
        } else { // Adding new job
            const newJob: Job = {
                id: Date.now(),
                title: jobData.title || 'Untitled Job',
                company: jobData.company || 'N/A',
                location: jobData.location || 'N/A',
                posted: jobData.posted || '',
                description: jobData.description || '',
                url: jobData.url || '',
            };
            setJobs([newJob, ...jobs]);
        }
        handleCloseModal();
    };

    const handleDeleteJob = (jobId: number) => {
        setJobs(jobs.filter(j => j.id !== jobId));
        handleCloseModal();
    };
    
    return (
        <>
            <JobModal 
                isOpen={isJobModalOpen}
                onClose={handleCloseModal}
                job={selectedJob}
                onSave={handleSaveJob}
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
                                <span className="spinner" style={{width: '1rem', height: '1rem', marginRight: '0.5rem', borderWidth: '2px'}}/>
                                {t('addingButton')}
                            </>
                        ) : t('addButton')}
                    </Button>
                </div>
                {extractionError && <p className="error-inline">{extractionError}</p>}
            </Card>

            <Card className="jobs-list-card">
                <h3 className="card-header">{t('jobsListTitle')}</h3>
                <div className="table-responsive">
                    <table className="jobs-table">
                        <thead>
                            <tr>
                                <th>{t('jobColumnTitle')}</th>
                                <th>{t('jobColumnCompany')}</th>
                                <th>{t('jobColumnLocation')}</th>
                                <th style={{minWidth: '250px'}}>{t('jobColumnDescription')}</th>
                                <th style={{minWidth: '200px'}}>{t('jobColumnUrl')}</th>
                                <th>{t('jobColumnPosted')}</th>
                                <th>{t('jobColumnActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map(job => (
                                <tr key={job.id}>
                                    <td>{job.title}</td>
                                    <td>{job.company}</td>
                                    <td>{job.location}</td>
                                    <td><div className="truncate-text">{job.description}</div></td>
                                    <td>
                                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="truncate-text">
                                        {job.url}
                                      </a>
                                    </td>
                                    <td>{formatDate(job.posted)}</td>
                                    <td className="job-actions">
                                      <Button onClick={() => handleOpenEditModal(job)} variant="secondary" className="btn-sm">
                                        {t('editButton')}
                                      </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};

const DocumentViewerModal: FC<{
  doc: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ doc, isOpen, onClose, t }) => {
  if (!isOpen || !doc || !doc.fileContent || !doc.fileMimeType) return null;

  const renderContent = () => {
    const mimeType = doc.fileMimeType!;
    const content = doc.fileContent!;

    if (mimeType.startsWith('image/')) {
      return <img src={content} alt={doc.fileName} style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 100px)', display: 'block', margin: '0 auto' }} />;
    }
    if (mimeType === 'application/pdf') {
      return <iframe src={content} style={{ width: '100%', height: 'calc(90vh - 100px)', border: 'none' }} title={doc.fileName}></iframe>;
    }
    if (mimeType.startsWith('text/')) {
        try {
            const base64Content = content.substring(content.indexOf(',') + 1);
            const binaryString = atob(base64Content);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const decoder = new TextDecoder(); // defaults to utf-8
            const textContent = decoder.decode(bytes);
            return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', height: '100%', overflowY: 'auto', margin: 0 }}>{textContent}</pre>;
        } catch (e) {
            console.error("Failed to decode text content:", e);
            return <p>{t('errorPreviewingFile')}</p>
        }
    }
    
    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>{t('previewNotAvailable')}</p>
          <a href={content} download={doc.fileName}>
            <Button>{t('downloadButton')}</Button>
          </a>
        </div>
      );
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="doc-viewer-title">
      <div className="modal-content document-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="document-viewer-header">
            <h2 id="doc-viewer-title">{doc.name} ({doc.fileName})</h2>
            <Button onClick={onClose} variant="secondary" className="btn-icon" aria-label={t('closeButton')}>
                <span style={{fontSize: '1.5rem', lineHeight: '1'}}>&times;</span>
            </Button>
        </div>
        <div className="document-viewer-content">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

const MyDocumentsPage: FC<{ t: (key: keyof typeof translations['EN']) => string }> = ({ t }) => {
    const documentTypes = [
        { id: 'cv', nameKey: 'docTypeCv' as const },
        { id: 'competenceMatrix', nameKey: 'docTypeCompetenceMatrix' as const },
        { id: 'coverLetter', nameKey: 'docTypeCoverLetter' as const },
        { id: 'references', nameKey: 'docTypeReferences' as const },
        { id: 'other', nameKey: 'docTypeOther' as const },
    ];

    const [documents, setDocuments] = useState<DocumentItem[]>(() => [
        { id: 'doc-1', name: 'Standard CV', type: 'cv', fileName: 'my_cv_2024.pdf', lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'doc-2', name: 'Cover Letter for Stark Industries', type: 'coverLetter' },
        { id: 'doc-3', name: 'Professional References', type: 'references', fileName: 'references.docx', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()  },
    ]);

    const [newDocumentName, setNewDocumentName] = useState('');
    const [newDocumentType, setNewDocumentType] = useState('cv');
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [documentToUploadId, setDocumentToUploadId] = useState<string | null>(null);
    const [docToDisplay, setDocToDisplay] = useState<DocumentItem | null>(null);

    const handleUploadClick = (docId: string) => {
        setDocumentToUploadId(docId);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && documentToUploadId) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileContent = e.target?.result as string;
                setDocuments(docs => docs.map(doc =>
                    doc.id === documentToUploadId
                    ? {
                        ...doc,
                        fileName: file.name,
                        fileContent: fileContent,
                        fileMimeType: file.type,
                        lastUpdated: new Date().toISOString()
                      }
                    : doc
                ));
            };
            reader.readAsDataURL(file);
        }
        setDocumentToUploadId(null);
        if(event.target) event.target.value = ''; // Reset file input
    };
    
    const handleDisplayDocument = (doc: DocumentItem) => {
        if (doc.fileContent) {
            setDocToDisplay(doc);
        }
    };

    const handleAddDocument = () => {
        if (!newDocumentName.trim()) return;
        const newDoc: DocumentItem = {
            id: `doc-${Date.now()}`,
            name: newDocumentName,
            type: newDocumentType,
        };
        setDocuments([newDoc, ...documents]);
        setNewDocumentName('');
        setNewDocumentType('cv');
    };
    
    const handleDeleteDocument = (doc: DocumentItem) => {
        setDocToDelete(doc);
        setIsConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        if (docToDelete) {
            setDocuments(documents.filter(d => d.id !== docToDelete.id));
        }
        setIsConfirmDeleteOpen(false);
        setDocToDelete(null);
    };
    
    const getDocTypeName = (typeId: string) => {
        const type = documentTypes.find(dt => dt.id === typeId);
        return type ? t(type.nameKey) : t('docTypeOther');
    };

    return (
        <>
            <DocumentViewerModal
                doc={docToDisplay}
                isOpen={docToDisplay !== null}
                onClose={() => setDocToDisplay(null)}
                t={t}
            />
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('deleteDocumentConfirmationTitle')}
                t={t}
            >
                <p>{t('deleteDocumentConfirmation')}</p>
            </ConfirmationModal>
            
            <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.md,image/*"
            />

            <Card className="add-job-card">
                <h3 className="card-header">{t('addDocumentTitle')}</h3>
                <div className="add-document-form">
                    <div className="form-field">
                        <label htmlFor="newDocName">{t('documentNameLabel')}</label>
                        <input 
                            id="newDocName"
                            type="text" 
                            value={newDocumentName}
                            onChange={e => setNewDocumentName(e.target.value)}
                            placeholder={t('documentNamePlaceholder')}
                            className="input"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddDocument();}}
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="newDocType">{t('documentTypeLabel')}</label>
                        <select
                            id="newDocType"
                            value={newDocumentType}
                            onChange={(e) => setNewDocumentType(e.target.value)}
                            className="input"
                        >
                            {documentTypes.map(type => (
                                <option key={type.id} value={type.id}>{t(type.nameKey)}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={handleAddDocument}>
                        {t('addDocumentButton')}
                    </Button>
                </div>
            </Card>

            <Card className="documents-list-card">
                <h3 className="card-header">{t('myDocumentsListTitle')}</h3>
                <div className="table-responsive">
                    <table className="jobs-table">
                        <thead>
                            <tr>
                                <th>{t('docNameColumn')}</th>
                                <th>{t('docTypeColumn')}</th>
                                <th>{t('docFileNameColumn')}</th>
                                <th>{t('docLastUpdatedColumn')}</th>
                                <th>{t('docActionsColumn')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id}>
                                    <td>{doc.name}</td>
                                    <td>{getDocTypeName(doc.type)}</td>
                                    <td>{doc.fileName || '-'}</td>
                                    <td>{doc.lastUpdated ? formatDate(doc.lastUpdated) : '-'}</td>
                                    <td className="job-actions">
                                        <Button 
                                            onClick={() => handleDisplayDocument(doc)} 
                                            variant="secondary" 
                                            className="btn-sm"
                                            disabled={!doc.fileName}
                                        >
                                            {t('displayButton')}
                                        </Button>
                                        <Button onClick={() => handleUploadClick(doc.id)} variant="secondary" className="btn-sm">{t('uploadButton')}</Button>
                                        <Button 
                                            variant="secondary" 
                                            className="btn-sm btn-destructive" 
                                            onClick={() => handleDeleteDocument(doc)}
                                        >
                                            {t('deleteButton')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};


type Page = 'generator' | 'jobs' | 'documents';

// --- Main Application ---

function App() {
  const DESKTOP_BREAKPOINT = 1024;
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('generator');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);

  // Generator State
  const [theme, setTheme] = useState('light');
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('EN');
  const [maxWords, setMaxWords] = useState(300);
  const [outputFormat, setOutputFormat] = useState('MS Word');
  const [language, setLanguage] = useState('English');
  const [cvContent, setCvContent] = useState(() => localStorage.getItem('cvContent') || '');
  const [jobDescriptionContent, setJobDescriptionContent] = useState(() => localStorage.getItem('jobDescriptionContent') || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [keywords, setKeywords] = useState<string[]>(() => JSON.parse(localStorage.getItem('keywords') || '[]'));
  const [coverLetter, setCoverLetter] = useState(() => localStorage.getItem('coverLetter') || '');
  const [shortProfile, setShortProfile] = useState(() => localStorage.getItem('shortProfile') || '');

  const [isInputOpen, setIsInputOpen] = useState(true);
  const [isOutputOpen, setIsOutputOpen] = useState(false);

  const cvUploadRef = useRef<HTMLInputElement>(null);
  const jobUploadRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof translations['EN']) => {
    return translations[uiLanguage][key] || translations['EN'][key];
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
      const handleResize = () => {
          const isDesktopNow = window.innerWidth >= DESKTOP_BREAKPOINT;
          if (isDesktopNow !== isDesktop) {
              setIsDesktop(isDesktopNow);
              setIsSidebarOpen(isDesktopNow); // Auto open/close on breakpoint change
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [isDesktop]);

  useEffect(() => {
    localStorage.setItem('cvContent', cvContent);
  }, [cvContent]);

  useEffect(() => {
    localStorage.setItem('jobDescriptionContent', jobDescriptionContent);
  }, [jobDescriptionContent]);
  
  useEffect(() => {
    localStorage.setItem('keywords', JSON.stringify(keywords));
  }, [keywords]);

  useEffect(() => {
    localStorage.setItem('coverLetter', coverLetter);
  }, [coverLetter]);

  useEffect(() => {
    localStorage.setItem('shortProfile', shortProfile);
  }, [shortProfile]);


  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setter(e.target?.result as string);
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Reset file input
  };

  const generateContent = async () => {
    if (!cvContent || !jobDescriptionContent) {
      setError(t('errorMissingInputs'));
      return;
    }
    
    setIsInputOpen(false);
    setIsOutputOpen(true);

    setIsLoading(true);
    setError('');
    setKeywords([]);
    setCoverLetter('');
    setShortProfile('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const keywordResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Extract the top 20 most important keywords and skills from this job description. Job Description:\n${jobDescriptionContent}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    keywords: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
          }
      });
      const extractedData = JSON.parse(keywordResponse.text);
      const extractedKeywords = extractedData.keywords || [];
      setKeywords(extractedKeywords);

      const coverLetterPromise = (async () => {
        const prompt = `You are an expert cover letter writer. Using the provided CV and job description, write a compelling and professional cover letter.
        **Instructions:**
        - The entire cover letter must be written in ${language}.
        - The tone should be professional and enthusiastic.
        - The length should be approximately ${maxWords} words.
        - Seamlessly and naturally integrate the most relevant skills and experiences from the CV that match the job description.
        - The following keywords from the job description should guide the content of the letter: ${extractedKeywords.join(', ')}. It is critical that you do not highlight, bold, or list these keywords directly. Instead, use them as inspiration to ensure the letter is highly relevant and flows naturally.
        - The output must only be the cover letter text, without any introductory phrases, concluding remarks, or formatting like markdown.
        **CV:**
        ${cvContent}
        **Job Description:**
        ${jobDescriptionContent}`;

        const clResponseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let fullText = '';
        for await (const chunk of clResponseStream) {
          fullText += chunk.text;
          setCoverLetter(fullText);
        }
      })();

      const shortProfilePromise = (async () => {
        const profilePrompt = `You are an expert career profiler. Using the provided CV and job description keywords, write a compelling and concise professional profile.
**Instructions:**
- The profile must be written in ${language}.
- The tone should be professional and confident.
- The length should be between 50 and 70 words.
- Highlight the most relevant skills and experiences from the CV that directly align with the provided keywords.
- Do not use lists or bullet points. Write it as a single paragraph.
- The output must only be the profile text, without any introductory phrases, concluding remarks, or formatting like markdown.
**CV:**
${cvContent}
**Keywords:**
${extractedKeywords.join(', ')}`;
        const spResponseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: profilePrompt,
        });
        let fullText = '';
        for await (const chunk of spResponseStream) {
          fullText += chunk.text;
          setShortProfile(fullText);
        }
      })();
      
      await Promise.all([coverLetterPromise, shortProfilePromise]);

    } catch (error: any) {
      console.error(error);
      setError(t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocx = (content: string, filename: string) => {
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Poppins",
              // Fix: The size property for docx should be a number (representing half-points) instead of a string.
              size: 20, // 10pt in half-points
            },
          },
        },
      },
      sections: [{
        properties: {},
        children: content.split('\n').map(p => new Paragraph({
          children: [new TextRun(p)]
        }))
      }]
    });
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, filename);
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };
  
  const handleCoverLetterDownload = () => {
      if (outputFormat === 'MS Word') {
          downloadDocx(coverLetter, "Cover-Letter.docx");
      } else {
          copyToClipboard(coverLetter);
      }
  };

  const handleShortProfileDownload = () => {
    if (outputFormat === 'MS Word') {
        downloadDocx(shortProfile, "Short-Profile.docx");
    } else {
        copyToClipboard(shortProfile);
    }
  };
  
  const getModalMessage = () => {
    const translatedOutputFormat = outputFormat === 'MS Word' ? t('outputFormatMsWord') : t('outputFormatGoogleDocs');
    let translatedLanguage;
    switch (language) {
      case 'English':
        translatedLanguage = t('languageEnglish');
        break;
      case 'German':
        translatedLanguage = t('languageGerman');
        break;
      case 'French':
        translatedLanguage = t('languageFrench');
        break;
      default:
        translatedLanguage = language;
    }
    return `${t('generatingModalMessage')} ${maxWords} ${t('words')} ${t('in')} ${translatedLanguage}, ${t('in')} ${translatedOutputFormat} ${t('format')}...`;
  };

  const getPageTitle = () => {
    switch (currentPage) {
        case 'generator': return t('appTitle');
        case 'jobs': return t('jobsListTitle');
        case 'documents': return t('myDocumentsTitle');
        default: return '';
    }
  };

  const getPageSubtitle = () => {
      switch (currentPage) {
        case 'generator': return t('appSubtitle');
        case 'jobs': return t('jobsListSubtitle');
        case 'documents': return t('myDocumentsSubtitle');
        default: return '';
    }
  };

  const sidebarClasses = [
    'sidebar',
    isSidebarOpen ? 'open' : '',
    isDesktop ? '' : 'mobile',
  ].join(' ');
  
  const mainContainerClasses = [
    'main-container',
    isDesktop && isSidebarOpen ? 'sidebar-open' : ''
  ].join(' ');

  return (
    <>
      {isLoading && <Modal message={getModalMessage()} footerText={t('modalFooterText')} />}
      {!isDesktop && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
      
      <nav className={sidebarClasses}>
          <div className="sidebar-header">
            <div className="sidebar-title-container">
              <h1 className="sidebar-title">Pearl Labor</h1>
              <SparkIcon className="sidebar-spark-icon" />
            </div>
          </div>
          <ul className="sidebar-nav">
              <li className={currentPage === 'generator' ? 'active' : ''}>
                  <button onClick={() => setCurrentPage('generator')}>
                      <FileTextIcon />
                      <span>{t('menuGenerator')}</span>
                  </button>
              </li>
              <li className={currentPage === 'jobs' ? 'active' : ''}>
                  <button onClick={() => setCurrentPage('jobs')}>
                      <BriefcaseIcon />
                      <span>{t('menuJobs')}</span>
                  </button>
              </li>
              <li className={currentPage === 'documents' ? 'active' : ''}>
                  <button onClick={() => setCurrentPage('documents')}>
                      <UserIcon />
                      <span>{t('menuDocuments')}</span>
                  </button>
              </li>
          </ul>
      </nav>
      
      <div className={mainContainerClasses}>
          <header className="app-header">
            <div className="header-main-section">
                <Button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    variant="secondary" 
                    className="btn-icon sidebar-trigger"
                    aria-label={isSidebarOpen ? "Collapse menu" : "Expand menu"}
                >
                    <MenuIcon />
                </Button>
                <div className="page-title">
                    <h1>{getPageTitle()}</h1>
                    <p className="app-subtitle">{getPageSubtitle()}</p>
                </div>
            </div>
            <div className="header-controls">
              <select
                  id="uiLanguage"
                  value={uiLanguage}
                  onChange={(e) => setUiLanguage(e.target.value as LanguageCode)}
                  className="input"
                  aria-label={t('selectUiLanguageLabel')}
                >
                  <option value="EN">EN</option>
                  <option value="DE">DE</option>
                  <option value="FR">FR</option>
                </select>
              <Button onClick={toggleTheme} variant="secondary" className="btn-icon" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </Button>
            </div>
          </header>
          
          <main className="main-content">
            {currentPage === 'generator' && (
              <>
                <p className="workflow-description">{t('workflowDescription')}</p>
                <Collapsible title={t('inputFilesTitle')} isOpen={isInputOpen} onToggle={() => setIsInputOpen(!isInputOpen)}>
                  <Card>
                      <div className="card-header-wrapper">
                        <h3 className="card-header">{t('cvHeader')}</h3>
                        <div className="card-header-actions">
                          {cvContent && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                          <Button variant="secondary" onClick={() => cvUploadRef.current?.click()} className="btn-sm">{t('uploadFileButton')}</Button>
                          {cvContent && <Button variant="secondary" onClick={() => setCvContent('')} className="btn-sm">{t('clearButton')}</Button>}
                        </div>
                    </div>
                    <Textarea 
                      value={cvContent}
                      onChange={(e) => setCvContent(e.target.value)}
                      placeholder={t('cvPlaceholder')}
                    />
                    <input type="file" ref={cvUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setCvContent)} accept=".txt,.md" />
                  </Card>
                  <Card>
                    <div className="card-header-wrapper">
                      <h3 className="card-header">{t('jobDescriptionHeader')}</h3>
                      <div className="card-header-actions">
                        {jobDescriptionContent && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                        <Button variant="secondary" onClick={() => jobUploadRef.current?.click()} className="btn-sm">{t('uploadFileButton')}</Button>
                        {jobDescriptionContent && <Button variant="secondary" onClick={() => setJobDescriptionContent('')} className="btn-sm">{t('clearButton')}</Button>}
                      </div>
                    </div>
                    <Textarea 
                      value={jobDescriptionContent}
                      onChange={(e) => setJobDescriptionContent(e.target.value)}
                      placeholder={t('jobDescriptionPlaceholder')}
                    />
                    <input type="file" ref={jobUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setJobDescriptionContent)} accept=".txt,.md" />
                  </Card>
                </Collapsible>
                
                <Card>
                  <div className="generation-controls-wrapper">
                    <Button onClick={generateContent} disabled={isLoading || !cvContent || !jobDescriptionContent}>
                      {t('generateButton')}
                    </Button>
                    <div className="settings-options">
                      <div className="form-group">
                        <label htmlFor="maxWords">{t('maxWordsLabel')}</label>
                        <input 
                          id="maxWords"
                          type="number"
                          value={maxWords}
                          onChange={(e) => setMaxWords(parseInt(e.target.value, 10))}
                          className="input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="outputFormat">{t('outputFormatLabel')}</label>
                        <select 
                          id="outputFormat"
                          value={outputFormat}
                          onChange={(e) => setOutputFormat(e.target.value)}
                          className="input"
                        >
                          <option value="MS Word">{t('outputFormatMsWord')}</option>
                          <option value="Google Docs">{t('outputFormatGoogleDocs')}</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="language">{t('languageLabel')}</label>
                        <select 
                          id="language"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="input"
                        >
                          <option value="English">{t('languageEnglish')}</option>
                          <option value="German">{t('languageGerman')}</option>
                          <option value="French">{t('languageFrench')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
                
                <Collapsible title={t('outputFilesTitle')} isOpen={isOutputOpen} onToggle={() => setIsOutputOpen(!isOutputOpen)}>
                  <Card>
                    <div className="card-header-wrapper">
                      <h3 className="card-header">{t('keywordsHeader')}</h3>
                      <div className="card-header-actions">
                        {keywords.length > 0 && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                        {keywords.length > 0 && <Button variant="secondary" onClick={() => setKeywords([])} className="btn-sm">{t('clearButton')}</Button>}
                      </div>
                    </div>
                    <div className="keywords-container">
                      {keywords.map((kw, i) => <span key={i} className="badge">{kw}</span>)}
                    </div>
                  </Card>
                  <Card>
                    <div className="card-header-wrapper">
                      <h3 className="card-header">{t('shortProfileHeader')}</h3>
                      <div className="card-header-actions">
                        {shortProfile && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                        <Button onClick={handleShortProfileDownload} disabled={!shortProfile} variant="secondary" className="btn-sm">
                          {outputFormat === 'MS Word' ? t('downloadButton') : t('copyButton')}
                        </Button>
                        {shortProfile && <Button variant="secondary" onClick={() => setShortProfile('')} className="btn-sm">{t('clearButton')}</Button>}
                      </div>
                    </div>
                    <Textarea 
                      value={shortProfile}
                      onChange={(e) => setShortProfile(e.target.value)}
                      placeholder={t('shortProfilePlaceholder')}
                    />
                  </Card>
                  <Card>
                      <div className="card-header-wrapper">
                      <h3 className="card-header">{t('generatedCoverLetterHeader')}</h3>
                      <div className="card-header-actions">
                        {coverLetter && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                        <Button onClick={handleCoverLetterDownload} disabled={!coverLetter} variant="secondary" className="btn-sm">
                          {outputFormat === 'MS Word' ? t('downloadButton') : t('copyButton')}
                        </Button>
                        {coverLetter && <Button variant="secondary" onClick={() => setCoverLetter('')} className="btn-sm">{t('clearButton')}</Button>}
                      </div>
                    </div>
                    <Textarea 
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder={t('coverLetterPlaceholder')}
                    />
                  </Card>
                </Collapsible>
              </>
            )}
            {currentPage === 'jobs' && <JobsListPage t={t} />}
            {currentPage === 'documents' && <MyDocumentsPage t={t} />}
          </main>
          
          {error && <div className="error" role="alert">{error}</div>}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);