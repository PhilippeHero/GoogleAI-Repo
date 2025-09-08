/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useRef, useEffect, FC } from 'react';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';

// Fix: Use Firebase v8 compat imports and types
// Fix: Changed firebase/app to firebase/compat/app to use v8 compatibility mode and resolve type errors.
import firebase from 'firebase/compat/app';
import { auth } from './firebase';

import { translations, LanguageCode } from '../translations';
import { Page, DocumentItem, Job, UserProfile } from './types';
import { getInitialDate } from './utils';
import { Button, Modal, DropdownMenu, ConfirmationModal } from './components/ui';
import { AuthModal } from './components/AuthModal';
import { SelectCvModal } from './components/SelectCvModal';
import { SelectJobModal } from './components/SelectJobModal';
import { HomeIcon, SunIcon, MoonIcon, SparkIcon, FileTextIcon, BriefcaseIcon, UserIcon, MenuIcon, LogInIcon, LogOutIcon, UserCircleIcon } from './components/icons';
import { LandingPage } from './pages/LandingPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { JobsListPage } from './pages/JobsListPage';
import { MyDocumentsPage } from './pages/MyDocumentsPage';
import { ProfilePage } from './pages/ProfilePage';

const initialJobs: Job[] = [
    { id: 1, title: 'Senior Frontend Engineer', company: 'Stark Industries', location: 'New York, NY', posted: getInitialDate(2), applicationDate: getInitialDate(1), url: 'https://example.com/job/1', description: 'Seeking a talented frontend engineer to build next-generation UIs for our advanced projects. Must be proficient in React and Stark-Tech.', status: 'applied', internalNotes: 'Followed up via email on ' + getInitialDate(0) + '. Recruiter mentioned a 2-week timeline.', myShortProfile: '', myCoverLetter: '' },
    { id: 2, title: 'Product Manager', company: 'Wayne Enterprises', location: 'Gotham City', posted: getInitialDate(3), applicationDate: getInitialDate(2), url: 'https://example.com/job/2', description: 'Lead the product development lifecycle for our new line of public safety solutions. Experience in hardware and software is a plus.', status: 'applied', internalNotes: '', myShortProfile: '', myCoverLetter: '' },
    { id: 3, title: 'UX/UI Designer', company: 'Cyberdyne Systems', location: 'Sunnyvale, CA', posted: getInitialDate(7), applicationDate: '', url: 'https://example.com/job/3', description: 'Design intuitive and engaging user experiences for our global defense network. Strong portfolio in complex systems required.', status: 'to apply', internalNotes: 'Need to tailor my portfolio before applying. Focus on the Skynet project.', myShortProfile: '', myCoverLetter: '' },
    { id: 4, title: 'Backend Developer (Go)', company: 'Oscorp', location: 'New York, NY', posted: getInitialDate(8), applicationDate: getInitialDate(5), url: 'https://example.com/job/4', description: 'Develop and maintain high-performance backend services for genetic research applications. Experience with large-scale databases is essential.', status: 'applied', internalNotes: '', myShortProfile: '', myCoverLetter: '' },
    { id: 5, title: 'Data Scientist', company: 'Tyrell Corporation', location: 'Los Angeles, CA', posted: getInitialDate(14), applicationDate: '', url: 'https://example.com/job/5', description: 'Analyze and interpret complex data sets to create more-human-than-human replicants. Advanced degree in a quantitative field preferred.', status: 'to apply', internalNotes: '', myShortProfile: '', myCoverLetter: '' },
];

const initialDocuments: DocumentItem[] = [
    { id: 'doc-1', name: 'Standard CV', type: 'cv', fileName: 'my_cv_2024.pdf', lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), textExtract: 'Key skills: React, TypeScript, GraphQL. Over 5 years of experience building scalable web applications.' },
    { id: 'doc-2', name: 'Cover Letter for Stark Industries', type: 'coverLetter', textExtract: 'Expressing strong interest in the Senior Frontend Engineer position and highlighting alignment with Stark Industries\' mission.' },
    { id: 'doc-3', name: 'Professional References', type: 'references', fileName: 'references.docx', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), textExtract: ''  },
];


export const App: FC = () => {
  const DESKTOP_BREAKPOINT = 1024;
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global State
  const [theme, setTheme] = useState('light');
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('DE');
  // Fix: Use Firebase v8 User type
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isAuthenticated = !!user;
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  // Generator State
  const [cvContent, setCvContent] = useState(() => localStorage.getItem('cvContent') || '');
  const [jobDescriptionContent, setJobDescriptionContent] = useState(() => localStorage.getItem('jobDescriptionContent') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<React.ReactNode>('');
  const [error, setError] = useState('');
  const [keywords, setKeywords] = useState<string[]>(() => JSON.parse(localStorage.getItem('keywords') || '[]'));
  const [coverLetter, setCoverLetter] = useState(() => localStorage.getItem('coverLetter') || '');
  const [shortProfile, setShortProfile] = useState(() => localStorage.getItem('shortProfile') || '');
  const [isInputOpen, setIsInputOpen] = useState(true);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [sourceJob, setSourceJob] = useState<Job | null>(null);

  // Shared State
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const savedDocuments = localStorage.getItem('documents');
    return savedDocuments ? JSON.parse(savedDocuments) : initialDocuments;
  });
  const [jobs, setJobs] = useState<Job[]>(() => {
    const savedJobs = localStorage.getItem('jobs');
    if (savedJobs) {
        return JSON.parse(savedJobs);
    }
    return initialJobs;
  });
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    const savedProfiles = localStorage.getItem('userProfiles');
    return savedProfiles ? JSON.parse(savedProfiles) : [];
  });
  const [isSelectCvModalOpen, setIsSelectCvModalOpen] = useState(false);
  const [isSelectJobModalOpen, setIsSelectJobModalOpen] = useState(false);

  const t = (key: keyof typeof translations['EN']) => {
    return translations[uiLanguage][key] || translations['EN'][key];
  };
  
  useEffect(() => {
    setIsSidebarOpen(false);
    
    const handleResize = () => {
        const isDesktopNow = window.innerWidth >= DESKTOP_BREAKPOINT;
        setIsDesktop(isDesktopNow);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            // Check if a profile exists, if not, create one
            const profileExists = userProfiles.some(p => p.uid === currentUser.uid);
            if (!profileExists) {
                const nameParts = currentUser.displayName?.split(' ') || [];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const newProfile: UserProfile = {
                    uid: currentUser.uid,
                    firstName: firstName,
                    lastName: lastName,
                    defaultLanguage: uiLanguage,
                    gender: 'unspecified',
                };
                setUserProfiles(prev => [...prev, newProfile]);
            }
        }
        setIsAuthLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Persist generator content to localStorage
  useEffect(() => { localStorage.setItem('cvContent', cvContent); }, [cvContent]);
  useEffect(() => { localStorage.setItem('jobDescriptionContent', jobDescriptionContent); }, [jobDescriptionContent]);
  useEffect(() => { localStorage.setItem('keywords', JSON.stringify(keywords)); }, [keywords]);
  useEffect(() => { localStorage.setItem('coverLetter', coverLetter); }, [coverLetter]);
  useEffect(() => { localStorage.setItem('shortProfile', shortProfile); }, [shortProfile]);
  useEffect(() => { localStorage.setItem('jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('userProfiles', JSON.stringify(userProfiles)); }, [userProfiles]);


  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = () => {
      // The onAuthStateChanged listener will handle the user state update.
      // This function's only job is to close the modal.
      setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };
  
  const handleConfirmLogout = async () => {
      try {
          await auth.signOut();
          setIsLogoutConfirmOpen(false);
          setCurrentPage('landing'); // Redirect to landing page on logout
      } catch (error) {
          console.error("Error signing out: ", error);
          // Optionally set an error message to display to the user
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setter('');

    try {
        if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
            setter(await file.text());
        } else if (file.type === 'application/pdf') {
            setLoadingMessage(t('extractingPdfText'));
            setIsLoading(true);
            
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                fullText += pageText + '\n';
            }
            setter(fullText.trim());
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.name.endsWith('.docx') ||
            file.name.endsWith('.doc')
        ) {
            setLoadingMessage(t('extractingDocxText'));
            setIsLoading(true);
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            setter(result.value);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls')
        ) {
            setLoadingMessage(t('extractingXlsxText'));
            setIsLoading(true);
            const arrayBuffer = await file.arrayBuffer();
            const workbook = xlsx.read(arrayBuffer, { type: 'array' });
            let fullText = '';
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const sheetData = xlsx.utils.sheet_to_csv(worksheet);
                fullText += sheetData + '\n';
            });
            setter(fullText.trim());
        } else {
            throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
        }
    } catch (e) {
        console.error("Failed to extract content from uploaded file:", e);
        setError(t('errorParsingFile'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
    
    if(event.target) event.target.value = '';
  };
  
  const handleSelectCv = async (doc: DocumentItem) => {
    setError('');

    // Prioritize file content if it exists
    if (doc.fileContent && doc.fileMimeType) {
        try {
            if (doc.fileMimeType.startsWith('text/')) {
                const base64Content = doc.fileContent.substring(doc.fileContent.indexOf(',') + 1);
                const binaryString = atob(base64Content);
                const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                const decoder = new TextDecoder();
                setCvContent(decoder.decode(bytes));
            } 
            else if (doc.fileMimeType === 'application/pdf') {
                setLoadingMessage(t('extractingPdfText'));
                setIsLoading(true);
                
                const pdfData = atob(doc.fileContent.substring(doc.fileContent.indexOf(',') + 1));
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const pdf = await loadingTask.promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                    fullText += pageText + '\n';
                }
                setCvContent(fullText.trim());
            }
            else if (
                doc.fileMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                doc.fileMimeType === 'application/msword' ||
                doc.fileName?.endsWith('.docx') ||
                doc.fileName?.endsWith('.doc')
            ) {
                setLoadingMessage(t('extractingDocxText'));
                setIsLoading(true);
                const base64Content = doc.fileContent.substring(doc.fileContent.indexOf(',') + 1);
                const binaryString = atob(base64Content);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const arrayBuffer = bytes.buffer;
                const result = await mammoth.extractRawText({ arrayBuffer });
                setCvContent(result.value);
            }
            else if (
                doc.fileMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                doc.fileMimeType === 'application/vnd.ms-excel' ||
                doc.fileName?.endsWith('.xlsx') ||
                doc.fileName?.endsWith('.xls')
            ) {
                setLoadingMessage(t('extractingXlsxText'));
                setIsLoading(true);
                const base64Content = doc.fileContent.substring(doc.fileContent.indexOf(',') + 1);
                const binaryString = atob(base64Content);
                const workbook = xlsx.read(binaryString, { type: 'binary' });
                let fullText = '';
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetData = xlsx.utils.sheet_to_csv(worksheet);
                    fullText += sheetData + '\n';
                });
                setCvContent(fullText.trim());
            }
            else {
                const base64Content = doc.fileContent.substring(doc.fileContent.indexOf(',') + 1);
                const binaryString = atob(base64Content);
                const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                const decoder = new TextDecoder();
                const textContent = decoder.decode(bytes);

                if (textContent.length > 0 && !textContent.startsWith('%PDF-')) {
                     setCvContent(textContent);
                } else {
                     throw new Error("Unsupported file type for text extraction.");
                }
            }
        } catch (e) {
            console.error("Failed to extract content from selected file:", e);
            setError(t('errorParsingFile'));
        } finally {
            setIsLoading(false);
        }
    }
    // Fallback to textExtract if no file content
    else if (doc.textExtract) {
        setCvContent(doc.textExtract);
    }
  };
  
  const handleSelectJob = (job: Job) => {
    setJobDescriptionContent(job.description);
    setSourceJob(job);
    setIsSelectJobModalOpen(false);
  };

  const generateContent = async (language: string, maxWords: number) => {
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

  const getPageTitle = () => {
    switch (currentPage) {
        case 'landing': return t('landingPageTitle');
        case 'generator': return t('appTitle');
        case 'jobs': return t('jobsListTitle');
        case 'documents': return t('myDocumentsTitle');
        case 'profile': return t('profileTitle');
        default: return '';
    }
  };

  const getPageSubtitle = () => {
      switch (currentPage) {
        case 'landing': return t('landingPageHeaderSubtitle');
        case 'generator': return t('appSubtitle');
        case 'jobs': return t('jobsListSubtitle');
        case 'documents': return t('myDocumentsSubtitle');
        case 'profile': return t('profileSubtitle');
        default: return '';
    }
  };

  const handleNavClick = (page: Page) => {
    setCurrentPage(page);
    if (!isDesktop) {
        setIsSidebarOpen(false);
    }
  };

  const renderPage = () => {
      switch(currentPage) {
          case 'landing':
              return <LandingPage t={t} setCurrentPage={setCurrentPage} />;
          case 'generator':
              return <GeneratorPage 
                        t={t}
                        cvContent={cvContent}
                        setCvContent={setCvContent}
                        jobDescriptionContent={jobDescriptionContent}
                        setJobDescriptionContent={setJobDescriptionContent}
                        handleFileUpload={handleFileUpload}
                        setIsSelectCvModalOpen={setIsSelectCvModalOpen}
                        setIsSelectJobModalOpen={setIsSelectJobModalOpen}
                        generateContent={generateContent}
                        isLoading={isLoading}
                        keywords={keywords}
                        setKeywords={setKeywords}
                        coverLetter={coverLetter}
                        setCoverLetter={setCoverLetter}
                        shortProfile={shortProfile}
                        setShortProfile={setShortProfile}
                        isInputOpen={isInputOpen}
                        setIsInputOpen={setIsInputOpen}
                        isOutputOpen={isOutputOpen}
                        setIsOutputOpen={setIsOutputOpen}
                        setLoadingMessage={setLoadingMessage}
                        jobs={jobs}
                        setJobs={setJobs}
                        isAuthenticated={isAuthenticated}
                        openAuthModal={() => setIsAuthModalOpen(true)}
                        sourceJob={sourceJob}
                        setSourceJob={setSourceJob}
                      />;
          case 'jobs':
              return <JobsListPage t={t} jobs={jobs} setJobs={setJobs} />;
          case 'documents':
              return <MyDocumentsPage t={t} documents={documents} setDocuments={setDocuments} />;
          case 'profile':
              const currentUserProfile = user ? userProfiles.find(p => p.uid === user.uid) : null;
              if (!user || !currentUserProfile) {
                  setCurrentPage('landing');
                  return null; // Redirect if not logged in or profile not found
              }
              return <ProfilePage
                          t={t}
                          user={user}
                          profile={currentUserProfile}
                          onSaveProfile={(updatedProfile) => {
                              setUserProfiles(profiles =>
                                  profiles.map(p => p.uid === updatedProfile.uid ? updatedProfile : p)
                              );
                              // Also update the global UI language if it was changed
                              if (uiLanguage !== updatedProfile.defaultLanguage) {
                                  setUiLanguage(updatedProfile.defaultLanguage);
                              }
                          }}
                          setCurrentPage={setCurrentPage}
                      />;
          default:
              return <LandingPage t={t} setCurrentPage={setCurrentPage} />;
      }
  }

  const sidebarClasses = `sidebar ${isSidebarOpen ? 'open' : ''} ${isDesktop ? '' : 'mobile'}`;
  const mainContainerClasses = `main-container ${isDesktop && isSidebarOpen ? 'sidebar-open' : ''}`;

  if (isAuthLoading) {
    return <Modal message="Authenticating..." footerText={t('modalFooterText')} />;
  }

  return (
    <>
      {isLoading && <Modal message={loadingMessage} footerText={t('modalFooterText')} />}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        t={t}
      />
      <ConfirmationModal
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleConfirmLogout}
          title={t('logoutConfirmationTitle')}
          t={t}
      >
          <p>{t('logoutConfirmation')}</p>
      </ConfirmationModal>
      <SelectCvModal
        isOpen={isSelectCvModalOpen}
        onClose={() => setIsSelectCvModalOpen(false)}
        onSelect={handleSelectCv}
        documents={documents}
        t={t}
      />
      <SelectJobModal
        isOpen={isSelectJobModalOpen}
        onClose={() => setIsSelectJobModalOpen(false)}
        onSelect={handleSelectJob}
        jobs={jobs}
        t={t}
      />
      {!isDesktop && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
      
      <nav className={sidebarClasses}>
          <div className="sidebar-header" onClick={() => handleNavClick('landing')} role="button" tabIndex={0}>
              <div className="sidebar-title-container">
                  <SparkIcon className="sidebar-spark-icon" />
                  <h2 className="sidebar-title">Pearl Labor</h2>
              </div>
          </div>
          <ul className="sidebar-nav">
              <li className={currentPage === 'landing' ? 'active' : ''}>
                  <button onClick={() => handleNavClick('landing')}><HomeIcon /> {t('menuHome')}</button>
              </li>
              <li className={currentPage === 'generator' ? 'active' : ''}>
                  <button onClick={() => handleNavClick('generator')}><FileTextIcon /> {t('menuGenerator')}</button>
              </li>
              <li className={currentPage === 'jobs' ? 'active' : ''}>
                  <button onClick={() => handleNavClick('jobs')}><BriefcaseIcon /> {t('menuJobs')}</button>
              </li>
              <li className={currentPage === 'documents' ? 'active' : ''}>
                  <button onClick={() => handleNavClick('documents')}><UserIcon /> {t('menuDocuments')}</button>
              </li>
          </ul>
      </nav>

      <div className={mainContainerClasses}>
          <div className="main-content-wrapper">
              <header className="app-header">
                  <div className="header-main-section">
                      <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="secondary" className="btn-icon" aria-label="Toggle menu">
                          <MenuIcon />
                      </Button>
                      <div className="page-title">
                          <h1>
                              {getPageTitle()}
                              <SparkIcon className="title-spark-icon" />
                          </h1>
                          <p className="app-subtitle">{getPageSubtitle()}</p>
                      </div>
                  </div>
                  <div className="header-controls">
                      <select 
                          value={uiLanguage} 
                          onChange={e => setUiLanguage(e.target.value as LanguageCode)} 
                          className="input"
                          aria-label={t('selectUiLanguageLabel')}
                      >
                          <option value="EN">{t('languageEnglish')}</option>
                          <option value="DE">{t('languageGerman')}</option>
                          <option value="FR">{t('languageFrench')}</option>
                      </select>
                      <Button onClick={toggleTheme} variant="secondary" className="btn-icon" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
                          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                      </Button>
                      {isAuthenticated && user ? (
                          <DropdownMenu trigger={
                              <button className="user-menu-trigger" aria-label="Open user menu">
                                  <UserCircleIcon className="user-menu-icon" />
                              </button>
                          }>
                              <div className="dropdown-header">
                                  <div className="dropdown-user-info">
                                      {user.displayName && <span className="dropdown-user-name">{user.displayName}</span>}
                                      {user.email && <span className="dropdown-user-email">{user.email}</span>}
                                  </div>
                              </div>
                              <div className="dropdown-divider" />
                              <button className="dropdown-item" onClick={() => handleNavClick('profile')}>
                                  <UserIcon /> {t('manageProfileButton')}
                              </button>
                              <button onClick={handleLogout} className="dropdown-item dropdown-item-destructive">
                                  <LogOutIcon /> {t('logoutButton')}
                              </button>
                          </DropdownMenu>
                      ) : (
                          <Button onClick={() => setIsAuthModalOpen(true)} variant="secondary">
                              <LogInIcon /> {t('loginRegisterButton')}
                          </Button>
                      )}
                  </div>
              </header>

              {error && <div className="error" role="alert">{error}</div>}

              <main className={`main-content page-${currentPage}`}>
                  {renderPage()}
              </main>
          </div>
      </div>
    </>
  );
};