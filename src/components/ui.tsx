/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, FC, CSSProperties, useEffect, ChangeEvent } from 'react';
import { translations } from '../../translations';
import { PlusIcon, MinusIcon } from './icons';

export const Card: FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`card ${className || ''}`}>{children}</div>
);

export const Button: FC<{ children: React.ReactNode, onClick?: () => void, disabled?: boolean, variant?: 'primary' | 'secondary', className?: string, style?: CSSProperties, 'aria-label'?: string }> = 
({ children, onClick, disabled, variant = 'primary', className, style, 'aria-label': ariaLabel }) => (
  <button onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className || ''}`} style={style} aria-label={ariaLabel}>
    {children}
  </button>
);

export const Textarea: FC<{
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  placeholder: string;
  style?: CSSProperties;
  id?: string;
  name?: string;
  readOnly?: boolean;
}> = ({ value, onChange, placeholder, style, id, name, readOnly }) => (
  <textarea
    className="input"
    value={value}
    onChange={onChange as (e: ChangeEvent<HTMLTextAreaElement>) => void}
    placeholder={placeholder}
    style={style}
    id={id}
    name={name}
    readOnly={readOnly}
  />
);

export const Collapsible: FC<{ title: string, children: React.ReactNode, isOpen: boolean, onToggle: () => void }> = ({ title, children, isOpen, onToggle }) => {
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
        {isOpen ? <MinusIcon className="collapsible-icon" /> : <PlusIcon className="collapsible-icon" />}
      </div>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </section>
  );
};

export const Modal: FC<{ message: string, footerText: string }> = ({ message, footerText }) => {
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

export const ConfirmationModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  t: (key: keyof typeof translations['EN']) => string;
  className?: string;
}> = ({ isOpen, onClose, onConfirm, title, children, t, className }) => {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className || ''}`} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="modal-content confirmation-modal">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirmation-modal-body">{children}</div>
        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary">{t('cancelButton')}</Button>
          <Button onClick={onConfirm} className="btn-destructive">{t('confirmButton')}</Button>
        </div>
      </div>
    </div>
  );
};

export const DropdownMenu: FC<{
  trigger: React.ReactNode;
  children: React.ReactNode;
}> = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const childrenWithCloseHandler = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      const originalOnClick = (child.props as any).onClick;
      return React.cloneElement(child as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          if (originalOnClick) {
            originalOnClick(e);
          }
          setIsOpen(false);
        },
      });
    }
    return child;
  });

  return (
    <div className="dropdown" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="dropdown-trigger">
        {trigger}
      </div>
      {isOpen && (
        <div className="dropdown-content">
          {childrenWithCloseHandler}
        </div>
      )}
    </div>
  );
};