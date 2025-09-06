/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import { App } from './src/App';

// Configure PDF.js worker
// Use the version from the loaded library to avoid mismatches
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
