let salesData = {};  // Stocke les ventes pour chaque commercial
let chartInstance = null;  // Instance du diagramme en disque

// Authentification de l'utilisateur et récupération de ses informations
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    firebase.firestore().collection("Users").doc(user.uid).get()
      .then((doc) => {
        if (doc.exists && doc.data().role === "responsable") {
          const societeId = doc.data().societeId;
          if (!societeId) {
            console.error("Erreur : societeId est indéfini pour cet utilisateur.");
            alert("Erreur : cet utilisateur n'a pas de société assignée.");
            return;
          }
          console.log("Utilisateur responsable authentifié pour la société :", societeId);
          afficherNomSociete(societeId);  // Affiche le nom de la société
          remplirSelecteurCommerciaux(societeId);  // Remplit le sélecteur de commerciaux
          afficherListeCommerciaux(societeId); // Affiche la liste des commerciaux pour suppression
        } else {
          console.warn("Accès refusé : cet utilisateur n'est pas un responsable.");
          alert("Accès refusé. Cette page est réservée aux responsables.");
          window.location.href = "commercial_dashboard.html";
        }
      })
      .catch((error) => console.error("Erreur lors de la vérification du rôle :", error));
  } else {
    console.log("Utilisateur non authentifié. Redirection vers la page de connexion.");
    window.location.href = "login.html";
  }
});

// Fonction pour afficher le nom de la société
function afficherNomSociete(societeId) {
  firebase.firestore().collection("Societes").doc(societeId).get()
    .then((doc) => {
      if (doc.exists) {
        const nomSociete = doc.data().nom;
        document.getElementById("societeId").textContent = `Société : ${societeId}`;
      } else {
        console.warn("Aucune société trouvée avec cet ID.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération de la société :", error));
}

// Remplir le sélecteur de commerciaux pour la société spécifique
function remplirSelecteurCommerciaux(societeId) {
  const commercialSelector = document.getElementById("commercialSelector");

  firebase.firestore().collection("Users")
    .where("role", "==", "commercial")
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((userDoc) => {
        const option = document.createElement("option");
        option.value = userDoc.id;
        option.textContent = userDoc.data().email;
        commercialSelector.appendChild(option);
      });
    })
    .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
}

// Fonction pour afficher la liste des commerciaux avec option de suppression
function afficherListeCommerciaux(societeId) {
  const commercialsContainer = document.getElementById("commercialsContainer");
  commercialsContainer.innerHTML = ""; // Réinitialiser la liste

  firebase.firestore().collection("Users")
    .where("role", "==", "commercial")
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((userDoc) => {
        const commercial = userDoc.data();
        const commercialId = userDoc.id;

        // Créez l'élément de liste avec le bouton de suppression
        const li = document.createElement("li");
        li.textContent = commercial.email;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Supprimer";
        deleteButton.onclick = () => supprimerCommercial(commercialId);

        li.appendChild(deleteButton);
        commercialsContainer.appendChild(li);
      });
    })
    .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
}

/// Fonction pour supprimer un commercial et mettre à jour la liste et le sélecteur
function supprimerCommercial(commercialId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce commercial ?")) {
    firebase.firestore().collection("Users").doc(commercialId).delete()
      .then(() => {
        console.log("Commercial supprimé avec succès.");
        alert("Commercial supprimé avec succès.");

        // Récupérer l'ID de la société du responsable actuel pour rafraîchir la liste et le sélecteur des commerciaux
        const userId = firebase.auth().currentUser.uid;
        firebase.firestore().collection("Users").doc(userId).get()
          .then((doc) => {
            const societeId = doc.data().societeId;
            
            // Mettre à jour la liste des commerciaux
            afficherListeCommerciaux(societeId);

            // Mettre à jour le sélecteur des commerciaux
            const commercialSelector = document.getElementById("commercialSelector");
            commercialSelector.innerHTML = '<option value="">-- Tous les commerciaux --</option>'; // Réinitialise le sélecteur
            remplirSelecteurCommerciaux(societeId); // Recharge le sélecteur des commerciaux
          })
          .catch((error) => console.error("Erreur lors de la récupération du societeId :", error));
      })
      .catch((error) => console.error("Erreur lors de la suppression du commercial :", error));
  }
}



// Fonction pour afficher le rapport en fonction des sélecteurs de commercial et de la plage de dates
function afficherRapport() {
  const commercialId = document.getElementById("commercialSelector").value;
  const startDate = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : null;
  const endDate = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : null;

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  const tableRecapCommerciauxBody = document.getElementById("tableRecapCommerciaux").getElementsByTagName("tbody")[0];
  const tableDetailsClientsBody = document.getElementById("tableDetailsClients").getElementsByTagName("tbody")[0];
  const grandTotalElement = document.getElementById("grandTotal");

  firebase.firestore().collection("Users").doc(firebase.auth().currentUser.uid).get()
    .then((doc) => {
      const societeId = doc.data().societeId;
      if (!societeId) {
        console.error("Erreur : societeId est indéfini pour cet utilisateur.");
        alert("Erreur : cet utilisateur n'a pas de société assignée.");
        return;
      }

      tableRecapCommerciauxBody.innerHTML = "";
      tableDetailsClientsBody.innerHTML = "";
      let grandTotal = 0;
      salesData = {};

      const usersQuery = commercialId 
        ? firebase.firestore().collection("Users").where("role", "==", "commercial").where(firebase.firestore.FieldPath.documentId(), "==", commercialId).where("societeId", "==", societeId)
        : firebase.firestore().collection("Users").where("role", "==", "commercial").where("societeId", "==", societeId);

      usersQuery.get()
        .then((querySnapshot) => {
          querySnapshot.forEach((userDoc) => {
            const commercialName = userDoc.data().email;
            const commercialId = userDoc.id;
            let totalVentes = 0;

            firebase.firestore().collection("Clients").where("userId", "==", commercialId).where("societeId", "==", societeId).get()
              .then((clientSnapshot) => {
                clientSnapshot.forEach((clientDoc) => {
                  const clientData = clientDoc.data();
                  const dateOperation = clientData.createdAt.toDate();

                  if ((!startDate || dateOperation >= startDate) && (!endDate || dateOperation <= endDate)) {
                    totalVentes += clientData.amount;

                    const trClient = document.createElement("tr");
                    trClient.innerHTML = `
                      <td>${commercialName}</td>
                      <td>${clientData.name}</td>
                      <td>${clientData.orderNumber || 'N/A'}</td>
                      <td>${clientData.amount} MAD</td>
                      <td>${dateOperation.toLocaleDateString()}</td>
                    `;
                    tableDetailsClientsBody.appendChild(trClient);
                  }
                });

                grandTotal += totalVentes;
                salesData[commercialName] = totalVentes;

                const trCommercial = document.createElement("tr");
                trCommercial.innerHTML = `
                    <td>${commercialName}</td>
                    <td>${totalVentes} MAD</td>
                    <td><input type="number" min="0" max="100" placeholder="%" class="percentage-input"></td>
                    <td class="montant-calcule">0 MAD</td>
                    <td><button class="valider-btn">Valider</button></td>
                `;
                tableRecapCommerciauxBody.appendChild(trCommercial);
                
                // Ajouter un gestionnaire d'événement pour le bouton "Valider"
                trCommercial.querySelector(".valider-btn").addEventListener("click", () => {
                    const percentageInput = trCommercial.querySelector(".percentage-input");
                    const montantCell = trCommercial.querySelector(".montant-calcule");
                
                    // Récupérer la valeur du pourcentage
                    const pourcentage = parseFloat(percentageInput.value);
                    if (isNaN(pourcentage) || pourcentage < 0 || pourcentage > 100) {
                        alert("Veuillez entrer un pourcentage valide entre 0 et 100.");
                        return;
                    }
                
                    // Calculer le montant en fonction du pourcentage et du total des ventes
                    const montantCalculé = (totalVentes * pourcentage) / 100;
                
                    // Mettre à jour le montant calculé dans la cellule correspondante
                    montantCell.textContent = `${montantCalculé.toFixed(2)} MAD`;
                
                    // Optionnel : sauvegarder le pourcentage et le montant calculé dans Firebase
                    firebase.firestore().collection("SalesData").doc(commercialId).set({
                        pourcentage: pourcentage,
                        montantCalculé: montantCalculé
                    }).then(() => {
                        console.log("Montant calculé sauvegardé avec succès pour le commercial.");
                    }).catch(error => {
                        console.error("Erreur lors de la sauvegarde du montant calculé :", error);
                    });
                });
                










                grandTotalElement.textContent = `${grandTotal} MAD`;
              })
              .catch((error) => console.error("Erreur lors de la récupération des clients :", error));
          });
        })
        .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
    })
    .catch((error) => console.error("Erreur lors de la récupération de l'ID de société :", error));
}






let isChartVisible = false;

function toggleDiagramme() {
  const labels = Object.keys(salesData);
  const data = Object.values(salesData);
  const grandTotal = parseFloat(document.getElementById("grandTotal").textContent.replace(" MAD", ""));

  // Vérifier si le diagramme est visible
  if (isChartVisible && chartInstance) {
    // Si le diagramme est visible, le détruire et masquer le graphique
    chartInstance.destroy();
    chartInstance = null;
    isChartVisible = false;
    document.getElementById("salesChart").style.display = "none"; // Masquer le canvas
  } else {
    // Si le diagramme n'est pas visible, le créer
    const ctx = document.getElementById("salesChart").getContext("2d");
    document.getElementById("salesChart").style.display = "block"; // Afficher le canvas

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: labels.map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`), // Couleurs aléatoires
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem) => {
                const montant = data[tooltipItem.dataIndex];
                const pourcentage = ((montant / grandTotal) * 100).toFixed(2);
                return `${tooltipItem.label}: ${montant} MAD (${pourcentage}%)`;
              }
            }
          }
        }
      }
    });
    isChartVisible = true;
  }
}