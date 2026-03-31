import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, getDoc, getDocs, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, getDoc, getDocs, deleteDoc, updateDoc, orderBy };
