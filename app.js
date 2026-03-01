/* ═══════════════════════════════════════════
   CARNETS DE VOYAGE — Application Logic
   ═══════════════════════════════════════════ */

// ─── STORAGE ───────────────────────────────────────────────────────
const DB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

const getVoyages = () => DB.get('voyages') || [];
const saveVoyages = (v) => DB.set('voyages', v);
const getVoyageData = (id) => DB.get(`voyage_${id}`) || { lieux: [], journal: [], contacts: [], docs: [] };
const saveVoyageData = (id, data) => DB.set(`voyage_${id}`, data);

// ─── STATE ──────────────────────────────────────────────────────────
let currentVoyage = null;
let map = null;
let selectedType = 'hebergement';
let pendingLatLng = null;
let editingEntryId = null;
let selectedEmoji = '✈️';
let selectedMood = '😊';

const typeLabels = {
  hebergement: { label: 'Hébergement', icon: '🏠', color: '#c9a84c' },
  transport:   { label: 'Transport',   icon: '🚇', color: '#7a8c6e' },
  visite:      { label: 'À visiter',   icon: '🏛',  color: '#6b4f3a' },
  restaurant:  { label: 'Restaurant',  icon: '🍽',  color: '#a0522d' },
  photo:       { label: 'Souvenir',    icon: '📸',  color: '#8b6914' },
};

// ─── HOME SCREEN ───────────────────────────────────────────────────
function renderHome() {
  const voyages = getVoyages();
  const list = document.getElementById('voyages-list');
  if (voyages.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucun voyage pour l\'instant.<br>Commencez par en créer un !</div>';
    return;
  }
  list.innerHTML = voyages.map(v => `
    <div class="voyage-card" data-id="${v.id}">
      <div class="voyage-card-emoji">${v.emoji}</div>
      <div class="voyage-card-info">
        <h3>${v.destination}</h3>
        <small>${formatDateRange(v.depart, v.retour)}</small>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.voyage-card').forEach(card => {
    card.addEventListener('click', () => openVoyage(card.dataset.id));
  });
}

function formatDateRange(d1, d2) {
  if (!d1 && !d2) return 'Dates non définies';
  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (d1 && d2) return `${fmt(d1)} → ${fmt(d2)}`;
  if (d1) return `Dès le ${fmt(d1)}`;
  return `Jusqu\'au ${fmt(d2)}`;
}

// ─── NOUVEAU VOYAGE ─────────────────────────────────────────────────
document.getElementById('btn-nouveau-voyage').onclick = () => {
  document.getElementById('modal-nouveau').classList.remove('hidden');
};
document.getElementById('close-nouveau').onclick = () => {
  document.getElementById('modal-nouveau').classList.add('hidden');
};

// Emoji picker
document.getElementById('emoji-picker').addEventListener('click', (e) => {
  if (e.target.classList.contains('emoji-opt')) {
    document.querySelectorAll('#emoji-picker .emoji-opt').forEach(el => el.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedEmoji = e.target.dataset.e;
  }
});

document.getElementById('btn-creer-voyage').onclick = () => {
  const dest = document.getElementById('input-destination').value.trim();
  if (!dest) { document.getElementById('input-destination').focus(); return; }
  const voyage = {
    id: Date.now().toString(),
    destination: dest,
    depart: document.getElementById('input-depart').value,
    retour: document.getElementById('input-retour').value,
    emoji: selectedEmoji,
  };
  const voyages = getVoyages();
  voyages.unshift(voyage);
  saveVoyages(voyages);
  document.getElementById('modal-nouveau').classList.add('hidden');
  document.getElementById('input-destination').value = '';
  document.getElementById('input-depart').value = '';
  document.getElementById('input-retour').value = '';
  renderHome();
  openVoyage(voyage.id);
};

// ─── OPEN VOYAGE ────────────────────────────────────────────────────
function openVoyage(id) {
  const voyages = getVoyages();
  currentVoyage = voyages.find(v => v.id === id);
  if (!currentVoyage) return;

  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-home').classList.add('hidden');
  document.getElementById('screen-voyage').classList.remove('hidden');
  document.getElementById('screen-voyage').classList.add('active');

  document.getElementById('header-emoji').textContent = currentVoyage.emoji;
  document.getElementById('header-titre').textContent = currentVoyage.destination;
  document.getElementById('header-dates').textContent = formatDateRange(currentVoyage.depart, currentVoyage.retour);

  // Activate first tab
  switchTab('carte');

  // Init map after slight delay (ensure DOM visible)
  setTimeout(initMap, 100);
  renderJournal();
  renderContacts();
  renderDocs();
}

document.getElementById('btn-retour-home').onclick = () => {
  document.getElementById('screen-voyage').classList.remove('active');
  document.getElementById('screen-voyage').classList.add('hidden');
  document.getElementById('screen-home').classList.add('active');
  document.getElementById('screen-home').classList.remove('hidden');
  currentVoyage = null;
  if (map) { map.remove(); map = null; }
  renderHome();
};

document.getElementById('btn-delete-voyage').onclick = () => {
  if (!confirm(`Supprimer le voyage "${currentVoyage.destination}" ? Cette action est irréversible.`)) return;
  let voyages = getVoyages();
  voyages = voyages.filter(v => v.id !== currentVoyage.id);
  saveVoyages(voyages);
  DB.del(`voyage_${currentVoyage.id}`);
  document.getElementById('btn-retour-home').click();
};

// ─── TABS ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${name}`);
    c.classList.toggle('hidden', c.id !== `tab-${name}`);
  });
  if (name === 'carte' && map) setTimeout(() => map.invalidateSize(), 50);
}

// ─── MAP ─────────────────────────────────────────────────────────────
function initMap() {
  if (map) { map.remove(); map = null; }

  map = L.map('map', { zoomControl: true }).setView([48.86, 2.35], 5);

  // OSM Stamen Toner-lite style via OSM
  L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  // Load saved lieux
  const data = getVoyageData(currentVoyage.id);
  data.lieux.forEach(lieu => addMarker(lieu));

  // Click on map
  map.on('click', (e) => {
    pendingLatLng = e.latlng;
    openLieuModal(null);
  });

  // Toolbar type selection
  document.querySelectorAll('.map-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      document.querySelector('.map-legend small').textContent =
        `Type "${typeLabels[selectedType].label}" sélectionné — cliquez sur la carte pour placer un lieu`;
    });
  });

  // Try to geocode destination
  geocodeDestination(currentVoyage.destination);
}

async function geocodeDestination(destination) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
    const data = await r.json();
    if (data.length > 0) {
      map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
    }
  } catch (e) { /* offline */ }
}

function createIcon(type) {
  const t = typeLabels[type] || typeLabels.visite;
  return L.divIcon({
    html: `<div style="
      background:${t.color};
      color:white;
      width:32px;height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      font-size:14px;
    "><span style="transform:rotate(45deg)">${t.icon}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    className: '',
  });
}

function addMarker(lieu) {
  const marker = L.marker([lieu.lat, lieu.lng], { icon: createIcon(lieu.type) }).addTo(map);
  const t = typeLabels[lieu.type] || typeLabels.visite;
  let popupHtml = `
    <div class="popup-type">${t.icon} ${t.label}</div>
    <div class="popup-title">${lieu.nom || '—'}</div>
    ${lieu.notes ? `<div class="popup-note">${lieu.notes}</div>` : ''}
    ${lieu.photo ? `<img class="popup-photo" src="${lieu.photo}" alt="photo"/>` : ''}
    <div class="popup-delete" data-id="${lieu.id}">✕ Supprimer</div>
  `;
  marker.bindPopup(popupHtml);
  marker.on('popupopen', () => {
    setTimeout(() => {
      const btn = document.querySelector(`.popup-delete[data-id="${lieu.id}"]`);
      if (btn) btn.onclick = () => deleteLieu(lieu.id);
    }, 50);
  });
  lieu._marker = marker;
}

function deleteLieu(id) {
  if (!confirm('Supprimer ce lieu ?')) return;
  const data = getVoyageData(currentVoyage.id);
  const lieu = data.lieux.find(l => l.id === id);
  if (lieu && lieu._marker) map.removeLayer(lieu._marker);
  data.lieux = data.lieux.filter(l => l.id !== id);
  saveVoyageData(currentVoyage.id, data);
  map.closePopup();
}

// ─── LIEU MODAL ──────────────────────────────────────────────────────
let lieuPhotoData = null;

function openLieuModal(lieuId) {
  lieuPhotoData = null;
  document.getElementById('lieu-nom').value = '';
  document.getElementById('lieu-notes').value = '';
  document.getElementById('lieu-photo-preview').style.display = 'none';
  document.getElementById('lieu-photo-preview').src = '';
  document.getElementById('lieu-modal-title').textContent = `Nouveau ${typeLabels[selectedType].label}`;
  document.getElementById('modal-lieu').classList.remove('hidden');
}

document.getElementById('close-lieu').onclick = () => {
  document.getElementById('modal-lieu').classList.add('hidden');
  pendingLatLng = null;
};

document.getElementById('lieu-photo-input').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    lieuPhotoData = ev.target.result;
    const img = document.getElementById('lieu-photo-preview');
    img.src = lieuPhotoData;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
};

document.getElementById('btn-save-lieu').onclick = () => {
  if (!pendingLatLng) return;
  const nom = document.getElementById('lieu-nom').value.trim();
  const lieu = {
    id: Date.now().toString(),
    type: selectedType,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    nom,
    notes: document.getElementById('lieu-notes').value.trim(),
    photo: lieuPhotoData || null,
  };
  const data = getVoyageData(currentVoyage.id);
  data.lieux.push(lieu);
  saveVoyageData(currentVoyage.id, data);
  addMarker(lieu);
  document.getElementById('modal-lieu').classList.add('hidden');
  pendingLatLng = null;
};

// ─── JOURNAL ─────────────────────────────────────────────────────────
function renderJournal() {
  const data = getVoyageData(currentVoyage.id);
  const container = document.getElementById('journal-entries');
  if (data.journal.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucune entrée pour l\'instant.<br>Commencez à écrire votre récit de voyage !</div>';
    return;
  }
  const sorted = [...data.journal].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  container.innerHTML = sorted.map(e => `
    <div class="journal-entry" data-id="${e.id}">
      <div class="journal-entry-header">
        <div>
          <div class="journal-entry-date">${e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''}</div>
          <div class="journal-entry-title">${e.titre || 'Sans titre'}</div>
        </div>
        <div class="journal-entry-mood">${e.mood || '😊'}</div>
      </div>
      <div class="journal-entry-text">${e.texte || ''}</div>
      <div class="entry-actions">
        <button class="entry-btn edit-entry" data-id="${e.id}">✎ Modifier</button>
        <button class="entry-btn delete delete-entry" data-id="${e.id}">✕ Supprimer</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit-entry').forEach(b => {
    b.onclick = () => editEntry(b.dataset.id);
  });
  container.querySelectorAll('.delete-entry').forEach(b => {
    b.onclick = () => deleteEntry(b.dataset.id);
  });
}

document.getElementById('btn-add-entry').onclick = () => {
  editingEntryId = null;
  document.getElementById('entry-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('entry-titre').value = '';
  document.getElementById('entry-texte').value = '';
  selectedMood = '😊';
  document.querySelectorAll('#mood-picker .emoji-opt').forEach(e => e.classList.toggle('selected', e.dataset.e === selectedMood));
  document.getElementById('entry-modal-title').textContent = 'Nouvelle entrée';
  document.getElementById('modal-entry').classList.remove('hidden');
};

function editEntry(id) {
  const data = getVoyageData(currentVoyage.id);
  const entry = data.journal.find(e => e.id === id);
  if (!entry) return;
  editingEntryId = id;
  document.getElementById('entry-date').value = entry.date || '';
  document.getElementById('entry-titre').value = entry.titre || '';
  document.getElementById('entry-texte').value = entry.texte || '';
  selectedMood = entry.mood || '😊';
  document.querySelectorAll('#mood-picker .emoji-opt').forEach(e => e.classList.toggle('selected', e.dataset.e === selectedMood));
  document.getElementById('entry-modal-title').textContent = 'Modifier l\'entrée';
  document.getElementById('modal-entry').classList.remove('hidden');
}

function deleteEntry(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  const data = getVoyageData(currentVoyage.id);
  data.journal = data.journal.filter(e => e.id !== id);
  saveVoyageData(currentVoyage.id, data);
  renderJournal();
}

document.getElementById('close-entry').onclick = () => document.getElementById('modal-entry').classList.add('hidden');

document.getElementById('mood-picker').addEventListener('click', (e) => {
  if (e.target.classList.contains('emoji-opt')) {
    document.querySelectorAll('#mood-picker .emoji-opt').forEach(el => el.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedMood = e.target.dataset.e;
  }
});

document.getElementById('btn-save-entry').onclick = () => {
  const data = getVoyageData(currentVoyage.id);
  if (editingEntryId) {
    const entry = data.journal.find(e => e.id === editingEntryId);
    if (entry) {
      entry.date = document.getElementById('entry-date').value;
      entry.titre = document.getElementById('entry-titre').value.trim();
      entry.texte = document.getElementById('entry-texte').value.trim();
      entry.mood = selectedMood;
    }
  } else {
    data.journal.push({
      id: Date.now().toString(),
      date: document.getElementById('entry-date').value,
      titre: document.getElementById('entry-titre').value.trim(),
      texte: document.getElementById('entry-texte').value.trim(),
      mood: selectedMood,
    });
  }
  saveVoyageData(currentVoyage.id, data);
  document.getElementById('modal-entry').classList.add('hidden');
  renderJournal();
};

// ─── CONTACTS ────────────────────────────────────────────────────────
function renderContacts() {
  const data = getVoyageData(currentVoyage.id);
  const container = document.getElementById('contacts-list');
  if (data.contacts.length === 0) {
    container.innerHTML = '<div class="empty-state">Personne encore.<br>Les belles rencontres arrivent !</div>';
    return;
  }
  container.innerHTML = data.contacts.map(c => `
    <div class="contact-card">
      <div class="contact-avatar">${c.nom ? c.nom[0].toUpperCase() : '?'}</div>
      <div style="flex:1;min-width:0">
        <div class="contact-nom">${c.nom || '—'}</div>
        ${c.origine ? `<div class="contact-sub">${c.origine}</div>` : ''}
        ${c.info ? `<div class="contact-info">📬 ${c.info}</div>` : ''}
        ${c.note ? `<div class="contact-note">${c.note}</div>` : ''}
      </div>
      <button class="contact-delete" data-id="${c.id}">✕</button>
    </div>
  `).join('');
  container.querySelectorAll('.contact-delete').forEach(b => {
    b.onclick = () => deleteContact(b.dataset.id);
  });
}

document.getElementById('btn-add-contact').onclick = () => {
  ['contact-nom','contact-origine','contact-info','contact-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-contact').classList.remove('hidden');
};
document.getElementById('close-contact').onclick = () => document.getElementById('modal-contact').classList.add('hidden');

document.getElementById('btn-save-contact').onclick = () => {
  const nom = document.getElementById('contact-nom').value.trim();
  if (!nom) { document.getElementById('contact-nom').focus(); return; }
  const data = getVoyageData(currentVoyage.id);
  data.contacts.push({
    id: Date.now().toString(),
    nom,
    origine: document.getElementById('contact-origine').value.trim(),
    info: document.getElementById('contact-info').value.trim(),
    note: document.getElementById('contact-note').value.trim(),
  });
  saveVoyageData(currentVoyage.id, data);
  document.getElementById('modal-contact').classList.add('hidden');
  renderContacts();
};

function deleteContact(id) {
  if (!confirm('Supprimer ce contact ?')) return;
  const data = getVoyageData(currentVoyage.id);
  data.contacts = data.contacts.filter(c => c.id !== id);
  saveVoyageData(currentVoyage.id, data);
  renderContacts();
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────
function renderDocs() {
  const data = getVoyageData(currentVoyage.id);
  const container = document.getElementById('docs-list');
  if (data.docs.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun document.<br>Ajoutez billets, confirmations, cartes…</div>';
    return;
  }
  container.innerHTML = data.docs.map(d => `
    <div class="doc-item">
      <div class="doc-icon">${docIcon(d.type)}</div>
      <div class="doc-name" title="${d.name}">${d.name}</div>
      <div class="doc-size">${formatSize(d.size)}</div>
      <button class="doc-btn" data-id="${d.id}">👁 Voir</button>
      <button class="doc-delete" data-id="${d.id}">✕</button>
    </div>
  `).join('');
  container.querySelectorAll('.doc-btn').forEach(b => {
    b.onclick = () => viewDoc(b.dataset.id);
  });
  container.querySelectorAll('.doc-delete').forEach(b => {
    b.onclick = () => deleteDoc(b.dataset.id);
  });
}

function docIcon(type) {
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('image/')) return '🖼';
  return '📎';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(0)} Ko`;
  return `${(bytes/1024/1024).toFixed(1)} Mo`;
}

document.getElementById('input-doc-upload').onchange = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = getVoyageData(currentVoyage.id);
      data.docs.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: ev.target.result,
      });
      saveVoyageData(currentVoyage.id, data);
      renderDocs();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
};

function viewDoc(id) {
  const data = getVoyageData(currentVoyage.id);
  const doc = data.docs.find(d => d.id === id);
  if (!doc) return;
  const content = document.getElementById('viewer-content');
  if (doc.type === 'application/pdf') {
    content.innerHTML = `<iframe src="${doc.dataUrl}" title="${doc.name}"></iframe>`;
  } else if (doc.type.startsWith('image/')) {
    content.innerHTML = `<img src="${doc.dataUrl}" alt="${doc.name}" />`;
  } else {
    content.innerHTML = `<p style="color:var(--mocha);font-family:'Cormorant Garamond',serif;font-size:1.1rem;">Aperçu non disponible pour ce type de fichier.<br><a href="${doc.dataUrl}" download="${doc.name}" style="color:var(--gold-dark)">Télécharger</a></p>`;
  }
  document.getElementById('modal-viewer').classList.remove('hidden');
}

document.getElementById('close-viewer').onclick = () => {
  document.getElementById('modal-viewer').classList.add('hidden');
  document.getElementById('viewer-content').innerHTML = '';
};

function deleteDoc(id) {
  if (!confirm('Supprimer ce document ?')) return;
  const data = getVoyageData(currentVoyage.id);
  data.docs = data.docs.filter(d => d.id !== id);
  saveVoyageData(currentVoyage.id, data);
  renderDocs();
}

// ─── CLOSE MODALS ON OVERLAY CLICK ──────────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      if (overlay.id === 'modal-lieu') pendingLatLng = null;
    }
  });
});

// ─── INIT ────────────────────────────────────────────────────────────
renderHome();
