// js/firebase.js

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCNNbsbuyLDfZN8XB5uzexBNaNA_MuJ8QI",
  authDomain: "website-kevinlee0708.firebaseapp.com",
  projectId: "website-kevinlee0708",
  storageBucket: "website-kevinlee0708.firebasestorage.app",
  messagingSenderId: "313895693324",
  appId: "1:313895693324:web:81941ff11d726c7d7fd229",
  measurementId: "G-4NP7NRK0ED"
};



// Firebase 초기화
const app = initializeApp(firebaseConfig);


// Cloud Firestore
export const db = getFirestore(app);