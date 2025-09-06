/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { FC } from 'react';
import { translations } from '../../translations';
import { Page } from '../types';
import { Button } from '../components/ui';
import { SparkIcon, FileTextIcon, BriefcaseIcon, UserIcon } from '../components/icons';


type LandingPageProps = {
  t: (key: keyof typeof translations['EN']) => string;
  setCurrentPage: (page: Page) => void;
}

export const LandingPage: FC<LandingPageProps> = ({ t, setCurrentPage }) => {
  return (
    <div className="landing-page-container">
      <div className="hero-section">
        <div className="hero-sparks" aria-hidden="true">
            <SparkIcon />
            <SparkIcon />
            <SparkIcon />
            <SparkIcon />
        </div>
        <div className="hero-content">
          <SparkIcon className="hero-spark-icon" />
          <h1 className="hero-title">{t('landingTitle')}</h1>
          <p className="hero-subtitle">{t('landingSubtitle')}</p>
          <Button onClick={() => setCurrentPage('generator')} className="hero-cta">
            {t('landingCtaButton')}
          </Button>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card large" onClick={() => setCurrentPage('generator')}>
            <FileTextIcon />
            <h3>{t('featureGeneratorTitle')}</h3>
            <p>{t('featureGeneratorDescription')}</p>
        </div>
        <div className="feature-card" onClick={() => setCurrentPage('jobs')}>
            <BriefcaseIcon />
            <h3>{t('featureJobsTitle')}</h3>
            <p>{t('featureJobsDescription')}</p>
        </div>
        <div className="feature-card" onClick={() => setCurrentPage('documents')}>
            <UserIcon />
            <h3>{t('featureDocumentsTitle')}</h3>
            <p>{t('featureDocumentsDescription')}</p>
        </div>
      </div>
      
      <footer className="landing-footer">
        <p>AI driven Transformational Excellence</p>
      </footer>
    </div>
  );
};