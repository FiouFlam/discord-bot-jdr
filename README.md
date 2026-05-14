# 🤖 Bot Discord RPG — Fiches Personnages

Bot Discord.js v14 pour gérer des fiches personnages dans un contexte JDR. Les données sont persistées dans **MongoDB**.

---

## 📁 Structure du projet

```
discord-bot/
├── index.js                        # Point d'entrée — connexion MongoDB puis login
├── package.json
├── railway.toml                    # Config déploiement Railway
├── .env                            # Variables d'environnement (non versionné)
└── src/
    ├── commands/
    │   ├── fiche.js                # /fiche add | del | view | all
    │   ├── day.js                  # /day — avance d'un jour
    │   ├── add.js
    │   ├── del.js
    │   ├── end.js
    │   ├── go.js
    │   └── me.js
    ├── events/
    │   ├── ready.js                # Événement "prêt"
    │   └── interactionCreate.js    # Boutons, modals, menus déroulants
    ├── utils/
    │   ├── database.js             # Connexion MongoDB + CRUD fiches
    │   ├── ficheBuilder.js         # Embeds + boutons de la fiche
    │   └── session.js              # Gestion des sessions
    └── deploy-commands.js          # Script de déploiement des slash commands
```

---

## 🚀 Installation locale

### Prérequis

- Node.js 18+
- Une instance MongoDB (locale ou Atlas)
- Un bot Discord créé sur <https://discord.com/developers/applications>

### 1. Clone & install

```bash
git clone <ton-repo>
cd discord-bot
npm install
```

### 2. Configuration

Crée un fichier `.env` à la racine :

```env
TOKEN=         # Token du bot (onglet "Bot" sur le portail dev)
CLIENT_ID=     # Application ID (onglet "General Information")
GUILD_ID=      # ID de ton serveur (clic droit > Copier l'ID)
MONGODB_URI=   # URI de connexion MongoDB (ex: mongodb+srv://...)
```

### 3. Déployer les slash commands

```bash
npm run deploy
# ou : node src/deploy-commands.js
```

### 4. Lancer le bot

```bash
npm start
# ou : node index.js
```

---

## 🚂 Déploiement sur Railway

1. Push ton code sur GitHub (sans `.env`)
2. Crée un nouveau projet sur [railway.app](https://railway.app)
3. Connecte ton repo GitHub
4. Dans **Variables**, ajoute :
   - `TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `MONGODB_URI`
5. Railway démarre automatiquement avec `node index.js`

> **Note :** Les données sont dans MongoDB — elles persistent entre les redémarrages, contrairement à un stockage fichier.

---

## 🎮 Commandes

Toutes les commandes nécessitent la permission **Administrateur**.

### `/fiche add`

Crée une fiche personnage pour un joueur.

```
/fiche add user:@Jean nom:"Jean Dupont" age:25 taille:1m80
          descriptif:"Un aventurier..." competences:"10;8;12;5" monde:1
```

- `competences` : format `intelligence;force;dextérité;chance`
- `monde` : numéro du monde (optionnel, défaut : 1). Un joueur peut avoir une fiche par monde.

### `/fiche del`

Supprime la fiche d'un joueur pour un monde donné.

```
/fiche del user:@Jean monde:1
```

### `/fiche view`

Affiche toutes les fiches d'un joueur (tous mondes).

```
/fiche view user:@Jean
```

### `/fiche all`

Affiche toutes les fiches du serveur avec navigation par boutons.

### `/day`

Passe un jour pour tous les joueurs de la session active :
- Ajoute le revenu journalier à l'argent de chaque joueur
- Régénère 1 HP si les HP actuels sont inférieurs aux HP max

---

## 🔘 Boutons interactifs sur la fiche

| Bouton | Action |
|--------|--------|
| Ajouter un objet | Menu déroulant d'objets prédéfinis |
| Ajouter golem | Modal pour saisir le nom du golem |
| Ajouter une propriété | Modal pour saisir le nom de la propriété |
| Modifier argent | Modal : `+500` pour ajouter, `-200` pour retirer |
| Ajouter revenu / jour | Modal pour définir le revenu journalier |
| Ajouter un champ | Crée un champ personnalisé sur la fiche |

---

## 🗄️ Base de données (MongoDB)

Collection `fiches` — un document par `(userId, monde)` :

```json
{
  "userId": "123456789",
  "monde": 1,
  "nom": "Jean Dupont",
  "age": "25",
  "taille": "1m80",
  "descriptif": "...",
  "intelligence": 10,
  "force": 8,
  "dexterite": 12,
  "chance": 5,
  "argent": 0,
  "revenu": 0,
  "hp": 5,
  "maxHp": 5
}
```

---

## 🔒 Permissions requises

Les commandes `/fiche` et `/day` sont réservées aux **Administrateurs** du serveur.
