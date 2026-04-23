import express from "express";
import * as ordersController from "../../controllers/orders.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";

/**
 * Routeur Commandes Vendeur
 *
 * Toutes les routes sont protégées par 2 middlewares :
 * 1. authMiddleware   → vérifie que l'utilisateur est connecté
 * 2. vendorMiddleware → vérifie que l'utilisateur est vendeur
 *
 * GET  /api/vendor/orders      → commandes reçues par la boutique
 * PUT  /api/vendor/orders/:id  → MAJ statut d'un article commande
 */

const vendorOrdersRouter = express.Router();

// ─────────────────────────────────────────────
// MIDDLEWARES DE PROTECTION
// ─────────────────────────────────────────────

vendorOrdersRouter.use(authMiddleware);
vendorOrdersRouter.use(vendorMiddleware);

// ─────────────────────────────────────────────
// ROUTES COMMANDES VENDEUR
// ─────────────────────────────────────────────

// Récupérer toutes les commandes reçues par SA boutique
vendorOrdersRouter.get("/", ordersController.getVendorOrders);

// Mettre à jour le statut d'un article commande
vendorOrdersRouter.put("/:id", ordersController.updateOrderStatus);

export default vendorOrdersRouter;