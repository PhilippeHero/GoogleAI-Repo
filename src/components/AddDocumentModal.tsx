/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useEffect, useRef, ChangeEvent } from 'react';
import { translations } from '../../translations';
import { DocumentItem } from '../types';
import { Button, Textarea } from './ui';

const documentTypes = [
    { id: 'cv', nameKey: 'docTypeCv' as const },
    { id: 'competenceMatrix', nameKey: 'docTypeCompetenceMatrix' as const },
    { id: 'coverLetter', nameKey: 'docTypeCoverLetter' as const },
    { id: 'references', nameKey: 'docTypeReferences' as const },
    { id: 'other', nameKey: 'docTypeOther' as const },
];

type AddDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (docData: { name: string, type: string, textExtract: string }, file: File | null) => Promise<void>;
  t: (key: keyof typeof translations['EN']) => string;
  preloadedFile: File | null;
};

export const AddDocumentModal: FC<AddDocumentModalProps> = ({ isOpen, onClose, onAdd, t, preloadedFile }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('cv');
  const [textExtract, setTextExtract] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (preloadedFile) {
        setName(preloadedFile.name.replace(/\.[^/.]+$/, ""));
        setFile(preloadedFile);
        setType('cv'); // Reset type, let user choose
        setTextExtract('');
      } else {
        setName('');
        setType('cv');
        setTextExtract('');
        setFile(null);
      }
    }
  }, [isOpen, preloadedFile]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    if (!name.trim()) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
    if (event.target) event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('errorDocNameRequired'));
      return;
    }
    setError('');

    // Pass only the raw form data. The parent will construct the full object.
    const docData = { name, type, textExtract };
    
    await onAdd(docData, file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-doc-title">
      <div className="modal-content edit-job-modal" onClick={e => e.stopPropagation()}>
        <h2 id="add-doc-title">{t('addDocumentTitle')}</h2>
        
        <div className="form-group-stack">
          <label htmlFor="docName">{t('documentNameLabel')}</label>
          <input
            id="docName"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('documentNamePlaceholder')}
            className="input"
          />

          <label htmlFor="docType">{t('documentTypeLabel')}</label>
          <select
            id="docType"
            value={type}
            onChange={e => setType(e.target.value)}
            className="input"
          >
            {documentTypes.map(docType => (
              <option key={docType.id} value={docType.id}>{t(docType.nameKey)}</option>
            ))}
          </select>
          
          <div
            className={`drop-zone ${isDragOver ? 'is-drag-over' : ''}`}
            style={{ padding: '1rem', marginTop: '1rem' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();}}
          >
            {file ? <p>File selected: {file.name}</p> : <p>{t('dragAndDropPrompt')}</p>}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,image/*"
            />
          </div>

          <label htmlFor="textExtract">{t('docColumnTextExtract')}</label>
          <Textarea
            id="textExtract"
            value={textExtract}
            onChange={e => setTextExtract(e.target.value)}
            placeholder={t('textExtractPlaceholder')}
            style={{ minHeight: '100px' }}
          />

          {error && <p className="error-inline">{error}</p>}
        </div>

        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
          <Button onClick={handleSubmit}>{t('addDocumentButton')}</Button>
        </div>
      </div>
    </div>
  );
};