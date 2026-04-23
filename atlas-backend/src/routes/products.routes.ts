import express from "express";
import {
  getProduitsPublic,
  getProduitPublic
} from "../controllers/products.controller.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const productsRouter = express.Router();

// Récupérer tous les produits (page catalogue / page d'accueil)
// Cache de 60 secondes — invalidé automatiquement quand un vendeur modifie un produit
productsRouter.get("/", cacheMiddleware("products", 60_000), getProduitsPublic);

// Récupérer un produit par son id (page détail produit)
productsRouter.get("/:id", getProduitPublic);

export default productsRouter;