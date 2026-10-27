import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // ต้องมีบรรทัดนี้

const firebaseConfig = {
  apiKey: 'AIzaSyA3x_7SzyEPTIqb8_SyEnWypEit0I9IOPA',
  authDomain: 'queue-7ccd5.firebaseapp.com',
  projectId: 'queue-7ccd5',
  storageBucket: 'queue-7ccd5.firebasestorage.app',
  messagingSenderId: '878468849144',
  appId: '1:878468849144:web:e45d82091684e2254d8a0d',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // ต้องมี export ออกมาใช้งาน
