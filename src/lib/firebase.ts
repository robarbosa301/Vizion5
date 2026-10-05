import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// Config pública do app web — não é segredo: a segurança de verdade fica nas regras do
// Firestore (cada usuário só lê/escreve as próprias obras) e no Authentication.
const firebaseConfig = {
  apiKey: 'AIzaSyA1IXXs_hw6_6izJ-kb6HUv2oHLJyKeQ2U',
  authDomain: 'vizion5-39466.firebaseapp.com',
  projectId: 'vizion5-39466',
  storageBucket: 'vizion5-39466.firebasestorage.app',
  messagingSenderId: '436002402560',
  appId: '1:436002402560:web:9801c21d73d480c65903e5',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Cache local persistente: a obra continua acessível (e editável) sem sinal no canteiro,
// sincronizando sozinha assim que a conexão volta.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache(),
  ignoreUndefinedProperties: true,
});
