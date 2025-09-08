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
import type { User } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { translations, LanguageCode } from '../translations';
import { Page, DocumentItem, Job, UserProfile, Gender } from './types';
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
import { AddDocumentModal } from './components/AddDocumentModal';

export const App: FC = () => {
  const DESKTOP_BREAKPOINT = 1024;
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('DE');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isAuthenticated = !!user;
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  // Generator State
  const [cvContent, setCvContent] = useState('');
  const [jobDescriptionContent, setJobDescriptionContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<React.ReactNode>('');
  const [error, setError] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [shortProfile, setShortProfile] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(true);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [sourceJob, setSourceJob] = useState<Job | null>(null);

  // Data State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  
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
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Data Fetching and Management ---
  const fetchUserData = async (user: User) => {
      const userId = user.id;

      const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
      } else {
        const formattedJobs: Job[] = (jobsData || []).map((job: any) => ({
            id: job.id,
            user_id: job.user_id,
            created_at: job.created_at,
            title: job.title,
            company: job.company,
            location: job.location,
            posted: job.posted,
            applicationDate: job.application_date,
            description: job.description,
            url: job.url,
            status: job.status,
            internalNotes: job.internal_notes,
            myShortProfile: job.my_short_profile,
            myCoverLetter: job.my_cover_letter,
        }));
        setJobs(formattedJobs);
      }

      const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      
      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
      } else {
        const formattedDocuments: DocumentItem[] = (documentsData || []).map((doc: any) => ({
            id: doc.id,
            user_id: doc.user_id,
            created_at: doc.created_at,
            name: doc.name,
            type: doc.type,
            fileName: doc.file_name,
            storagePath: doc.storage_path,
            fileMimeType: doc.file_mime_type,
            updatedAt: doc.updated_at,
            textExtract: doc.text_extract,
        }));
        setDocuments(formattedDocuments);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
          // Profile exists, load it
          const existingProfile = {
              uid: profileData.id,
              firstName: profileData.first_name,
              lastName: profileData.last_name,
              defaultLanguage: profileData.default_language,
              gender: profileData.gender,
          };
          setUserProfiles([existingProfile]);
          if(existingProfile.defaultLanguage) {
            setUiLanguage(existingProfile.defaultLanguage);
          }
      } else {
          // Profile does not exist, create it
          const newProfile = {
            id: userId,
            first_name: user.user_metadata.first_name || '',
            last_name: user.user_metadata.last_name || '',
            default_language: 'DE' as LanguageCode,
            gender: 'unspecified' as Gender,
          };

          const { data: insertedProfile, error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else if (insertedProfile) {
              const createdProfile = {
                  uid: insertedProfile.id,
                  firstName: insertedProfile.first_name,
                  lastName: insertedProfile.last_name,
                  defaultLanguage: insertedProfile.default_language,
                  gender: insertedProfile.gender,
              };
              setUserProfiles([createdProfile]);
              if (createdProfile.defaultLanguage) {
                  setUiLanguage(createdProfile.defaultLanguage);
              }
          }
      }
  };

  const clearUserData = () => {
      setJobs([]);
      setDocuments([]);
      setUserProfiles([]);
  };

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
            await fetchUserData(currentUser);
        }
        setIsAuthLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
            setIsAuthModalOpen(false); // Close auth modal on successful login
            await fetchUserData(currentUser);
        } else {
            clearUserData();
        }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };
  
  const handleConfirmLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("Error signing out: ", error);
      } else {
          setIsLogoutConfirmOpen(false);
          setCurrentPage('landing'); // Redirect to landing page on logout
      }
  };
  
  // --- CRUD for Jobs ---
  const addJob = async (jobData: Omit<Job, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { data: null, error: new Error("User not authenticated") };

    const dataForSupabase = {
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      posted: jobData.posted,
      application_date: jobData.applicationDate,
      description: jobData.description,
      url: jobData.url,
      status: jobData.status,
      internal_notes: jobData.internalNotes,
      my_short_profile: jobData.myShortProfile,
      my_cover_letter: jobData.myCoverLetter,
      user_id: user.id,
    };

    const { data, error } = await supabase.from('jobs').insert(dataForSupabase).select();

    if (error) {
      console.error('Error adding job:', error);
    } else if (data) {
      const newJobFromDb = data[0];
      const newJobForState: Job = {
        id: newJobFromDb.id,
        user_id: newJobFromDb.user_id,
        created_at: newJobFromDb.created_at,
        title: newJobFromDb.title,
        company: newJobFromDb.company,
        location: newJobFromDb.location,
        posted: newJobFromDb.posted,
        applicationDate: newJobFromDb.application_date,
        description: newJobFromDb.description,
        url: newJobFromDb.url,
        status: newJobFromDb.status,
        internalNotes: newJobFromDb.internal_notes,
        myShortProfile: newJobFromDb.my_short_profile,
        myCoverLetter: newJobFromDb.my_cover_letter,
      };
      setJobs(prev => [newJobForState, ...prev]);
    }
    return { data, error };
  };

  const updateJob = async (jobData: Partial<Job>) => {
    if (!jobData.id) return;
    
    const dataForSupabase: { [key: string]: any } = {};
      
    // Map only provided fields from camelCase to snake_case
    if (jobData.title !== undefined) dataForSupabase.title = jobData.title;
    if (jobData.company !== undefined) dataForSupabase.company = jobData.company;
    if (jobData.location !== undefined) dataForSupabase.location = jobData.location;
    if (jobData.posted !== undefined) dataForSupabase.posted = jobData.posted;
    if (jobData.description !== undefined) dataForSupabase.description = jobData.description;
    if (jobData.url !== undefined) dataForSupabase.url = jobData.url;
    if (jobData.status !== undefined) dataForSupabase.status = jobData.status;
    if (jobData.internalNotes !== undefined) dataForSupabase.internal_notes = jobData.internalNotes;
    if (jobData.myShortProfile !== undefined) dataForSupabase.my_short_profile = jobData.myShortProfile;
    if (jobData.myCoverLetter !== undefined) dataForSupabase.my_cover_letter = jobData.myCoverLetter;
    if (Object.prototype.hasOwnProperty.call(jobData, 'applicationDate')) {
        dataForSupabase.application_date = jobData.applicationDate;
    }

    const { data, error } = await supabase.from('jobs').update(dataForSupabase).eq('id', jobData.id).select();

    if (error) {
      console.error('Error updating job:', error);
    } else if (data) {
      const updatedJobFromDb = data[0];
      const updatedJobForState: Job = {
        id: updatedJobFromDb.id,
        user_id: updatedJobFromDb.user_id,
        created_at: updatedJobFromDb.created_at,
        title: updatedJobFromDb.title,
        company: updatedJobFromDb.company,
        location: updatedJobFromDb.location,
        posted: updatedJobFromDb.posted,
        applicationDate: updatedJobFromDb.application_date,
        description: updatedJobFromDb.description,
        url: updatedJobFromDb.url,
        status: updatedJobFromDb.status,
        internalNotes: updatedJobFromDb.internal_notes,
        myShortProfile: updatedJobFromDb.my_short_profile,
        myCoverLetter: updatedJobFromDb.my_cover_letter,
      };
      setJobs(prev => prev.map(j => j.id === jobData.id ? updatedJobForState : j));
    }
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) {
      console.error('Error deleting job:', error);
    } else {
      setJobs(prev => prev.filter(j => j.id !== jobId));
    }
  };

  // --- CRUD for Documents ---
  const handleDocumentAdded = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const updateDocument = async (docData: Partial<DocumentItem>) => {
    if (!docData.id) return;

    const dataForSupabase: { [key: string]: any } = {};
    if (docData.name !== undefined) dataForSupabase.name = docData.name;
    if (docData.type !== undefined) dataForSupabase.type = docData.type;
    if (docData.fileName !== undefined) dataForSupabase.file_name = docData.fileName;
    if (docData.storagePath !== undefined) dataForSupabase.storage_path = docData.storagePath;
    if (docData.fileMimeType !== undefined) dataForSupabase.file_mime_type = docData.fileMimeType;
    if (docData.updatedAt !== undefined) dataForSupabase.updated_at = docData.updatedAt;
    if (docData.textExtract !== undefined) dataForSupabase.text_extract = docData.textExtract;

    const { data, error } = await supabase.from('documents').update(dataForSupabase).eq('id', docData.id).select();
    
    if (error) {
      console.error('Error updating document:', error);
    } else if (data) {
      const updatedDocFromDb = data[0];
      const updatedDocForState: DocumentItem = {
          id: updatedDocFromDb.id,
          user_id: updatedDocFromDb.user_id,
          created_at: updatedDocFromDb.created_at,
          name: updatedDocFromDb.name,
          type: updatedDocFromDb.type,
          fileName: updatedDocFromDb.file_name,
          storagePath: updatedDocFromDb.storage_path,
          fileMimeType: updatedDocFromDb.file_mime_type,
          updatedAt: updatedDocFromDb.updated_at,
          textExtract: updatedDocFromDb.text_extract,
      };
      setDocuments(prev => prev.map(d => d.id === docData.id ? updatedDocForState : d));
    }
  };

  const deleteDocument = async (docId: string) => {
    // 1. Find the document to get its file path
    const docToDelete = documents.find(d => d.id === docId);
    if (docToDelete && docToDelete.storagePath) {
        // 2. Delete the file from storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([docToDelete.storagePath]);
        
        if (storageError) {
            console.error('Error deleting file from storage:', storageError);
            // Optionally, stop here and show an error to the user
            // For now, we'll proceed to delete the DB record anyway
        }
    }

    // 3. Delete the database record
    const { error } = await supabase.from('documents').delete().eq('id', docId);
    if (error) {
        console.error('Error deleting document:', error);
    } else {
        setDocuments(prev => prev.filter(d => d.id !== docId));
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

    // Prioritize file if it exists in storage
    if (doc.storagePath && doc.fileMimeType) {
        try {
            setLoadingMessage(t('parsingFileContent'));
            setIsLoading(true);

            // 1. Get a temporary URL to download the file
            const { data, error: urlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.storagePath, 60); // URL is valid for 60 seconds

            if (urlError) throw urlError;
            if (!data) throw new Error("Could not create signed URL.");

            // 2. Fetch the file content from the URL
            const response = await fetch(data.signedUrl);
            if (!response.ok) throw new Error("Failed to download file from storage.");

            const mimeType = doc.fileMimeType;
            const arrayBuffer = await response.arrayBuffer();

            // 3. Parse content based on MIME type
            if (mimeType.startsWith('text/') || doc.fileName?.endsWith('.md')) {
                const textContent = new TextDecoder().decode(arrayBuffer);
                setCvContent(textContent);
            } 
            else if (mimeType === 'application/pdf') {
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
                mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mimeType === 'application/msword' ||
                doc.fileName?.endsWith('.docx') ||
                doc.fileName?.endsWith('.doc')
            ) {
                const result = await mammoth.extractRawText({ arrayBuffer });
                setCvContent(result.value);
            }
            else if (
                mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                mimeType === 'application/vnd.ms-excel' ||
                doc.fileName?.endsWith('.xlsx') ||
                doc.fileName?.endsWith('.xls')
            ) {
                const workbook = xlsx.read(arrayBuffer, { type: 'array' });
                let fullText = '';
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetData = xlsx.utils.sheet_to_csv(worksheet);
                    fullText += sheetData + '\n';
                });
                setCvContent(fullText.trim());
            } else {
                throw new Error("Unsupported file type for text extraction.");
            }
        } catch (e) {
            console.error("Failed to download or parse file from storage:", e);
            setError(t('errorParsingFile'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }
    // Fallback to textExtract if no file
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
                        onUpdateJob={updateJob}
                        isAuthenticated={isAuthenticated}
                        openAuthModal={() => setIsAuthModalOpen(true)}
                        sourceJob={sourceJob}
                        setSourceJob={setSourceJob}
                      />;
          case 'jobs':
              return <JobsListPage 
                        t={t}
                        jobs={jobs}
                        onAddJob={addJob}
                        onUpdateJob={updateJob}
                        onDeleteJob={deleteJob}
                     />;
          case 'documents':
              return <MyDocumentsPage 
                        t={t}
                        documents={documents}
                        onDocumentAdded={handleDocumentAdded}
                        onUpdateDocument={updateDocument}
                        onDeleteDocument={deleteDocument}
                        user={user}
                     />;
          case 'profile':
              const currentUserProfile = user ? userProfiles.find(p => p.uid === user.id) : null;
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
                                      {user.user_metadata.full_name && <span className="dropdown-user-name">{user.user_metadata.full_name}</span>}
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