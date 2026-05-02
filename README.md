# 🤖 Bot Discord RPG — Fiches Personnages

## 📁 Structure
```
discord-bot/
├── index.js                  # Point d'entrée
├── package.json
├── railway.toml              # Config Railway
├── .env.example              # Variables d'environnement
├── data/
│   ├── fiches.json           # Données des joueurs (créé auto)
│   └── items.json            # Liste des objets (créé auto)
└── src/
    ├── commands/
    │   ├── fiche.js          # /fiche add | /fiche del
    │   └── day.js            # /day
    ├── events/
    │   ├── ready.js
    │   └── interactionCreate.js  # Boutons, modals, menus
    ├── utils/
    │   ├── database.js       # Lecture/écriture JSON
    │   └── ficheBuilder.js   # Embed + boutons
    └── deploy-commands.js    # Script de déploiement
```

---

## 🚀 Installation locale

### 1. Prérequis
- Node.js 18+
- Un bot Discord créé sur https://discord.com/developers/applications

### 2. Clone & install
```bash
git clone <ton-repo>
cd discord-bot
npm install
```

### 3. Config
Copie `.env.example` en `.env` et remplis :
```
TOKEN=      → Token du bot (onglet "Bot" sur le portail dev)
CLIENT_ID=  → Application ID (onglet "General Information")
GUILD_ID=   → ID de ton serveur (clic droit sur le serveur > Copier l'ID)
```

### 4. Déployer les commandes slash
```bash
node src/deploy-commands.js
```

### 5. Lancer le bot
```bash
npm start
```

---

## 🚂 Déploiement sur Railway

1. Push ton code sur GitHub (sans `.env` et sans `data/`)
2. Créer un nouveau projet sur [railway.app](https://railway.app)
3. Connecte ton repo GitHub
4. Dans **Variables**, ajoute :
   - `TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
5. Railway démarre automatiquement avec `node index.js`

> ⚠️ Sur Railway, le dossier `data/` est éphémère. Les données sont perdues si le service redémarre. Pour persister les données, utilise un **Volume Railway** ou migre vers PostgreSQL plus tard.

---

## 🎮 Commandes

### `/fiche add`
Crée une fiche personnage.
```
/fiche add @user nom:Jean Dupont age:25 taille:1m80 descriptif:Un aventurier... competences:10;8;12;5
```
Format compétences : `intelligence;force;dextérité;chance`

### `/fiche del`
Supprime une fiche.
```
/fiche del @user
```

### `/day`
Passe un jour — distribue les revenus journaliers à tous les joueurs.

---

## 🔘 Boutons sur la fiche

| Bouton | Action |
|--------|--------|
| Ajouter un objet | Menu déroulant avec objets prédéfinis |
| Ajouter golem | Popup pour écrire le nom |
| Ajouter une propriété | Popup pour écrire le nom |
| Modifier argent | Popup : `+500` pour ajouter, `-200` pour retirer |
| Ajouter revenu / jour | Popup pour fixer le revenu journalier |
| Ajouter un champ | Crée un champ custom (ex: "Inventaire de la maison") |

---

## 📦 Ajouter des objets prédéfinis

Modifie `data/items.json` (créé automatiquement au premier lancement) :
```json
[
  { "id": "epee", "name": "⚔️ Épée", "description": "Une épée basique" },
  { "id": "potion", "name": "🧪 Potion", "description": "Restaure de la vie" }
]
```

---

## 🔒 Permissions requises
Les commandes `/fiche` et `/day` nécessitent la permission **Gérer le serveur**.
