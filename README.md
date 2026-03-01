# 🗺 Carnets de Voyage

Une application web personnelle pour organiser et immortaliser vos voyages, avec une esthétique **Art Déco** bobo & raffinée.

## ✨ Fonctionnalités

- **Carte interactive** (OpenStreetMap, libre) — Ajoutez des lieux par catégorie : hébergement, transport, restaurants, visites, souvenirs photo
- **Journal de bord** — Rédigez vos souvenirs jour par jour, avec humeur
- **Rencontres & Contacts** — Gardez une trace des belles rencontres de voyage
- **Documents** — Stockez vos billets, confirmations PDF et photos avec visualiseur intégré
- **Géocodage automatique** — La carte se centre sur votre destination

## 🚀 Utilisation

### En local
Ouvrez simplement `index.html` dans votre navigateur. Aucun serveur nécessaire.

> **Note :** Le géocodage (centrage de la carte) nécessite une connexion internet. Toutes les données sont stockées localement dans votre navigateur (localStorage).

### Sur GitHub Pages (recommandé)

1. Créez un dépôt GitHub (ex: `carnet-de-voyage`)
2. Uploadez les 3 fichiers : `index.html`, `style.css`, `app.js`
3. Allez dans **Settings → Pages → Source : main branch / root**
4. Votre app est disponible sur `https://votre-pseudo.github.io/carnet-de-voyage`

## 🗂 Structure

```
carnet-de-voyage/
├── index.html   — Structure de l'application
├── style.css    — Design Art Déco
└── app.js       — Logique & stockage local
```

## 🔒 Données

Toutes les données (voyages, lieux, journal, contacts, documents) sont stockées dans le `localStorage` de votre navigateur. Elles restent privées et locales — aucun serveur, aucun compte requis.

> Pour sauvegarder sur plusieurs appareils, exportez manuellement votre localStorage ou ouvrez toujours l'app depuis le même navigateur.

## 🎨 Design

Palette Art Déco avec typographies Playfair Display, Cormorant Garamond & Josefin Sans.

---

*Fait avec ☕ et un peu de nostalgie des voyages.*
