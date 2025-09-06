/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState } from 'react';
// Fix: Use Firebase v8 compat imports
// Fix: Changed firebase/app to firebase/compat/app and added firebase/compat/auth to use v8 compatibility mode and resolve errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Button } from './ui';
import { SparkIcon, GoogleIcon } from './icons';
import { translations } from '../../translations';
import { auth } from '../firebase';


type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  t: (key: keyof typeof translations['EN']) => string;
};

export const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, t }) => {
  const [error, setError] = useState<string[]>([]);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  if (!isOpen) return null;

  const handleAuthToggle = () => {
      setError([]);
      setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError([]);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        setError(["Please enter both email and password."]);
        return;
    }

    if (authMode === 'signin') {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            onLoginSuccess();
        } catch (err: any) {
            // Check if it looks like a Firebase error by checking for a 'code' property
            if (err && err.code) {
                switch(err.code) {
                    case 'auth/user-not-found':
                    case 'auth/invalid-email':
                        setError([t('errorUserNotFound')]);
                        break;
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential':
                        setError([t('errorWrongPassword')]);
                        break;
                    default:
                        // For any other Firebase error, display its message directly for more specific feedback.
                        setError([err.message || 'An unexpected error occurred during sign in.']);
                }
            } else {
                setError(["An unexpected error occurred during sign in."]);
            }
        }
    } else { // signup mode
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            onLoginSuccess();
        } catch (err: any) {
            // Check if it looks like a Firebase error by checking for a 'code' property
            if (err && err.code) {
                switch(err.code) {
                    case 'auth/weak-password':
                        // The err.message from Firebase contains the specific policy violation.
                        // We clean it by removing the error code in parentheses for better UI.
                        const cleanedMessage = err.message.replace(/\s\(auth\/[\w-]+\)\.?$/, '').trim();
                        setError([cleanedMessage]);
                        break;
                    case 'auth/email-already-in-use':
                        setError([t('errorEmailInUse')]);
                        break;
                    default:
                        // For any other Firebase error, display its message directly.
                        // This helps provide more specific feedback for unexpected errors.
                        setError([err.message || 'An error occurred during sign up. Please try again.']);
                }
            } else {
                // Handle non-Firebase errors
                setError(["An unexpected error occurred during sign up."]);
            }
        }
    }
  };

  const handleGoogleSignIn = async () => {
      setError([]);
      // Fix: Use Firebase v8 GoogleAuthProvider
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
          // Fix: Use Firebase v8 signInWithPopup method
          await auth.signInWithPopup(provider);
          onLoginSuccess();
      } catch (error: any) {
           if (error && error.code) { // Check if it's a Firebase error
                // Don't show an error if the user just closed the popup
                if(error.code !== 'auth/popup-closed-by-user') {
                    setError([error.message]);
                }
            } else {
                setError(["An unexpected error occurred with Google Sign-In."]);
            }
      }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <SparkIcon className="sidebar-spark-icon" />
          <h2 id="auth-dialog-title">{t('authModalTitle')}</h2>
        </div>
        <p className="auth-modal-subtitle">{t('authModalSubtitle')}</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group-stack">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input id="email" name="email" type="email" className="input" placeholder="email@example.com" required />
          </div>
          <div className="form-group-stack">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input id="password" name="password" type="password" className="input" placeholder="********" required />
          </div>
          {error.length > 0 && (
            <ul className="error-list">
                {error.map((err, index) => <li key={index}>{err}</li>)}
            </ul>
          )}
          <Button type="submit" className="auth-button">
            {authMode === 'signin' ? t('signInButton') : t('createAccountButton')}
          </Button>
        </form>

        <div className="auth-toggle">
            <span>
                {authMode === 'signin' ? t('authModalPromptToSignUp') : t('authModalPromptToSignIn')}
            </span>
            <button onClick={handleAuthToggle} className="btn-link">
                {authMode === 'signin' ? t('authModalActionSignUp') : t('authModalActionSignIn')}
            </button>
        </div>

        <div className="auth-divider">
          <span className="auth-divider-text">OR</span>
        </div>

        <Button variant="secondary" onClick={handleGoogleSignIn} className="auth-button google-button">
          <GoogleIcon />
          {t('signInWithGoogleButton')}
        </Button>
      </div>
    </div>
  );
};