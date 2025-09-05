/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from '@google/genai';
import { useState, useRef, FC, CSSProperties, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import { translations, LanguageCode } from './translations';

// --- UI Components (Styled with CSS to mimic SHADCN) ---

const Card: FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`card ${className || ''}`}>{children}</div>
);

const Button: FC<{ children: React.ReactNode, onClick?: () => void, disabled?: boolean, variant?: 'primary' | 'secondary', className?: string, style?: CSSProperties }> = 
({ children, onClick, disabled, variant = 'primary', className, style }) => (
  <button onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className || ''}`} style={style}>
    {children}
  </button>
);

const Textarea: FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder: string }> = 
({ value, onChange, placeholder }) => (
  <textarea className="input" value={value} onChange={onChange} placeholder={placeholder} />
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


// --- Main Application ---

function App() {
  // State Management
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
              size: "20pt", // 10pt in half-points
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

  return (
    <>
      {isLoading && <Modal message={getModalMessage()} footerText={t('modalFooterText')} />}
      <header className="app-header">
        <div>
          <h1>{t('appTitle')}</h1>
          <p className="app-subtitle">{t('appSubtitle')}</p>
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
          <Button onClick={toggleTheme} variant="secondary" className="btn-icon">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
        </div>
      </header>

      <div className="settings-bar">
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
      
      <main className="main-content">
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
      </main>
      
      {error && <div className="error" role="alert">{error}</div>}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);