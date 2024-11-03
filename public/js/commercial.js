// Fonction pour afficher la première partie de l'email du commercial et le nom de la société
function afficherEmailEtSocieteCommercial() {
  const userId = firebase.auth().currentUser.uid;
  firebase.firestore().collection("Users").doc(userId).get()
    .then((doc) => {
      if (doc.exists) {
        const email = doc.data().email;
        const societeId = doc.data().societeId;
        console.log("societeId récupéré : ", societeId);
        const emailPart = email.split('@')[0];
        document.getElementById("commercialName").textContent = `Tableau de Bord de ${emailPart}`;

        // Récupérer et afficher le nom de la société
        firebase.firestore().collection("Societes").doc(societeId).get()
          .then((societeDoc) => {
            if (societeDoc.exists) {
              const nomSociete = societeDoc.data().nom;
              document.getElementById("societeId").textContent = `Société : ${nomSociete}`;
            } else {
              console.warn("Aucune société trouvée avec cet ID :", societeId);
            }
          })
          .catch((error) => console.error("Erreur lors de la récupération de la société :", error));
        
        afficherOperationsClients(societeId);
      } else {
        console.warn("Aucun utilisateur trouvé avec cet ID dans Firestore.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération de l'email du commercial :", error));
}

// Fonction pour envoyer une notification au responsable après une opération commerciale
function envoyerNotificationResponsable(montant) {
  firebase.firestore().collection("Users").where("role", "==", "responsable").get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const fcmToken = doc.data().fcmToken;
        if (fcmToken) {
          fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "key=BP6r1XmEJLm5A6V2v47EynRkwKj8WN8173rEkAuUGXBNusUAn8-DSxpyplxElHCSArS2lASZRqw9krrZ73b0EW4"  // Remplacez par votre clé de serveur Firebase
            },
            body: JSON.stringify({
              to: fcmToken,
              notification: {
                title: "Nouvelle Opération Commerciale",
                body: `Une opération de ${montant} MAD a été enregistrée.`,
                click_action: "FLUTTER_NOTIFICATION_CLICK"
              }
            })
          }).then(response => response.json())
            .then(data => console.log("Notification envoyée :", data))
            .catch(error => console.error("Erreur lors de l'envoi de la notification :", error));
        } else {
          console.warn("Aucun token FCM trouvé pour le responsable");
        }
      });
    });
}

// Fonction pour ajouter ou modifier un client
function ajouterOuModifierClient(event) {
  event.preventDefault();
  const clientId = document.getElementById("clientId").value;
  const clientName = document.getElementById("clientName").value;
  const clientAmount = parseFloat(document.getElementById("clientAmount").value);
  const orderNumber = document.getElementById("orderNumber").value;
  const userId = firebase.auth().currentUser.uid;

  firebase.firestore().collection("Users").doc(userId).get()
    .then((userDoc) => {
      const societeId = userDoc.data().societeId;

      if (clientId) {
        // Mise à jour du client existant
        firebase.firestore().collection("Clients").doc(clientId).update({
          name: clientName,
          amount: clientAmount,
          orderNumber: orderNumber,
          societeId: societeId
        }).then(() => {
          console.log("Client modifié avec succès");
          document.getElementById("addClientForm").reset();
          document.getElementById("clientId").value = "";
          document.getElementById("formTitle").textContent = "Ajouter un Client";
          document.getElementById("submitButton").textContent = "Ajouter Client";
          afficherOperationsClients(societeId);
          envoyerNotificationResponsable(clientAmount); // Envoyer une notification
        }).catch((error) => {
          console.error("Erreur lors de la modification du client :", error);
        });
      } else {
        // Ajout d'un nouveau client
        firebase.firestore().collection("Clients").add({
          name: clientName,
          amount: clientAmount,
          orderNumber: orderNumber,
          userId: userId,
          societeId: societeId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log("Client ajouté avec succès");
          document.getElementById("addClientForm").reset();
          afficherOperationsClients(societeId);
          envoyerNotificationResponsable(clientAmount); // Envoyer une notification
        }).catch((error) => {
          console.error("Erreur lors de l'ajout du client :", error);
        });
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération du societeId :", error));
}

// Fonction pour afficher les opérations des clients avec des boutons "Modifier" et "Supprimer"
function afficherOperationsClients(societeId) {
  const userId = firebase.auth().currentUser.uid;
  const tableOperationsClientsBody = document.getElementById("tableOperationsClients").getElementsByTagName("tbody")[0];
  tableOperationsClientsBody.innerHTML = "";

  let totalAmount = 0;
  const startDate = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : null;
  const endDate = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : null;

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  firebase.firestore().collection("Clients")
    .where("userId", "==", userId)
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((clientDoc) => {
        const clientData = clientDoc.data();
        const dateOperation = clientData.createdAt ? clientData.createdAt.toDate() : null;

        if ((!startDate || (dateOperation && dateOperation >= startDate)) &&
            (!endDate || (dateOperation && dateOperation <= endDate))) {
          totalAmount += clientData.amount;

          const trClient = document.createElement("tr");
          trClient.innerHTML = `
            <td>${clientData.name}</td>
            <td class="total-ventes">${clientData.amount} MAD</td>
            <td>${clientData.orderNumber}</td>
            <td>${dateOperation ? dateOperation.toLocaleDateString() : "N/A"}</td>
            <td><button onclick="preparerModificationClient('${clientDoc.id}')">Modifier</button></td>
            <td><button onclick="supprimerClient('${clientDoc.id}')">Supprimer</button></td>
          `;
          tableOperationsClientsBody.appendChild(trClient);
        }
      });

      document.getElementById("totalAmount").textContent = `${totalAmount} MAD`;
    })
    .catch((error) => console.error("Erreur lors de la récupération des opérations des clients :", error));
}

// Fonction pour filtrer le tableau en fonction de la recherche
function filterTable() {
  const searchTerm = document.getElementById("searchBar").value.toLowerCase();
  const rows = document.getElementById("tableOperationsClients").getElementsByTagName("tbody")[0].getElementsByTagName("tr");

  Array.from(rows).forEach(row => {
    const rowText = row.textContent.toLowerCase();
    row.style.display = rowText.includes(searchTerm) ? "" : "none";
  });
}

// Préparer les valeurs de modification dans le formulaire
function preparerModificationClient(clientId) {
  firebase.firestore().collection("Clients").doc(clientId).get()
    .then((doc) => {
      if (doc.exists) {
        const clientData = doc.data();
        document.getElementById("clientId").value = clientId;
        document.getElementById("clientName").value = clientData.name;
        document.getElementById("clientAmount").value = clientData.amount;
        document.getElementById("orderNumber").value = clientData.orderNumber;
        document.getElementById("formTitle").textContent = "Modifier le Client";
        document.getElementById("submitButton").textContent = "Enregistrer les Modifications";
      } else {
        console.warn("Aucun client trouvé avec cet ID pour modification.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération des données du client :", error));
}

// Fonction pour supprimer un client
function supprimerClient(clientId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette opération ?")) {
    firebase.firestore().collection("Clients").doc(clientId).delete()
      .then(() => {
        console.log("Client supprimé avec succès");
        afficherEmailEtSocieteCommercial(); // Mettre à jour la liste après suppression
      })
      .catch((error) => console.error("Erreur lors de la suppression du client :", error));
  }
}

// Charger les opérations des clients et afficher l'email du commercial et le nom de la société lors du chargement de la page
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    afficherEmailEtSocieteCommercial();
    document.getElementById("startDate").addEventListener("change", () => {
      afficherEmailEtSocieteCommercial();
    });
    document.getElementById("endDate").addEventListener("change", () => {
      afficherEmailEtSocieteCommercial();
    });
  } else {
    console.log("Utilisateur non authentifié. Redirection vers la page de connexion.");
    window.location.href = "login.html";
  }
});
