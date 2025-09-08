/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC } from 'react';
import { Button } from './ui';
import { DocumentItem } from '../types';
import { translations } from '../../translations';


export const SelectCvModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentItem) => void;
  documents: DocumentItem[];
  t: (key: keyof typeof translations['EN']) => string;
}> = ({ isOpen, onClose, onSelect, documents, t }) => {
  if (!isOpen) return null;

  const selectableCVs = documents.filter(doc => doc.type === 'cv' && (doc.storagePath || doc.textExtract));

  const handleSelect = (doc: DocumentItem) => {
      onSelect(doc);
      onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="select-cv-title">
      <div className="modal-content selection-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="select-cv-title">{t('selectCvTitle')}</h2>
        {selectableCVs.length > 0 ? (
            <ul className="selection-list">
                {selectableCVs.map(doc => (
                    <li key={doc.id}>
                        <button onClick={() => handleSelect(doc)}>
                            <span className="selection-list-name">{doc.name}</span>
                            <span className="selection-list-filename">{doc.fileName || t('manualEntryLabel')}</span>
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p>{t('noCvsAvailable')}</p>
        )}
        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
        </div>
      </div>
    </div>
  );
};