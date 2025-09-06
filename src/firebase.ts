/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Fix: Use Firebase v8 compat imports
// Fix: Changed firebase/app to firebase/compat/app and firebase/auth to firebase/compat/auth to use v8 compatibility mode.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// =================================================================================
// TODO: CONFIGURE FIREBASE
// =================================================================================
// 1. Create a new Firebase project at https://console.firebase.google.com/
// 2. Go to your Project Settings > General tab.
// 3. Under "Your apps", click the Web icon (</>) to create a new web app.
// 4. Copy the firebaseConfig object provided by Firebase and paste it here,
//    replacing the placeholder object below.
//
// The app will not function correctly until you complete these steps. The error
// "auth/api-key-not-valid" is expected if you use the placeholder values.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAqQquHQDeDoisIfr4VVTbNoWCOVqddpQc",
  authDomain: "ai-cover-letter-app-f53ad.firebaseapp.com",
  projectId: "ai-cover-letter-app-f53ad",
  storageBucket: "ai-cover-letter-app-f53ad.appspot.com",
  messagingSenderId: "349206864742",
  appId: "1:349206864742:web:3a9147f99c42d11b1ddea7"
};


// Initialize Firebase
// Fix: Use Firebase v8 initialization syntax
if (!firebase.apps.length) {
  // Add a check to ensure placeholders are replaced
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.error("Firebase configuration is not set. Please update src/firebase.ts with your project's credentials.");
  } else {
    firebase.initializeApp(firebaseConfig);
  }
}


// Initialize Firebase Authentication and get a reference to the service
// Fix: Use Firebase v8 auth syntax
export const auth = firebase.auth();