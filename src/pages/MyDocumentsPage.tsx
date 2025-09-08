/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, FC, useEffect, ChangeEvent } from 'react';
// FIX: Changed to type-only import for Supabase User type.
import type { User } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { translations } from '../../translations';
import { DocumentItem } from '../types';
import { formatDate } from '../utils';
import { Card, Button, ConfirmationModal, Textarea } from '../components/ui';
import { supabase } from '../supabase';
import { AddDocumentModal } from '../components/AddDocumentModal';


const documentTypes = [
    { id: 'cv', nameKey: 'docTypeCv' as const },
    { id: 'competenceMatrix', nameKey: 'docTypeCompetenceMatrix' as const },
    { id: 'coverLetter', nameKey: 'docTypeCoverLetter' as const },
    { id: 'references', nameKey: 'docTypeReferences' as const },
    { id: 'other', nameKey: 'docTypeOther' as const },
];

const DocumentEditSidePane: FC<{
  doc: Partial<DocumentItem> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Partial<DocumentItem>) => void;
  onDelete: (docId: string) => void;
  onUpload: (docId: string, file: File) => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ doc, isOpen, onClose, onSave, onDelete, onUpload, t }) => {
    const [formData, setFormData] = useState<Partial<DocumentItem> | null>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [filePreview, setFilePreview] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        setFormData(doc);
        setFilePreview('');
        
        if (doc?.storagePath && doc?.fileMimeType) {
            setIsPreviewLoading(true);

            const fetchAndParseFile = async () => {
                try {
                    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storagePath!, 60);
                    if (error) throw error;
                    
                    const response = await fetch(data.signedUrl);
                    if (!response.ok) throw new Error('Failed to download file');
                    
                    const arrayBuffer = await response.arrayBuffer();
                    const mimeType = doc.fileMimeType!;
                    
                    if (mimeType.startsWith('text/')) {
                        setFilePreview(new TextDecoder().decode(arrayBuffer));
                    } else if (mimeType === 'application/pdf') {
                        setFilePreview(t('parsingFileContent'));
                        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                            fullText += pageText + '\n';
                        }
                        setFilePreview(fullText.trim());
                    } else if (
                        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                        mimeType === 'application/msword'
                    ) {
                        setFilePreview(t('parsingFileContent'));
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        setFilePreview(result.value);
                    } else if (
                        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        mimeType === 'application/vnd.ms-excel' ||
                        doc.fileName?.endsWith('.xlsx') ||
                        doc.fileName?.endsWith('.xls')
                    ) {
                        setFilePreview(t('parsingFileContent'));
                        const workbook = xlsx.read(arrayBuffer, { type: 'array' });
                        let fullText = '';
                        workbook.SheetNames.forEach(sheetName => {
                            fullText += `--- Sheet: ${sheetName} ---\n`;
                            const worksheet = workbook.Sheets[sheetName];
                            const sheetData = xlsx.utils.sheet_to_csv(worksheet);
                            fullText += sheetData + '\n\n';
                        });
                        setFilePreview(fullText.trim());
                    } else {
                        setFilePreview(t('previewNotAvailableForText'));
                    }
                } catch (e) {
                    console.error("Failed to parse file content for preview:", e);
                    setFilePreview(t('errorParsingFilePreview'));
                } finally {
                    setIsPreviewLoading(false);
                }
            };
            fetchAndParseFile();
        } else if (doc) {
            setFilePreview(t('noFileUploaded'));
            setIsPreviewLoading(false);
        }

    }, [doc, t]);

    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = () => {
        if (formData) {
            onSave(formData);
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && formData?.id) {
            onUpload(formData.id, file);
        }
        if(event.target) event.target.value = ''; // Reset file input
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
    
    const placeholderText = isPreviewLoading ? t('parsingFileContent') : (filePreview || t('noFileUploaded'));

    return (
        <>
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('deleteDocumentConfirmationTitle')}
                t={t}
                className="modal-overlay-top"
            >
                <p>{t('deleteDocumentConfirmation')}</p>
            </ConfirmationModal>
            
            <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,image/*"
            />

            <div className={`side-pane-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <div className={`side-pane ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="side-pane-doc-title">
                <div className="side-pane-header">
                    <h2 id="side-pane-doc-title">{t('editDocumentTitle')}</h2>
                    <Button onClick={onClose} variant="secondary" className="btn-icon" aria-label={t('closeButton')}>
                        <span style={{fontSize: '1.5rem', lineHeight: '1'}}>&times;</span>
                    </Button>
                </div>
                <div className="side-pane-body">
                    <p>{t('editDocumentSubtitle')}</p>
                    <div className="form-group-stack">
                        <label htmlFor="edit-doc-name">{t('docNameColumn')}</label>
                        <input id="edit-doc-name" name="name" value={formData.name || ''} onChange={handleChange} className="input" />
                        
                        <label htmlFor="edit-doc-type">{t('docTypeColumn')}</label>
                        <select
                            id="edit-doc-type"
                            name="type"
                            value={formData.type || ''}
                            onChange={handleChange}
                            className="input"
                        >
                            {documentTypes.map(type => (
                                <option key={type.id} value={type.id}>{t(type.nameKey)}</option>
                            ))}
                        </select>

                        <div className="form-group-expand" style={{marginTop: '1rem'}}>
                            <label htmlFor="edit-doc-textExtract">{t('docColumnTextExtract')}</label>
                            <Textarea 
                                id="edit-doc-textExtract" 
                                name="textExtract" 
                                value={formData.textExtract || ''} 
                                onChange={handleChange}
                                placeholder={t('textExtractPlaceholder')}
                            />
                        </div>


                        <div className="form-group-expand" style={{marginTop: '1rem'}}>
                            <div className="card-header-wrapper" style={{marginBottom: '0.5rem'}}>
                                <label htmlFor="doc-content-preview">{t('documentContentHeader')}</label>
                                <Button onClick={handleUploadClick} variant="secondary">{t('uploadNewVersionButton')}</Button>
                            </div>
                            <Textarea 
                                id="doc-content-preview" 
                                name="content" 
                                value={filePreview} 
                                onChange={() => {}} 
                                placeholder={placeholderText}
                                readOnly 
                            />
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


export const MyDocumentsPage: FC<{
    t: (key: keyof typeof translations['EN']) => string;
    documents: DocumentItem[];
    onDocumentAdded: (doc: DocumentItem) => void;
    onUpdateDocument: (doc: Partial<DocumentItem>) => void;
    onDeleteDocument: (docId: string) => void;
    user: User | null;
}> = ({ t, documents, onDocumentAdded, onUpdateDocument, onDeleteDocument, user }) => {
    const [isSidePaneOpen, setIsSidePaneOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [preloadedFile, setPreloadedFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    
    const dropZoneFileInputRef = useRef<HTMLInputElement>(null);

    const handleOpenEditPane = (doc: DocumentItem) => {
        setSelectedDocument(doc);
        setIsSidePaneOpen(true);
    };

    const handleClosePane = () => {
        setIsSidePaneOpen(false);
        setSelectedDocument(null);
    };

    const handleFileUpload = async (docId: string, file: File) => {
        if (!user) return;

        // 1. Delete old file if it exists
        const docToUpdate = documents.find(d => d.id === docId);
        if (docToUpdate?.storagePath) {
            const { error: removeError } = await supabase.storage.from('documents').remove([docToUpdate.storagePath]);
            if (removeError) {
                console.error("Error removing old file:", removeError);
            }
        }

        // 2. Upload new file with a unique name in the user's folder.
        const storagePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file);

        if (uploadError) {
            console.error("Error uploading file:", uploadError);
            // TODO: show error to user
            return;
        }
        
        // 3. Update database record
        const updatedDoc = {
            id: docId,
            fileName: file.name,
            storagePath: storagePath,
            fileMimeType: file.type,
            updatedAt: new Date().toISOString()
        };
        onUpdateDocument(updatedDoc);
        
        // If the updated doc is the one in the pane, refresh the pane's content
        if (selectedDocument && selectedDocument.id === docId) {
            setSelectedDocument(prev => prev ? { ...prev, ...updatedDoc } : null);
        }
    };
    
    const handleSaveDocument = (docData: Partial<DocumentItem>) => {
        onUpdateDocument(docData);
        handleClosePane();
    };

    const handleDeleteDocument = (docId: string) => {
        onDeleteDocument(docId);
        handleClosePane();
    };
    
    const getDocTypeName = (typeId: string) => {
        const type = documentTypes.find(dt => dt.id === typeId);
        return type ? t(type.nameKey) : t('docTypeOther');
    };

    const handleOpenAddModal = () => {
        setPreloadedFile(null);
        setIsAddModalOpen(true);
    };

    const handleAddNewDocument = async (docData: { name: string, type: string, textExtract: string }, file: File | null) => {
        if (!user) return;
        setError(''); // Clear previous errors

        try {
            let storagePath: string | undefined = undefined;
            if (file) {
                const generatedStoragePath = `${user.id}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(generatedStoragePath, file);
        
                if (uploadError) {
                    throw uploadError; // Throw to be caught by the catch block
                }
                storagePath = generatedStoragePath;
            }
        
            const dataForSupabase = {
              user_id: user.id,
              name: docData.name,
              type: docData.type,
              file_name: file?.name || null,
              storage_path: storagePath || null,
              file_mime_type: file?.type || null,
              text_extract: docData.textExtract?.trim() ? docData.textExtract.trim() : null,
            };
    
            const { data, error: insertError } = await supabase.from('documents').insert(dataForSupabase).select().single();
    
            if (insertError) {
                throw insertError; // Throw to be caught
            }
    
            if (data) {
                // Convert back to camelCase and update parent state
                const newDocForState: DocumentItem = {
                    id: data.id,
                    user_id: data.user_id,
                    created_at: data.created_at,
                    name: data.name,
                    type: data.type,
                    fileName: data.file_name,
                    storagePath: data.storage_path,
                    fileMimeType: data.file_mime_type,
                    updatedAt: data.updated_at,
                    textExtract: data.text_extract,
                };
                onDocumentAdded(newDocForState);
            }
    
        } catch (err: any) {
            console.error("Error adding document:", err);
            setError(err.message || t('errorGeneric'));
        }
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
        const file = event.dataTransfer.files?.[0];
        if (file) {
            setPreloadedFile(file);
            setIsAddModalOpen(true);
        }
    };

    const handleFileSelectFromDropZone = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPreloadedFile(file);
            setIsAddModalOpen(true);
        }
        if (event.target) event.target.value = ''; // Reset file input
    };

    return (
        <>
            <DocumentEditSidePane
                isOpen={isSidePaneOpen}
                doc={selectedDocument}
                onClose={handleClosePane}
                onSave={handleSaveDocument}
                onDelete={handleDeleteDocument}
                onUpload={handleFileUpload}
                t={t}
            />

            <AddDocumentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddNewDocument}
                t={t}
                preloadedFile={preloadedFile}
            />
            
            {error && <div className="error" role="alert">{error}</div>}

            <Card className="add-job-card">
                 <div className="card-header-wrapper">
                    <h3 className="card-header">{t('addDocumentTitle')}</h3>
                    <Button onClick={handleOpenAddModal} type="button">
                        {t('addDocumentButton')}
                    </Button>
                </div>
                
                <div 
                    className={`drop-zone ${isDragOver ? 'is-drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => dropZoneFileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dropZoneFileInputRef.current?.click();}}
                >
                    <p>{t('dragAndDropPrompt')}</p>
                    <input 
                        type="file"
                        ref={dropZoneFileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelectFromDropZone}
                        accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,image/*"
                    />
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
                                <th>{t('docColumnTextExtract')}</th>
                                <th>{t('docLastUpdatedColumn')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id} onClick={() => handleOpenEditPane(doc)}>
                                    <td>{doc.name}</td>
                                    <td>{getDocTypeName(doc.type)}</td>
                                    <td>{doc.fileName || '-'}</td>
                                    <td><div className="truncate-text" style={{maxWidth: '200px'}}>{doc.textExtract}</div></td>
                                    <td>{doc.updatedAt ? formatDate(doc.updatedAt) : '-'}</td>
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