import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Pastikan Anda sudah menyimpan file serviceAccountKey.json di root
const serviceAccount = require('../../serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

export const validatePin = async (email: string, pin: string): Promise<boolean> => {
  const userRef = db.collection('users').doc(email.toLowerCase());
  const doc = await userRef.get();
  
  if (doc.exists && doc.data()?.pin === pin) {
    return true;
  }
  return false;
};
