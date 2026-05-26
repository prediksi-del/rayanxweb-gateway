import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Pastikan proses JSON.parse aman
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

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
