import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpYJCmshYMecivaknTP0uh-D5FokVnRTg",
  authDomain: "quagnitia-claim-page.firebaseapp.com",
  projectId: "quagnitia-claim-page",
  storageBucket: "quagnitia-claim-page.firebasestorage.app",
  messagingSenderId: "67781460366",
  appId: "1:67781460366:web:321825b14616e7221c24df"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
