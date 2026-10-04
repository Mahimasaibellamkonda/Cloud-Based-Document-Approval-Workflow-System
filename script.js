const firebaseConfig = {
  apiKey: "AIzaSyCjGMp95tDHHWNlt6NVdXTGXU08-BHCc8U",
  authDomain: "document-approval-system-da3e5.firebaseapp.com",
  databaseURL: "https://document-approval-system-da3e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "document-approval-system-da3e5",
  storageBucket: "document-approval-system-da3e5.firebasestorage.app",
  messagingSenderId: "188870373464",
  appId: "1:188870373464:web:06b69503a41f401330da2d"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const documentsRef = database.ref("documents");

let documents = [];
let editingId = null;


/* LOAD DATA */

documentsRef.on("value", function(snapshot) {

  documents = [];

  snapshot.forEach(function(childSnapshot) {

    documents.push({
      id: childSnapshot.key,
      ...childSnapshot.val()
    });

  });

  documents.sort(function(a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  updateStatistics();
  filterDocuments();

});


/* DISPLAY DOCUMENTS */

function displayDocuments(list) {

  const grid = document.getElementById("documentGrid");

  document.getElementById("resultCount").textContent =
    list.length + (list.length === 1 ? " document" : " documents");

  if (list.length === 0) {

    grid.innerHTML = `
      <div class="empty-state">
        <h3>No documents found</h3>
        <p>Create a new document or change your search filters.</p>
      </div>
    `;

    return;
  }

  grid.innerHTML = list.map(function(doc) {

    let statusClass = "pending";

    if (doc.status === "Under Review") {
      statusClass = "review";
    }

    if (doc.status === "Approved") {
      statusClass = "approved";
    }

    if (doc.status === "Rejected") {
      statusClass = "rejected";
    }

    return `
      <div class="document-card">

        <div class="card-top">

          <div class="document-icon">
            ${getDocumentInitial(doc.documentType)}
          </div>

          <span class="badge ${statusClass}">
            ${escapeHTML(doc.status)}
          </span>

        </div>

        <h3>${escapeHTML(doc.title)}</h3>

        <p class="description">
          ${escapeHTML(doc.description)}
        </p>

        <div class="meta">

          <div class="meta-row">
            <span>Department</span>
            <span>${escapeHTML(doc.department)}</span>
          </div>

          <div class="meta-row">
            <span>Type</span>
            <span>${escapeHTML(doc.documentType)}</span>
          </div>

          <div class="meta-row">
            <span>Priority</span>
            <span>${escapeHTML(doc.priority)}</span>
          </div>

          <div class="meta-row">
            <span>Submitted By</span>
            <span>${escapeHTML(doc.submittedBy)}</span>
          </div>

        </div>

        <div class="card-actions">

          ${
            doc.status !== "Approved"
            ? `
              <button
                class="action-btn approve-btn"
                onclick="updateStatus('${doc.id}', 'Approved')">
                Approve
              </button>
            `
            : ""
          }

          ${
            doc.status !== "Rejected"
            ? `
              <button
                class="action-btn reject-btn"
                onclick="updateStatus('${doc.id}', 'Rejected')">
                Reject
              </button>
            `
            : ""
          }

          ${
            doc.status === "Pending"
            ? `
              <button
                class="action-btn"
                onclick="updateStatus('${doc.id}', 'Under Review')">
                Review
              </button>
            `
            : ""
          }

          <button
            class="action-btn"
            onclick="editDocument('${doc.id}')">
            Edit
          </button>

          <button
            class="action-btn delete-btn"
            onclick="deleteDocument('${doc.id}')">
            Delete
          </button>

        </div>

      </div>
    `;

  }).join("");

}


/* FILTER */

function filterDocuments() {

  const search =
    document.getElementById("searchInput").value
      .toLowerCase()
      .trim();

  const status =
    document.getElementById("statusFilter").value;

  const priority =
    document.getElementById("priorityFilter").value;

  const filtered = documents.filter(function(doc) {

    const searchableText =
      (
        doc.title +
        " " +
        doc.department +
        " " +
        doc.submittedBy +
        " " +
        doc.description
      ).toLowerCase();

    const matchesSearch =
      searchableText.includes(search);

    const matchesStatus =
      status === "all" || doc.status === status;

    const matchesPriority =
      priority === "all" || doc.priority === priority;

    return matchesSearch &&
           matchesStatus &&
           matchesPriority;

  });

  displayDocuments(filtered);

}


/* STATISTICS */

function updateStatistics() {

  document.getElementById("totalCount").textContent =
    documents.length;

  document.getElementById("pendingCount").textContent =
    documents.filter(d => d.status === "Pending").length;

  document.getElementById("reviewCount").textContent =
    documents.filter(d => d.status === "Under Review").length;

  document.getElementById("approvedCount").textContent =
    documents.filter(d => d.status === "Approved").length;

}


/* ADD MODAL */

function openAddModal() {

  editingId = null;

  document.getElementById("modalTitle").textContent =
    "Create Document";

  document.getElementById("documentForm").reset();

  document.getElementById("documentModal")
    .classList.add("active");

}


/* CLOSE MODAL */

function closeModal() {

  document.getElementById("documentModal")
    .classList.remove("active");

  editingId = null;

  document.getElementById("documentForm").reset();

}


/* SAVE */

document.getElementById("documentForm")
  .addEventListener("submit", function(event) {

    event.preventDefault();

    const documentData = {

      title:
        document.getElementById("title").value.trim(),

      department:
        document.getElementById("department").value,

      priority:
        document.getElementById("priority").value,

      submittedBy:
        document.getElementById("submittedBy").value.trim(),

      documentType:
        document.getElementById("documentType").value,

      description:
        document.getElementById("description").value.trim(),

      status: "Pending",

      createdAt: Date.now()

    };


    if (editingId) {

      const oldDocument =
        documents.find(d => d.id === editingId);

      documentData.status =
        oldDocument ? oldDocument.status : "Pending";

      documentData.createdAt =
        oldDocument ? oldDocument.createdAt : Date.now();

      documentsRef
        .child(editingId)
        .update(documentData)
        .then(function() {

          showToast("Document updated successfully");
          closeModal();

        })
        .catch(function(error) {

          console.error(error);
          showToast("Error updating document");

        });

    } else {

      documentsRef
        .push(documentData)
        .then(function() {

          showToast("Document created successfully");
          closeModal();

        })
        .catch(function(error) {

          console.error(error);
          showToast("Error creating document");

        });

    }

  });


/* EDIT */

function editDocument(id) {

  const doc =
    documents.find(d => d.id === id);

  if (!doc) return;

  editingId = id;

  document.getElementById("modalTitle").textContent =
    "Edit Document";

  document.getElementById("title").value =
    doc.title || "";

  document.getElementById("department").value =
    doc.department || "";

  document.getElementById("priority").value =
    doc.priority || "";

  document.getElementById("submittedBy").value =
    doc.submittedBy || "";

  document.getElementById("documentType").value =
    doc.documentType || "";

  document.getElementById("description").value =
    doc.description || "";

  document.getElementById("documentModal")
    .classList.add("active");

}


/* STATUS */

function updateStatus(id, newStatus) {

  documentsRef
    .child(id)
    .update({
      status: newStatus
    })
    .then(function() {

      showToast(
        "Document status changed to " + newStatus
      );

    })
    .catch(function(error) {

      console.error(error);
      showToast("Unable to update status");

    });

}


/* DELETE */

function deleteDocument(id) {

  if (!confirm("Are you sure you want to delete this document?")) {
    return;
  }

  documentsRef
    .child(id)
    .remove()
    .then(function() {

      showToast("Document deleted successfully");

    })
    .catch(function(error) {

      console.error(error);
      showToast("Unable to delete document");

    });

}


/* DOCUMENT ICON */

function getDocumentInitial(type) {

  if (!type) return "D";

  return type.charAt(0).toUpperCase();

}


/* TOAST */

function showToast(message) {

  const toast =
    document.getElementById("toast");

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(function() {
    toast.classList.remove("show");
  }, 2500);

}


/* HTML ESCAPE */

function escapeHTML(value) {

  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* CLOSE MODAL OUTSIDE */

document.getElementById("documentModal")
  .addEventListener("click", function(event) {

    if (event.target === this) {
      closeModal();
    }

  });
