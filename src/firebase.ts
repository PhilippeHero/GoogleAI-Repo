/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Fix: Use Firebase v8 compat imports
// Fix: Changed firebase/app to firebase/compat/app and firebase/auth to firebase/compat/auth to use v8 compatibility mode.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// IMPORTANT: Replace with your app's actual Firebase configuration
 const firebaseConfig = {
 apiKey: "AIzaSy...YOUR_API_KEY",
 authDomain: "your-project-id.firebaseapp.com",
 projectId: "your-project-id",
 storageBucket: "your-project-id.appspot.com",
 messagingSenderId: "your-sender-id",
 appId: "1:your-sender-id:web:your-app-id"
};

// Initialize Firebase
// Fix: Use Firebase v8 initialization syntax
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


// Initialize Firebase Authentication and get a reference to the service
// Fix: Use Firebase v8 auth syntax
export const auth = firebase.auth();
