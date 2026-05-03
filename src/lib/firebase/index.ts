import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkN7n7n7n7n7n7n7n7n7n7n7n7n7n7n",
  authDomain: "veppp.firebaseapp.com",
  databaseURL: "https://veppp-default-rtdb.firebaseio.com",
  projectId: "veppp",
  storageBucket: "veppp.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export default app;
