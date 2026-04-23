/**
 * @file payment.routes.ts
 * @description Routes Stripe.
 *
 * Montées sur /api/payment dans app.ts.
 *
 * ⚠️  IMPORTANT — ordre dans app.ts :
 *   La route webhook DOIT être enregistrée AVANT app.use(express.json())
 *   car elle a besoin du body brut (raw buffer).
 *   Voir le commentaire dans app.ts.
 */
import { Router } from "express";
import { createPaymentIntent, stripeWebhook } from "../controllers/paymentController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// ⚠️  Webhook Stripe — body RAW requis, PAS de authMiddleware
// express.raw() est appliqué uniquement sur cette route (voir app.ts)
router.post(
  "/webhook",
  stripeWebhook
);

// Créer un PaymentIntent — client authentifié requis
router.post("/create-intent", authMiddleware, createPaymentIntent);

export default router;