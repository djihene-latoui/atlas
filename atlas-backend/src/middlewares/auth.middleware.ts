import type  { Request, Response, NextFunction } from "express";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

/**
 * Middleware d'authentification
 * 
 * Ce middleware est exécuté avant chaque route protégée.
 * Il vérifie que l'utilisateur qui fait la requête est bien connecté
 * en récupérant sa session via BetterAuth.
 * 
 * Si la session est valide → on attache l'utilisateur à la requête (req.user)
 * et on passe à la suite (next()).
 * 
 * Si la session est invalide ou absente → on bloque la requête
 * et on retourne une erreur 401 (Non authentifié).
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // On récupère la session de l'utilisateur depuis les headers de la requête
    // BetterAuth lit le cookie "better-auth.session_token" automatiquement
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // Si aucune session trouvée, l'utilisateur n'est pas connecté
    if (!session) {
      res.status(401).json({ 
        error: "Non authentifié — veuillez vous connecter" 
      });
      return;
    }

    // On attache les infos de l'utilisateur à la requête
    // pour pouvoir les utiliser dans les controllers suivants
    // Exemple : req.user.id, req.user.role, req.user.email
    (req as any).user = session.user;

    // On passe au middleware ou controller suivant
    next();

  } catch (error) {
    console.error("Erreur authMiddleware :", error);
    res.status(401).json({ 
      error: "Session invalide ou expirée" 
    });
  }
}