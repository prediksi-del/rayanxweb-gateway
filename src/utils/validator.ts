import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Mengambil dan mem-parsing string JSON dari .env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

export const validatePin = async (email: string, pin: string): Promise<boolean> => {
  try {
    const userRef = db.collection('users').doc(email.toLowerCase());
    const doc = await userRef.get();
    
    if (doc.exists && doc.data()?.pin === pin) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error validating PIN:", error);
    return false;
  }
};
