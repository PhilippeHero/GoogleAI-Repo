/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useRef } from 'react';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import { translations } from '../../translations';
import { DocumentItem } from '../types';
import { Collapsible, Card, Button, Textarea } from '../components/ui';

type GeneratorPageProps = {
    t: (key: keyof typeof translations['EN']) => string;
    cvContent: string;
    setCvContent: React.Dispatch<React.SetStateAction<string>>;
    jobDescriptionContent: string;
    setJobDescriptionContent: React.Dispatch<React.SetStateAction<string>>;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => void;
    setIsSelectCvModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    generateContent: (language: string, maxWords: number) => Promise<void>;
    isLoading: boolean;
    keywords: string[];
    setKeywords: React.Dispatch<React.SetStateAction<string[]>>;
    coverLetter: string;
    setCoverLetter: React.Dispatch<React.SetStateAction<string>>;
    shortProfile: string;
    setShortProfile: React.Dispatch<React.SetStateAction<string>>;
    isInputOpen: boolean;
    setIsInputOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isOutputOpen: boolean;
    setIsOutputOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
}

export const GeneratorPage: FC<GeneratorPageProps> = ({
    t, cvContent, setCvContent, jobDescriptionContent, setJobDescriptionContent,
    handleFileUpload, setIsSelectCvModalOpen, generateContent, isLoading,
    keywords, setKeywords, coverLetter, setCoverLetter, shortProfile, setShortProfile,
    isInputOpen, setIsInputOpen, isOutputOpen, setIsOutputOpen, setLoadingMessage
}) => {
    const [maxWords, setMaxWords] = useState(300);
    const [outputFormat, setOutputFormat] = useState('MS Word');
    const [language, setLanguage] = useState('English');
    
    const cvUploadRef = useRef<HTMLInputElement>(null);
    const jobUploadRef = useRef<HTMLInputElement>(null);

    const downloadDocx = (content: string, filename: string) => {
        const doc = new Document({
          styles: {
            default: {
              document: {
                run: {
                  font: "Poppins",
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
    
    const handleGenerateClick = () => {
        const translatedOutputFormat = outputFormat === 'MS Word' ? t('outputFormatMsWord') : t('outputFormatGoogleDocs');
        let translatedLanguage;
        switch (language) {
          case 'English': translatedLanguage = t('languageEnglish'); break;
          case 'German': translatedLanguage = t('languageGerman'); break;
          case 'French': translatedLanguage = t('languageFrench'); break;
          default: translatedLanguage = language;
        }
        const message = `${t('generatingModalMessage')} ${maxWords} ${t('words')} ${t('in')} ${translatedLanguage}, ${t('in')} ${translatedOutputFormat} ${t('format')}...`;
        setLoadingMessage(message);
        generateContent(language, maxWords);
    }

    return (
        <>
        <p className="workflow-description">{t('workflowDescription')}</p>
        <Collapsible title={t('inputFilesTitle')} isOpen={isInputOpen} onToggle={() => setIsInputOpen(!isInputOpen)}>
            <Card>
                <div className="card-header-wrapper">
                <h3 className="card-header">{t('cvHeader')}</h3>
                <div className="card-header-actions">
                    {cvContent && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                    <Button variant="secondary" onClick={() => setIsSelectCvModalOpen(true)} className="btn-sm">{t('selectFileButton')}</Button>
                    <Button variant="secondary" onClick={() => cvUploadRef.current?.click()} className="btn-sm">{t('uploadFileButton')}</Button>
                    {cvContent && <Button variant="secondary" onClick={() => setCvContent('')} className="btn-sm">{t('clearButton')}</Button>}
                </div>
            </div>
            <Textarea 
                value={cvContent}
                onChange={(e) => setCvContent(e.target.value)}
                placeholder={t('cvPlaceholder')}
            />
            <input type="file" ref={cvUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setCvContent)} accept=".txt,.md,.pdf" />
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
            <input type="file" ref={jobUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setJobDescriptionContent)} accept=".txt,.md,.pdf" />
            </Card>
        </Collapsible>
        
        <Card>
            <div className="generation-controls-wrapper">
            <Button onClick={handleGenerateClick} disabled={isLoading || !cvContent || !jobDescriptionContent}>
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
    );
};
