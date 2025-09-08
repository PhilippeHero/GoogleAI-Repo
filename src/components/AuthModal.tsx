/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useEffect, useRef } from 'react';
import { Button } from './ui';
import { SparkIcon, GoogleIcon, EyeIcon, EyeOffIcon } from './icons';
import { translations } from '../../translations';
import { supabase } from '../supabase';


type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  t: (key: keyof typeof translations['EN']) => string;
};

type View = 'signin' | 'signup' | 'forgot' | 'success';

export const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose, t }) => {
  const [error, setError] = useState<string[]>([]);
  const [view, setView] = useState<View>('signin');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const forgotEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setView('signin');
        setError([]);
        setSuccessMessage('');
        setIsPasswordVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthToggle = () => {
      setError([]);
      setIsPasswordVisible(false);
      setView(prev => prev === 'signin' ? 'signup' : 'signin');
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError([]);
    const email = forgotEmailRef.current?.value;
    
    if (!email) {
        setError(["Please enter an email address."]);
        return;
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMessage(t('resetEmailSentMessage'));
        setView('success');
    } catch (err: any) {
        setError([err.message || "An unexpected error occurred."]);
    }
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

    if (view === 'signin') {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // onAuthStateChanged in App.tsx will handle the rest
        } catch (err: any) {
            if (err.message.includes('Invalid login credentials')) {
                setError([t('errorUserNotFound')]);
            } else {
                setError([err.message || 'An unexpected error occurred during sign in.']);
            }
        }
    } else { // signup mode
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;

        if (!firstName || !lastName) {
            setError([t('errorMissingName')]);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        full_name: `${firstName.trim()} ${lastName.trim()}`,
                    }
                }
            });
            if (error) throw error;
            
            const isEmailConfirmationRequired = data.user?.identities?.length === 0;

            if (isEmailConfirmationRequired) {
                setSuccessMessage(t('verificationEmailSentMessage'));
            } else {
                setSuccessMessage('Account created successfully!');
            }
            setView('success');

        } catch (err: any) {
             if (err.message.includes('Password should be at least 6 characters')) {
                setError([t('errorWeakPassword')]);
            } else if (err.message.includes('User already registered')) {
                setError([t('errorEmailInUse')]);
            } else {
                setError([err.message || 'An error occurred during sign up. Please try again.']);
            }
        }
    }
  };

  const handleGoogleSignIn = async () => {
      setError([]);
      try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) throw error;
        // The user will be redirected, onAuthStateChanged handles success
      } catch (err: any) {
        setError([err.message || "An unexpected error occurred with Google Sign-In."]);
      }
  }
  
  const renderContent = () => {
    if (view === 'success') {
      return (
        <>
          <div className="auth-modal-header">
            <SparkIcon className="sidebar-spark-icon" />
            <h2 id="auth-dialog-title">{t('successTitle')}</h2>
          </div>
          <p className="auth-info">{successMessage}</p>
          <Button onClick={onClose} className="auth-button">
              {t('continueButton')}
          </Button>
        </>
      );
    }
    
    if (view === 'forgot') {
      return (
        <>
          <div className="auth-modal-header">
            <SparkIcon className="sidebar-spark-icon" />
            <h2 id="auth-dialog-title">{t('resetPasswordTitle')}</h2>
          </div>
          <p className="auth-modal-subtitle">{t('resetPasswordSubtitle')}</p>
          <form className="auth-form" onSubmit={handlePasswordReset}>
            <div className="form-group-stack">
              <label htmlFor="forgot-email">{t('emailLabel')}</label>
              <input ref={forgotEmailRef} id="forgot-email" name="email" type="email" className="input" placeholder="email@example.com" required />
            </div>
            {error.length > 0 && <ul className="error-list">{error.map((err, i) => <li key={i}>{err}</li>)}</ul>}
            <Button type="submit" className="auth-button">
              {t('sendResetLinkButton')}
            </Button>
          </form>
          <div className="auth-toggle">
            <button onClick={() => setView('signin')} className="btn-link">
              {t('backToSignInLink')}
            </button>
          </div>
        </>
      );
    }

    const isSignIn = view === 'signin';
    return (
      <>
        <div className="auth-modal-header">
          <SparkIcon className="sidebar-spark-icon" />
          <h2 id="auth-dialog-title">{t('authModalTitle')}</h2>
        </div>
        <p className="auth-modal-subtitle">{t('authModalSubtitle')}</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {view === 'signup' && (
            <>
              <div className="form-group-stack">
                <label htmlFor="firstName">{t('firstNameLabel')}</label>
                <input id="firstName" name="firstName" type="text" className="input" placeholder="Jane" required />
              </div>
              <div className="form-group-stack">
                <label htmlFor="lastName">{t('lastNameLabel')}</label>
                <input id="lastName" name="lastName" type="text" className="input" placeholder="Doe" required />
              </div>
            </>
          )}

          <div className="form-group-stack">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input id="email" name="email" type="email" className="input" placeholder="email@example.com" required />
          </div>
          <div className="form-group-stack">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                className="input"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="password-toggle-btn"
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {isSignIn && (
            <div className="forgot-password-link-container">
                <button type="button" onClick={() => setView('forgot')} className="btn-link">
                    {t('forgotPasswordLink')}
                </button>
            </div>
          )}

          {error.length > 0 && <ul className="error-list">{error.map((err, i) => <li key={i}>{err}</li>)}</ul>}
          
          <Button type="submit" className="auth-button">
            {isSignIn ? t('signInButton') : t('createAccountButton')}
          </Button>
        </form>

        <div className="auth-toggle">
            <span>{isSignIn ? t('authModalPromptToSignUp') : t('authModalPromptToSignIn')}</span>
            <button onClick={handleAuthToggle} className="btn-link">
                {isSignIn ? t('authModalActionSignUp') : t('authModalActionSignIn')}
            </button>
        </div>

        <div className="auth-divider"><span className="auth-divider-text">OR</span></div>

        <Button variant="secondary" onClick={handleGoogleSignIn} className="auth-button google-button">
          <GoogleIcon />
          {t('signInWithGoogleButton')}
        </Button>
      </>
    );
  };


  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
};