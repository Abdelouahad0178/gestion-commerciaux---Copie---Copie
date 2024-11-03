document.addEventListener("DOMContentLoaded", () => {
  console.log("Le DOM est chargé.");

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  // Fonction pour afficher/masquer le mot de passe
  function togglePasswordVisibility(inputId) {
    const passwordField = document.getElementById(inputId);
    passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
  }

  // Initialisation de Firebase Messaging avec une vérification
  let messaging;
  if (typeof firebase.messaging === "function") {
    try {
      messaging = firebase.messaging();
      console.log("Firebase Messaging est initialisé.");
    } catch (error) {
      console.warn("Firebase Messaging n'est pas supporté ou a rencontré une erreur :", error);
    }
  } else {
    console.warn("Firebase Messaging n'est pas disponible dans cet environnement.");
  }

  // Gestion du formulaire de connexion, si présent
  if (loginForm) {
    console.log("Formulaire de connexion trouvé.");
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // Connexion de l'utilisateur avec email et mot de passe
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;

          // Vérification du rôle de l'utilisateur pour rediriger
          firebase.firestore().collection('Users').doc(user.uid).get()
            .then((doc) => {
              if (doc.exists) {
                const role = doc.data().role;

                // Demande de permission pour recevoir les notifications et stockage du token FCM
                if (messaging) {
                  messaging.requestPermission()
                    .then(() => messaging.getToken())
                    .then((token) => {
                      if (token) {
                        console.log("Token FCM reçu :", token);
                        // Stocker le token FCM dans Firestore pour le responsable
                        firebase.firestore().collection("Users").doc(user.uid).update({ fcmToken: token });
                      } else {
                        console.warn("Aucun token FCM reçu.");
                      }
                    })
                    .catch((error) => console.error("Impossible de récupérer le token de notification :", error));
                } else {
                  console.warn("Firebase Messaging n'est pas disponible.");
                }

                // Redirection selon le rôle
                if (role === "responsable") {
                  console.log("Redirection vers le tableau de bord responsable.");
                  window.location.href = "responsable_dashboard.html";
                } else if (role === "commercial") {
                  console.log("Redirection vers le tableau de bord commercial.");
                  window.location.href = "commercial_dashboard.html";
                } else {
                  console.warn("Rôle non reconnu, redirection vers la page de connexion.");
                  window.location.href = "login.html";
                }
              } else {
                console.error("Aucun document trouvé pour cet utilisateur dans Firestore.");
                document.getElementById('login-error-message').textContent = "Erreur : Informations d'utilisateur introuvables.";
              }
            })
            .catch((error) => {
              console.error("Erreur lors de la récupération du rôle de l'utilisateur :", error);
              document.getElementById('login-error-message').textContent = "Erreur lors de la récupération des informations de l'utilisateur.";
            });
        })
        .catch((error) => {
          console.error("Erreur de connexion :", error.message);
          document.getElementById('login-error-message').textContent = "Erreur de connexion : " + error.message;
        });
    });
  }

  // Gestion du formulaire d'inscription, si présent
  if (signupForm) {
    console.log("Formulaire d'inscription trouvé.");
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('emails').value;
      const password = document.getElementById('passwords').value;
      const role = document.getElementById('role').value;
      const societeId = document.getElementById('societeId').value;

      // Vérification du mot de passe spécifique pour le rôle "responsable"
      if (role === "responsable" && password !== "hajmjid") {
        alert("Mot de passe incorrect pour le rôle de responsable.");
        return;
      }

      // Création d'un nouvel utilisateur avec email et mot de passe
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;

          // Ajout des informations de l'utilisateur avec le rôle et le societeId dans Firestore
          return firebase.firestore().collection('Users').doc(user.uid).set({
            email: user.email,
            role: role,
            societeId: societeId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(() => {
          console.log("Utilisateur ajouté dans Firestore avec succès.");
          document.getElementById('signup-error-message').textContent = "Inscription réussie.";

          // Redirection en fonction du rôle après l'inscription
          if (role === "responsable") {
            window.location.href = "responsable_dashboard.html";
          } else if (role === "commercial") {
            window.location.href = "commercial_dashboard.html";
          }
        })
        .catch((error) => {
          if (error.code === 'auth/email-already-in-use') {
            document.getElementById('signup-error-message').textContent = "Erreur : Cet e-mail est déjà utilisé.";
          } else {
            console.error("Erreur d'inscription :", error.message);
            document.getElementById('signup-error-message').textContent = "Erreur d'inscription : " + error.message;
          }
        });
    });
  }
});

// Fonction pour revenir à la page d'accueil (connexion) avec le bouton Exit
function exitToHome() {
  window.location.href = "login.html";
}

// Fonction pour réinitialiser le mot de passe
function resetPassword() {
  const email = document.getElementById('email').value;

  if (!email) {
    document.getElementById('reset-password-message').textContent = "Veuillez saisir votre adresse e-mail.";
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      document.getElementById('reset-password-message').textContent = "Un email de réinitialisation a été envoyé.";
    })
    .catch((error) => {
      console.error("Erreur lors de la réinitialisation du mot de passe :", error);
      document.getElementById('reset-password-message').textContent = "Erreur : " + error.message;
    });
}
