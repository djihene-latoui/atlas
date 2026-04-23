// src/routes/profile.routes.ts

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getMe,
  updateMe,
  getAdresses,
  createAdresse,
  setDefaultAdresse,
  deleteAdresse,
} from "../controllers/Profilecontroller.js";

const router = Router();

// Toutes les routes de ce fichier nécessitent d'être connecté
router.use(authMiddleware);

// ── Utilisateur ──────────────────────────────────────────────
router.get("/me", getMe);
router.patch("/me", updateMe);

// ── Adresses ─────────────────────────────────────────────────
router.get("/adresses", getAdresses);
router.post("/adresses", createAdresse);
router.patch("/adresses/:id/default", setDefaultAdresse);
router.delete("/adresses/:id", deleteAdresse);

export default router;