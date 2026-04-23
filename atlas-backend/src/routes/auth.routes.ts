/**
 * @file auth.routes.ts
 * @description Routeur Express dédié aux routes d'authentification BetterAuth.
 * Ce fichier centralise le branchement entre Express et BetterAuth :
 * L'intérêt de séparer ce routeur dans son propre fichier est de garder
 * le fichier principal `app.ts` propre et de permettre d'ajouter
 * facilement d'autres routes protégées ou middlewares autour de l'auth à l'avenir.
 */
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js"; 

const authRouter = express.Router();


/**
 * Intercepteur de toutes les requêtes arrivant sur ce routeur.
 * `toNodeHandler(auth)` convertit l'instance BetterAuth en un handler
 * compatible avec le format de requête/réponse natif de Node.js
 */
authRouter.use((req, res) => {
  return toNodeHandler(auth)(req, res);
});

export default authRouter;