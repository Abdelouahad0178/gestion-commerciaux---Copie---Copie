// Configuration de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXTqyVeV5iVlTMaTgVzJ_awHDFfqpWEJw",
  authDomain: "gestioncommerciaux-9f220.firebaseapp.com",
  projectId: "gestioncommerciaux-9f220",
  storageBucket: "gestioncommerciaux-9f220.appspot.com",
  messagingSenderId: "37204441992",
  appId: "1:37204441992:web:be1a33b81a3e761066d83d",
  measurementId: "G-KKD8N3CMPB"
};


// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Initialisation des autres services Firebase
const auth = firebase.auth();
const firestore = firebase.firestore();

// Vérifiez si Firebase Messaging est supporté
let messaging;
if (typeof firebase.messaging === "function") {
  try {
    messaging = firebase.messaging();
    console.log("Firebase Messaging initialisé :", messaging);
  } catch (error) {
    console.warn("Firebase Messaging n'est pas supporté ou a rencontré une erreur :", error);
  }
} else {
  console.warn("Firebase Messaging n'est pas disponible dans cet environnement.");
}