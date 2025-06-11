import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Reemplaza con la configuración de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBOtmU2vbCutQqmq4oxtgG3x7JGzgJt1_I",
  authDomain: "peluqueria-f52f8.firebaseapp.com",
  projectId: "peluqueria-f52f8",
  storageBucket: "peluqueria-f52f8.appspot.com",
  messagingSenderId: "693606615190",
  appId: "1:693606615190:web:8bb4f1c997d5df4ee51ab7",
  measurementId: "G-YFDW87L3DP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Autenticación
const auth = getAuth(app);

export { db, auth }; 