import admin from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let serviceAccount = null;
const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(keyPath)) {
  serviceAccount = require('./serviceAccountKey.json');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', err.message);
  }
}

// Initialize Firebase App if credentials are present
let app = null;
let db = null;

if (serviceAccount) {
  app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];
  db = getFirestore(app);
} else {
  console.warn('[Firebase] Warning: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT not set. Firebase initialized in offline fallback mode.');
  // Stub fallback to prevent crash on import
  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => {},
        update: async () => {},
        delete: async () => {},
        collection: () => ({
          doc: () => ({ set: async () => {}, get: async () => ({ exists: false }) }),
          get: async () => ({ empty: true, forEach: () => {} }),
        }),
      }),
      where: () => ({
        limit: () => ({ get: async () => ({ empty: true, size: 0, docs: [] }) }),
        get: async () => ({ empty: true, size: 0, forEach: () => {} }),
      }),
      limit: () => ({ get: async () => ({ empty: true, size: 0, docs: [] }) }),
      get: async () => ({ empty: true, size: 0, forEach: () => {} }),
    }),
  };
}

// Extend admin object for backward compatibility
admin.firestore = () => db;
admin.credential = { cert };

export { admin, db, app, FieldValue, Timestamp };
export default admin;
