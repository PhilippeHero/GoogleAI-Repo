/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useEffect } from 'react';
import { Button } from './ui';
import { translations } from '../../translations';

type LogoutWarningModalProps = {
  isOpen: boolean;
  onLogout: () => void;
  onStay: () => void;
  t: (key: keyof typeof translations['EN'], vars?: { [key: string]: string | number }) => string;
};

export const LogoutWarningModal: FC<LogoutWarningModalProps> = ({ isOpen, onLogout, onStay, t }) => {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(60);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-top" role="dialog" aria-modal="true" aria-labelledby="logout-warning-title">
      <div className="modal-content logout-warning-modal">
        <h2 id="logout-warning-title">{t('logoutWarningTitle')}</h2>
        <div className="logout-warning-body">
          <p>{t('logoutWarningMessage', { seconds: countdown })}</p>
          <div className="logout-countdown">{countdown}</div>
        </div>
        <div className="modal-actions">
          <Button onClick={onStay} variant="secondary">{t('logoutWarningStayButton')}</Button>
          <Button onClick={onLogout} variant="primary">{t('logoutWarningLogoutButton')}</Button>
        </div>
      </div>
    </div>
  );
};
