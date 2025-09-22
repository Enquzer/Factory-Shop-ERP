
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "studio-6631144787-40e8b",
  appId: "1:804505201474:web:abc642a7e2c13b813cf6db",
  apiKey: "AIzaSyC2KFN9LaBgD7EnTQsX7zgcJ_AqzG-XIsc",
  authDomain: "studio-6631144787-40e8b.firebaseapp.com",
  storageBucket: "studio-6631144787-40e8b.appspot.com",
  measurementId: "",
  messagingSenderId: "804505201474"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };

    
