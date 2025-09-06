/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, FC, useEffect, ChangeEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { translations } from '../../translations';
import { DocumentItem } from '../types';
import { formatDate } from '../utils';
import { Card, Button, ConfirmationModal, Textarea } from '../components/ui';


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
  onUpload: (docId: string) => void;
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ doc, isOpen, onClose, onSave, onDelete, onUpload, t }) => {
    const [formData, setFormData] = useState<Partial<DocumentItem> | null>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [filePreview, setFilePreview] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    
    useEffect(() => {
        setFormData(doc);

        if (doc?.fileContent && doc?.fileMimeType) {
            setIsPreviewLoading(true);
            setFilePreview('');

            const parseContent = async () => {
                try {
                    const mimeType = doc.fileMimeType!;
                    const content = doc.fileContent!;
                    
                    if (mimeType.startsWith('text/')) {
                        const base64Content = content.substring(content.indexOf(',') + 1);
                        const binaryString = atob(base64Content);
                        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                        const decoder = new TextDecoder();
                        const textContent = decoder.decode(bytes);
                        setFilePreview(textContent);
                    } else if (mimeType === 'application/pdf') {
                        setFilePreview(t('parsingFileContent'));
                        const pdfData = atob(content.substring(content.indexOf(',') + 1));
                        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                        const pdf = await loadingTask.promise;
                        
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                            fullText += pageText + '\n';
                        }
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
            parseContent();
        } else if (doc) {
            setFilePreview(t('noFileUploaded'));
            setIsPreviewLoading(false);
        }

    }, [doc, t]);

    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = () => {
        if (formData) {
            onSave(formData);
        }
    };
    
    const handleUpload = () => {
        if (formData?.id) {
            onUpload(formData.id);
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
                            <label htmlFor="doc-content-preview">{t('documentContentHeader')}</label>
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
                    <Button onClick={handleUpload} variant="secondary">{t('uploadNewVersionButton')}</Button>
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
    setDocuments: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
}> = ({ t, documents, setDocuments }) => {
    const [newDocumentName, setNewDocumentName] = useState('');
    const [newDocumentType, setNewDocumentType] = useState('cv');
    const [isSidePaneOpen, setIsSidePaneOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [documentToUploadId, setDocumentToUploadId] = useState<string | null>(null);

    const handleUploadClick = (docId: string) => {
        setDocumentToUploadId(docId);
        fileInputRef.current?.click();
    };
    
    const handleOpenEditPane = (doc: DocumentItem) => {
        setSelectedDocument(doc);
        setIsSidePaneOpen(true);
    };

    const handleClosePane = () => {
        setIsSidePaneOpen(false);
        setSelectedDocument(null);
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
                // If the updated doc is the one in the pane, refresh the pane's content
                if (selectedDocument && selectedDocument.id === documentToUploadId) {
                    setSelectedDocument(prev => prev ? {
                        ...prev,
                        fileName: file.name,
                        fileContent: fileContent,
                        fileMimeType: file.type,
                        lastUpdated: new Date().toISOString()
                    } : null);
                }
            };
            reader.readAsDataURL(file);
        }
        setDocumentToUploadId(null);
        if(event.target) event.target.value = ''; // Reset file input
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
    
    const handleSaveDocument = (docData: Partial<DocumentItem>) => {
        setDocuments(docs => docs.map(d => d.id === docData.id ? { ...d, ...docData } as DocumentItem : d));
        handleClosePane();
    };

    const handleDeleteDocument = (docId: string) => {
        setDocuments(documents.filter(d => d.id !== docId));
        handleClosePane();
    };
    
    const getDocTypeName = (typeId: string) => {
        const type = documentTypes.find(dt => dt.id === typeId);
        return type ? t(type.nameKey) : t('docTypeOther');
    };

    return (
        <>
            <DocumentEditSidePane
                isOpen={isSidePaneOpen}
                doc={selectedDocument}
                onClose={handleClosePane}
                onSave={handleSaveDocument}
                onDelete={handleDeleteDocument}
                onUpload={handleUploadClick}
                t={t}
            />

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
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id} onClick={() => handleOpenEditPane(doc)}>
                                    <td>{doc.name}</td>
                                    <td>{getDocTypeName(doc.type)}</td>
                                    <td>{doc.fileName || '-'}</td>
                                    <td>{doc.lastUpdated ? formatDate(doc.lastUpdated) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};
