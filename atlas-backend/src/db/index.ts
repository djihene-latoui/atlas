// On importe la bibliothèque PostgreSQL pour Node.js
import pg from "pg";

// On importe dotenv pour charger les variables d'environnement depuis le fichier .env
import dotenv from "dotenv";

// On exécute dotenv pour que process.env contienne les variables du fichier .env
dotenv.config();

// On récupère l'objet Pool depuis pg, qui sert à gérer un groupe de connexions à la base
const { Pool } = pg;

// On crée un nouveau pool de connexions à la base PostgreSQL
export const pool = new Pool({
  // URL de connexion à la base, définie dans les variables d'environnement
  connectionString: process.env.DATABASE_URL,
  // Configuration SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

// Gestion des erreurs inattendues sur le pool
pool.on("error", (err) => {
  console.error("Erreur inattendue sur le pool PostgreSQL :", err);
  // On arrête le serveur Node.js 
  process.exit(-1);
})