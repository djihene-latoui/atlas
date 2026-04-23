import type { Request, Response, NextFunction } from "express";

/**
 * Système de Cache API en mémoire
 *
 * Ce module implémente un cache serveur qui stocke les réponses JSON
 * après un premier appel à la base de données. Les requêtes suivantes
 * avec les mêmes paramètres sont servies directement depuis la mémoire,
 * sans re interroger PostgreSQL.
 *
 * FONCTIONNEMENT :
 * 1- Une requête GET arrive (GET /api/products?page=1&limite=6)
 * 2- Le middleware génère une clé unique basée sur l'URL complète
 * 3- Si la clé existe dans le cache ET n'a pas expiré -> réponse immédiate (cache HIT)
 * 4- Sinon -> la requête passe au controller, la réponse est interceptée,
 *    stockée dans le cache avec un TTL, puis envoyée au client (cache MISS)
 *
 * INVALIDATION :
 * Quand un vendeur crée, modifie ou supprime un produit/boutique,
 * on appelle clearCache("products") ou clearCache("boutiques")
 * pour forcer le prochain appel à re-interroger la BDD.
 *
 * AVANTAGES :
 * - Réduit la charge sur PostgreSQL (moins de requêtes SQL)
 * - Temps de réponse quasi-instantané pour les données cachées
 * - Simple à comprendre et à maintenir (pas de Redis nécessaire)
 */

//------------------------------------------------------------------------------
// Structure d'une entrée du cache
//------------------------------------------------------------------------------
interface CacheEntry {
  data: any;        // La réponse JSON stockée
  expireAt: number; // Timestamp d'expiration (Date.now() + TTL)
}

//------------------------------------------------------------------------------
// Le cache lui-même : une Map JavaScript en mémoire du serveur
// Clé = préfixe:URL (ex: "products:/api/products?page=1&limite=6")
// Valeur = { data, expireAt }
//------------------------------------------------------------------------------
const cache = new Map<string, CacheEntry>();

//------------------------------------------------------------------------------
// Middleware de cache — à placer sur les routes GET publiques
//
// @param prefix  - Identifiant du groupe de cache (ex: "products", "boutiques")
//                  Utilisé pour l'invalidation ciblée
// @param ttlMs   - Durée de vie du cache en millisecondes (défaut: 60 secondes)
//------------------------------------------------------------------------------

export function cacheMiddleware(prefix: string, ttlMs: number = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // On ne cache que les requêtes GET (les POST/PUT/DELETE modifient des données)
    if (req.method !== "GET") {
      return next();
    }

    // Générer la clé unique : préfixe + URL complète (inclut les query params)
    // Ex: "products:/api/products?page=1&limite=6&tri=popular"
    const cacheKey = `${prefix}:${req.originalUrl}`;

    // Vérifier si la réponse est dans le cache 
    const cached = cache.get(cacheKey);

    if (cached && cached.expireAt > Date.now()) {
      // CACHE HIT : la donnée existe et n'a pas expiré
      // On renvoie directement la réponse stockée, sans toucher à la BDD
      console.log(`Cache HIT  [${prefix}] ${req.originalUrl}`);
      res.json(cached.data);
      return;
    }

    // CACHE MISS : la donnée n'existe pas ou a expiré 
    // On laisse la requête continuer vers le controller,
    // mais on intercepte res.json() pour capturer la réponse
    console.log(`Cache MISS [${prefix}] ${req.originalUrl}`);

    // Sauvegarder la méthode json() originale d'Express
    const originalJson = res.json.bind(res);

    // Remplacer res.json() par notre version qui stocke + envoie
    res.json = (body: any) => {
      // Stocker la réponse dans le cache avec le TTL
      cache.set(cacheKey, {
        data: body,
        expireAt: Date.now() + ttlMs,
      });

      // Envoyer la réponse normalement au client
      return originalJson(body);
    };

    // Continuer vers le controller (qui appellera res.json())
    next();
  };
}

//------------------------------------------------------------------------------
// Fonction d'invalidation du cache
//
// Supprime toutes les entrées dont la clé commence par le préfixe donné.
// À appeler après toute modification de données (POST, PUT, DELETE).
//
// Exemple : clearCache("products") supprime toutes les pages du catalogue
//           car leurs clés sont "products:/api/products?page=1...",
//           "products:/api/products?page=2...", etc.
//------------------------------------------------------------------------------

export function clearCache(prefix: string) {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(`${prefix}:`)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    console.log(`Cache CLEAR [${prefix}] — ${count} entrée(s) supprimée(s)`);
  }
}
