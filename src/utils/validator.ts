import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const getServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT tidak ditemukan di environment!");
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("CRITICAL: Gagal melakukan parse JSON FIREBASE_SERVICE_ACCOUNT. Pastikan formatnya valid.");
    return null;
  }
};

const serviceAccount = getServiceAccount();

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

export const validatePin = async (email: string, pin: string): Promise<boolean> => {
  if (!serviceAccount) return false; // Fail safe
  try {
    const userRef = db.collection('users').doc(email.toLowerCase());
    const doc = await userRef.get();
    return doc.exists && doc.data()?.pin === pin;
  } catch (error) {
    console.error("Error validating PIN:", error);
    return false;
  }
};
