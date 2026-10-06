import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Firebase configuration for Adaptive-Quiz-System (adaptive-quiz-system-957ee)
const firebaseConfig = {
  apiKey: "AIzaSyBxnBV4mhdklamK9TjP1S277lZkkXva-eg",
  authDomain: "adaptive-quiz-system-957ee.firebaseapp.com",
  projectId: "adaptive-quiz-system-957ee",
  storageBucket: "adaptive-quiz-system-957ee.firebasestorage.app",
  messagingSenderId: "180168626445",
  appId: "1:180168626445:web:149cd7f60f46786be1a044",
  measurementId: "G-J84578R84L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  firebaseConfig
};

export default app;
