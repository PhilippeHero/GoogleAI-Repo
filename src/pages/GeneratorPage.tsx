/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useRef } from 'react';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import { translations } from '../../translations';
import { Job } from '../types';
import { Collapsible, Card, Button, Textarea, NumberStepper } from '../components/ui';
import { SelectJobModal } from '../components/SelectJobModal';
import { RocketIcon, LockIcon } from '../components/icons';

type LockedButtonWrapperProps = {
    isAuthenticated: boolean;
    onClick: () => void;
    openAuthModal: () => void;
    // Fix: Changed `children` type to be more specific using `React.ComponentProps` to enable type-safe cloning of the Button component.
    children: React.ReactElement<React.ComponentProps<typeof Button>>;
    t: (key: keyof typeof translations['EN']) => string;
    disabled?: boolean;
};

const LockedButtonWrapper: FC<LockedButtonWrapperProps> = ({ isAuthenticated, onClick, openAuthModal, children, t, disabled }) => {
    if (isAuthenticated) {
        // Fix: Removed cast now that `children` is correctly typed. This resolves the error on the `onClick` prop.
        return <>{React.cloneElement(children, { onClick: onClick, disabled: disabled })}</>;
    }

    return (
        <div className="btn-locked-wrapper" onClick={openAuthModal}>
            <span className="btn-locked-tooltip">{t('unlockFeatureTooltip')}</span>
            {/* Fix: Removed cast and correctly accessed `children.props.children`. This resolves errors with the `disabled` prop and accessing `children`. */}
            {React.cloneElement(children, { disabled: true, children: <><LockIcon className="locked-icon" />{ children.props.children}</> })}
        </div>
    );
};


type GeneratorPageProps = {
    t: (key: keyof typeof translations['EN']) => string;
    cvContent: string;
    setCvContent: React.Dispatch<React.SetStateAction<string>>;
    jobDescriptionContent: string;
    setJobDescriptionContent: React.Dispatch<React.SetStateAction<string>>;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => void;
    setIsSelectCvModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSelectJobModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
    setLoadingMessage: React.Dispatch<React.SetStateAction<React.ReactNode>>;
    jobs: Job[];
    onUpdateJob: (job: Partial<Job>) => void;
    isAuthenticated: boolean;
    openAuthModal: () => void;
    sourceJob: Job | null;
    setSourceJob: React.Dispatch<React.SetStateAction<Job | null>>;
}

export const GeneratorPage: FC<GeneratorPageProps> = ({
    t, cvContent, setCvContent, jobDescriptionContent, setJobDescriptionContent,
    handleFileUpload, setIsSelectCvModalOpen, setIsSelectJobModalOpen, generateContent, isLoading,
    keywords, setKeywords, coverLetter, setCoverLetter, shortProfile, setShortProfile,
    isInputOpen, setIsInputOpen, isOutputOpen, setIsOutputOpen, setLoadingMessage,
    jobs, onUpdateJob, isAuthenticated, openAuthModal, sourceJob, setSourceJob
}) => {
    const [maxWords, setMaxWords] = useState(150);
    const [language, setLanguage] = useState('German');
    
    const [contentToSave, setContentToSave] = useState<{ type: 'myShortProfile' | 'myCoverLetter', content: string } | null>(null);
    const [isSelectJobToSaveModalOpen, setIsSelectJobToSaveModalOpen] = useState(false);

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
        downloadDocx(coverLetter, "Cover-Letter.docx");
    };
    
    const handleShortProfileDownload = () => {
        downloadDocx(shortProfile, "Short-Profile.docx");
    };
    
    const handleGenerateClick = () => {
        let translatedLanguage;
        switch (language) {
          case 'English': translatedLanguage = t('languageEnglish'); break;
          case 'German': translatedLanguage = t('languageGerman'); break;
          case 'French': translatedLanguage = t('languageFrench'); break;
          default: translatedLanguage = language;
        }

        const message = (
            <>
                <p id="loading-dialog-title">{t('generatingModalMessage')}</p>
                <ul className="loading-details-list">
                    <li>{`${t('modalWordsLabel')}: ${maxWords}`}</li>
                    <li>{`${t('languageLabel')}: ${translatedLanguage}`}</li>
                </ul>
            </>
        );
        
        setLoadingMessage(message);
        generateContent(language, maxWords);
    };

    const handleOpenSaveToJobModal = (type: 'myShortProfile' | 'myCoverLetter') => {
        const content = type === 'myShortProfile' ? shortProfile : coverLetter;
        if (content) {
            setContentToSave({ type, content });
            setIsSelectJobToSaveModalOpen(true);
        }
    };

    const handleSaveContentToJob = (selectedJob: Job) => {
        if (contentToSave) {
            onUpdateJob({ id: selectedJob.id, [contentToSave.type]: contentToSave.content });
        }
        setIsSelectJobToSaveModalOpen(false);
        setContentToSave(null);
    };


    return (
        <>
        <SelectJobModal
            isOpen={isSelectJobToSaveModalOpen}
            onClose={() => setIsSelectJobToSaveModalOpen(false)}
            onSelect={handleSaveContentToJob}
            jobs={jobs}
            t={t}
            recommendedJobId={sourceJob?.id}
        />
        <p className="workflow-description">{t('workflowDescription')}</p>
        <Collapsible title={t('inputFilesTitle')} isOpen={isInputOpen} onToggle={() => setIsInputOpen(!isInputOpen)}>
            <Card>
                <div className="card-header-wrapper">
                <h3 className="card-header">{t('cvHeader')}</h3>
                <div className="card-header-actions">
                    {cvContent && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                    <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={() => setIsSelectCvModalOpen(true)}
                        openAuthModal={openAuthModal}
                        t={t}
                    >
                        <Button variant="secondary" className="btn-sm">{t('selectFileButton')}</Button>
                    </LockedButtonWrapper>
                    <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={() => cvUploadRef.current?.click()}
                        openAuthModal={openAuthModal}
                        t={t}
                    >
                        <Button variant="secondary" className="btn-sm">{t('uploadFileButton')}</Button>
                    </LockedButtonWrapper>
                    {cvContent && <Button variant="secondary" onClick={() => setCvContent('')} className="btn-sm">{t('clearButton')}</Button>}
                </div>
            </div>
            <Textarea 
                value={cvContent}
                onChange={(e) => setCvContent(e.target.value)}
                placeholder={t('cvPlaceholder')}
            />
            <input type="file" ref={cvUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setCvContent)} accept=".txt,.md,.pdf,.doc,.docx,.xls,.xlsx" />
            </Card>
            <Card>
            <div className="card-header-wrapper">
                <h3 className="card-header">{t('jobDescriptionHeader')}</h3>
                <div className="card-header-actions">
                {jobDescriptionContent && <small className="autosave-indicator">{t('autoSavedIndicator')}</small>}
                <LockedButtonWrapper
                    isAuthenticated={isAuthenticated}
                    onClick={() => setIsSelectJobModalOpen(true)}
                    openAuthModal={openAuthModal}
                    t={t}
                >
                    <Button variant="secondary" className="btn-sm">{t('selectJobButton')}</Button>
                </LockedButtonWrapper>
                <LockedButtonWrapper
                    isAuthenticated={isAuthenticated}
                    onClick={() => jobUploadRef.current?.click()}
                    openAuthModal={openAuthModal}
                    t={t}
                >
                    <Button variant="secondary" className="btn-sm">{t('uploadFileButton')}</Button>
                </LockedButtonWrapper>
                {jobDescriptionContent && <Button variant="secondary" onClick={() => { setJobDescriptionContent(''); setSourceJob(null); }} className="btn-sm">{t('clearButton')}</Button>}
                </div>
            </div>
            <Textarea 
                value={jobDescriptionContent}
                onChange={(e) => setJobDescriptionContent(e.target.value)}
                placeholder={t('jobDescriptionPlaceholder')}
            />
            <input type="file" ref={jobUploadRef} style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setJobDescriptionContent)} accept=".txt,.md,.pdf,.doc,.docx,.xls,.xlsx" />
            </Card>
        </Collapsible>
        
        <Card>
            <div className="generation-controls-wrapper">
            <Button onClick={handleGenerateClick} disabled={isLoading || !cvContent || !jobDescriptionContent}>
                <RocketIcon />
                {t('generateButton')}
            </Button>
            <div className="settings-options">
                <div className="form-group">
                <label htmlFor="maxWords">{t('maxWordsLabel')}</label>
                <NumberStepper
                    id="maxWords"
                    value={maxWords}
                    onChange={setMaxWords}
                    step={50}
                    min={50}
                    lockedLimit={150}
                    isAuthenticated={isAuthenticated}
                    openAuthModal={openAuthModal}
                    t={t}
                />
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
                    <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={() => handleOpenSaveToJobModal('myShortProfile')}
                        openAuthModal={openAuthModal}
                        t={t}
                        disabled={!shortProfile}
                    >
                        <Button variant="secondary" className="btn-sm">{t('saveToJobButton')}</Button>
                    </LockedButtonWrapper>
                    <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={handleShortProfileDownload}
                        openAuthModal={openAuthModal}
                        t={t}
                        disabled={!shortProfile}
                    >
                        <Button variant="secondary" className="btn-sm">{t('downloadButton')}</Button>
                    </LockedButtonWrapper>
                    <Button variant="secondary" onClick={() => copyToClipboard(shortProfile)} className="btn-sm" disabled={!shortProfile}>
                        {t('copyButton')}
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
                    <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={() => handleOpenSaveToJobModal('myCoverLetter')}
                        openAuthModal={openAuthModal}
                        t={t}
                        disabled={!coverLetter}
                    >
                        <Button variant="secondary" className="btn-sm">{t('saveToJobButton')}</Button>
                    </LockedButtonWrapper>
                     <LockedButtonWrapper
                        isAuthenticated={isAuthenticated}
                        onClick={handleCoverLetterDownload}
                        openAuthModal={openAuthModal}
                        t={t}
                        disabled={!coverLetter}
                    >
                        <Button variant="secondary" className="btn-sm">{t('downloadButton')}</Button>
                    </LockedButtonWrapper>
                    <Button variant="secondary" onClick={() => copyToClipboard(coverLetter)} className="btn-sm" disabled={!coverLetter}>
                        {t('copyButton')}
                    </Button>
                    {coverLetter && <Button variant="secondary" onClick={() => setCoverLetter('')} className="btn-sm">{t('clearButton')}</Button>}
                </div>
            </div>
            <Textarea 
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder={t('coverLetterPlaceholder')}
                style={{minHeight: '22rem'}}
            />
            </Card>
        </Collapsible>
        <footer className="landing-footer">
            <p>AI driven Transformational Excellence</p>
        </footer>
        </>
    );
};