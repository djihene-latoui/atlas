import type { Request, Response, NextFunction } from "express";

/**
 * Middleware de vérification du rôle vendeur
 *
 * Ce middleware est exécuté APRÈS le authMiddleware.
 * Il vérifie que l'utilisateur connecté a bien le rôle "VENDEUR".
 *
 * Pourquoi ce middleware séparé ?
 * Certaines routes sont accessibles à tous les utilisateurs connectés (clients, vendeurs).
 * D'autres routes sont réservées uniquement aux vendeurs (créer/modifier/supprimer des produits).
 * Ce middleware permet de protéger ces routes sensibles.
 *
 * Si l'utilisateur est vendeur -> on passe à la suite (next())
 * Si l'utilisateur est client -> on bloque avec une erreur 403 (Accès interdit)
 */
export function vendorMiddleware(
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

  // On vérifie que le rôle est bien "VENDEUR"
  // Un CLIENT ne peut pas créer ou modifier des produits
  if (user.role !== "VENDEUR" && user.role !== "SELLER") {
    res.status(403).json({ 
      error: "Accès refusé — cette action est réservée aux vendeurs" 
    });
    return;
  }

  // L'utilisateur est bien un vendeur -> on continue
  next();
}
