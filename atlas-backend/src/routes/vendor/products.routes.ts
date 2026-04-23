import express from "express";
import * as productsController from "../../controllers/products.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";
import { clearCache } from "../../middlewares/cache.middleware.js";

/**
 * Routeur Produits Vendeur
 *
 * Ce fichier contient les routes réservées aux vendeurs uniquement.
 * Toutes les routes sont protégées par 2 middlewares :
 *
 * 1. authMiddleware   → vérifie que l'utilisateur est connecté
 * 2. vendorMiddleware → vérifie que l'utilisateur est vendeur
 *
 * L'isolation des données est assurée dans le controller —
 * un vendeur ne peut modifier que les produits de SA boutique.
 */

const vendorProductsRouter = express.Router();

//--------------------------------------------------------------
// MIDDLEWARES DE PROTECTION
//--------------------------------------------------------------

vendorProductsRouter.use(authMiddleware);
vendorProductsRouter.use(vendorMiddleware);

//--------------------------------------------------------------
// CRUD — réservé aux vendeurs
//--------------------------------------------------------------

// Récupérer tous les produits de SA boutique
vendorProductsRouter.get("/", productsController.getProduits);

// Récupérer un seul produit de SA boutique
vendorProductsRouter.get("/:id", productsController.getProduit);

// Créer un nouveau produit (invalide le cache du catalogue)
vendorProductsRouter.post("/", productsController.createProduit, () => clearCache("products"));

// Modifier un produit existant (invalide le cache du catalogue)
vendorProductsRouter.put("/:id", productsController.updateProduit, () => clearCache("products"));

// Supprimer un produit (soft delete) (invalide le cache du catalogue)
vendorProductsRouter.delete("/:id", productsController.deleteProduit, () => clearCache("products"));

//--------------------------------------------------------------
// STOCKS — réservé aux vendeurs
//--------------------------------------------------------------

// Voir le stock de toutes les variantes d'un produit
vendorProductsRouter.get("/:id/stock", productsController.getStock);

// Mettre à jour le stock d'une variante spécifique
vendorProductsRouter.put(
  "/:id/stock/:varianteId",
  productsController.updateStock
);

// Réapprovisionner une variante
vendorProductsRouter.patch(
  "/:produitId/stock/:varianteId/reapprovisionner",
  productsController.reapprovisionnerVariante
);

export default vendorProductsRouter;