function parseFirebaseConfig() {
  const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;

  if (rawConfig) {
    try {
      return JSON.parse(rawConfig);
    } catch (error) {
      console.error("Invalid VITE_FIREBASE_CONFIG JSON.", error);
    }
  }

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value),
  );
}

export const appId = import.meta.env.VITE_APP_ID || "stickman-arena";
export const firebaseConfig = parseFirebaseConfig();
export const initialAuthToken = import.meta.env.VITE_FIREBASE_CUSTOM_TOKEN || null;
export const apiUrl = "/api/generate";
