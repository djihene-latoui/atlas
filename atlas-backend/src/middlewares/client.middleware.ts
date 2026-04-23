import type { Request, Response, NextFunction } from "express";

/**
 * Middleware de vérification du rôle client
 *
 * Ce middleware est exécuté APRÈS le authMiddleware.
 * Il vérifie que l'utilisateur connecté a bien le rôle "CLIENT".
 *
 * Si l'utilisateur est client -> on passe à la suite (next())
 * Si l'utilisateur est vendeur -> on bloque avec une erreur 403 (Accès interdit)
 */
export function clientMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // On récupère l'utilisateur attaché par le authMiddleware juste avant
  const user = (req as any).user;

  // Double vérification — si user est absent c'est que authMiddleware n'a pas été appelé avant ce middleware
  if (!user) {
    res.status(401).json({ 
      error: "Non authentifié — authMiddleware manquant" 
    });
    return;
  }

  // On vérifie que le rôle est bien "CLIENT"
  // Un VENDEUR ne peut pas passer de commandes ou utiliser un panier
  if (user.role !== "CLIENT") {
    res.status(403).json({ 
      error: "Accès refusé — cette action est réservée aux clients" 
    });
    return;
  }

  // L'utilisateur est bien un client -> on continue
  next();
}
