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
import { Page, DocumentItem } from './types';
import { Button, Modal, DropdownMenu } from './components/ui';
import { AuthModal } from './components/AuthModal';
import { SelectCvModal } from './components/SelectCvModal';
import { HomeIcon, SunIcon, MoonIcon, SparkIcon, FileTextIcon, BriefcaseIcon, UserIcon, MenuIcon, LogInIcon, LogOutIcon, UserCircleIcon } from './components/icons';
import { LandingPage } from './pages/LandingPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { JobsListPage } from './pages/JobsListPage';
import { MyDocumentsPage } from './pages/MyDocumentsPage';


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

  // Shared State
  const [documents, setDocuments] = useState<DocumentItem[]>(() => [
    { id: 'doc-1', name: 'Standard CV', type: 'cv', fileName: 'my_cv_2024.pdf', lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'doc-2', name: 'Cover Letter for Stark Industries', type: 'coverLetter' },
    { id: 'doc-3', name: 'Professional References', type: 'references', fileName: 'references.docx', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()  },
  ]);
  const [isSelectCvModalOpen, setIsSelectCvModalOpen] = useState(false);

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
    // Fix: Use Firebase v8 onAuthStateChanged method
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Persist generator content to localStorage
  useEffect(() => { localStorage.setItem('cvContent', cvContent); }, [cvContent]);
  useEffect(() => { localStorage.setItem('jobDescriptionContent', jobDescriptionContent); }, [jobDescriptionContent]);
  useEffect(() => { localStorage.setItem('keywords', JSON.stringify(keywords)); }, [keywords]);
  useEffect(() => { localStorage.setItem('coverLetter', coverLetter); }, [coverLetter]);
  useEffect(() => { localStorage.setItem('shortProfile', shortProfile); }, [shortProfile]);


  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = () => {
      // The onAuthStateChanged listener will handle the user state update.
      // This function's only job is to close the modal.
      setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
      try {
          // Fix: Use Firebase v8 signOut method
          await auth.signOut();
          // user state will be updated to null by onAuthStateChanged
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
    if (!doc.fileContent || !doc.fileMimeType) return;
    setError('');

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
        default: return '';
    }
  };

  const getPageSubtitle = () => {
      switch (currentPage) {
        case 'landing': return t('landingPageHeaderSubtitle');
        case 'generator': return t('appSubtitle');
        case 'jobs': return t('jobsListSubtitle');
        case 'documents': return t('myDocumentsSubtitle');
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
                        isAuthenticated={isAuthenticated}
                        openAuthModal={() => setIsAuthModalOpen(true)}
                      />;
          case 'jobs':
              return <JobsListPage t={t} />;
          case 'documents':
              return <MyDocumentsPage t={t} documents={documents} setDocuments={setDocuments} />;
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
      <SelectCvModal
        isOpen={isSelectCvModalOpen}
        onClose={() => setIsSelectCvModalOpen(false)}
        onSelect={handleSelectCv}
        documents={documents}
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
                              <button className="dropdown-item">
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

              <main className="main-content">
                  {renderPage()}
              </main>
          </div>
      </div>
    </>
  );
};