/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { translations, LanguageCode } from '../../translations';
import { UserProfile, Gender, Page } from '../types';
import { Card, Button } from '../components/ui';
import { GoogleDriveIcon } from '../components/icons';
import { supabase } from '../supabase';

type ProfilePageProps = {
  t: (key: keyof typeof translations['EN']) => string;
  user: User;
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  setCurrentPage: (page: Page) => void;
  onTriggerLogoutWarning: () => void;
};

export const ProfilePage: FC<ProfilePageProps> = ({ t, user, profile, onSaveProfile, setCurrentPage, onTriggerLogoutWarning }) => {
  const [formData, setFormData] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(profile);
  
  const logoutOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5, 10, ..., 60

  useEffect(() => {
    // Update form data if the profile prop changes (e.g., on initial load)
    setFormData(profile);
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'autoLogoutMinutes' ? Number(value) : value }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleCancelOrGoBack = () => {
    if (isDirty) {
      setFormData(profile);
      setSaveSuccess(false);
    } else {
      setCurrentPage('generator');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Update Supabase Auth user metadata
      const newFullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (user.user_metadata.full_name !== newFullName) {
        const { error: userUpdateError } = await supabase.auth.updateUser({
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: newFullName,
          },
        });
        if (userUpdateError) throw userUpdateError;
      }
      
      // Update the public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          default_language: formData.defaultLanguage,
          gender: formData.gender,
          auto_logout_minutes: formData.autoLogoutMinutes,
        })
        .eq('id', user.id)
        .select();

      if (profileError) throw profileError;

      // Pass updated profile up to App state
      onSaveProfile(formData);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3s

    } catch (error: any) {
      console.error("Error updating profile:", error.message || error);
      // Here you would set an error state to show to the user
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page-grid">
      <form onSubmit={handleSave}>
        <Card className="profile-card">
          <h3>{t('profilePersonalInfo')}</h3>
          <div className="profile-form-grid">
            <div className="form-group-stack">
              <label htmlFor="firstName">{t('firstNameLabel')}</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div className="form-group-stack">
              <label htmlFor="lastName">{t('lastNameLabel')}</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div className="form-group-stack">
              <label htmlFor="email">{t('emailLabel')}</label>
              <input
                id="email"
                name="email"
                type="email"
                value={user.email || ''}
                className="input"
                disabled
              />
            </div>
          </div>

          <h3 style={{marginTop: '2rem'}}>{t('profilePreferences')}</h3>
          <div className="profile-form-grid">
            <div className="form-group-stack">
                <label htmlFor="defaultLanguage">{t('profileDefaultLanguage')}</label>
                <select
                    id="defaultLanguage"
                    name="defaultLanguage"
                    value={formData.defaultLanguage}
                    onChange={handleChange}
                    className="input"
                >
                    <option value="EN">{t('languageEnglish')}</option>
                    <option value="DE">{t('languageGerman')}</option>
                    <option value="FR">{t('languageFrench')}</option>
                </select>
            </div>
            <div className="form-group-stack">
                <label htmlFor="gender">{t('profileGender')}</label>
                <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input"
                >
                    <option value="unspecified">{t('genderUnspecified')}</option>
                    <option value="man">{t('genderMan')}</option>
                    <option value="woman">{t('genderWoman')}</option>
                    <option value="other">{t('genderOther')}</option>
                </select>
            </div>
            <div className="form-group-stack">
                <label htmlFor="autoLogoutMinutes">{t('profileAutoLogout')}</label>
                <select
                    id="autoLogoutMinutes"
                    name="autoLogoutMinutes"
                    value={formData.autoLogoutMinutes}
                    onChange={handleChange}
                    className="input"
                >
                    {logoutOptions.map(minutes => (
                        <option key={minutes} value={minutes}>
                            {minutes} minutes
                        </option>
                    ))}
                </select>
            </div>
          </div>
          <div className="modal-actions">
            <div>
                <Button type="button" variant="secondary" onClick={handleCancelOrGoBack}>
                    {isDirty ? t('cancelButton') : t('goBackButton')}
                </Button>
                {/* This is a temporary test button */}
                <Button type="button" variant="secondary" onClick={onTriggerLogoutWarning} style={{ marginLeft: '1rem' }}>
                    Test Auto-Logout
                </Button>
            </div>
            <div className="modal-actions-right-group">
                {saveSuccess && <span className="profile-save-feedback">{t('profileUpdatedSuccess')}</span>}
                <Button type="submit" disabled={isSaving || !isDirty}>
                {isSaving ? <span className="spinner" /> : null}
                {t('profileSaveButton')}
                </Button>
            </div>
          </div>
        </Card>
      </form>

      <Card className="profile-card">
        <h3>{t('profileConnectedServices')}</h3>
        <div className="service-connection-item">
            <div className="service-info">
                <div className="service-icon gdrive">
                    <GoogleDriveIcon />
                </div>
                <div className="service-details">
                    <h4>{t('profileConnectGoogleDrive')}</h4>
                    <p>{t('profileGdriveDescription')}</p>
                </div>
            </div>
            <Button variant="secondary" disabled>{t('profileConnectButton')}</Button>
        </div>
      </Card>
      <footer className="landing-footer">
          <p>AI driven Transformational Excellence</p>
      </footer>
    </div>
  );
};