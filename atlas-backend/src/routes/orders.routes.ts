/**
 * @file orders.routes.ts (client)
 * @description Routes des commandes pour les clients connectés.
 *
 * Toutes les routes sont protégées par authMiddleware.
 * Montées sur /api/orders dans app.ts.
 */
import { Router } from "express";
import {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/ordersController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { clientMiddleware } from "../middlewares/client.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(clientMiddleware);

// -- Checkout tunnel --------------------------------------------------------
router.post("/",              createOrder);     // Créer une commande depuis le panier
router.patch("/:id/confirm",  confirmPayment);  // Confirmer le paiement

// -- Existants --------------------------------------------------------------
router.get("/",               getMyOrders);     // Mes commandes
router.get("/:id",            getOrderById);    // Détail d'une commande
router.put("/:id/cancel",     cancelOrder);     // Annuler une commande

export default router;