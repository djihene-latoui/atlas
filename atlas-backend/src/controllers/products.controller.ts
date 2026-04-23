import type  { Request, Response } from "express";
import * as productsService from "../services/products.service.js";
import { pool } from "../db/index.js";

/**
 * Controller Produits
 *
 * GET    /api/products         → getProduits
 * GET    /api/products/:id     → getProduit
 * POST   /api/products         → createProduit
 * PUT    /api/products/:id     → updateProduit
 * DELETE /api/products/:id     → deleteProduit
 * GET    /api/products/:id/stock            → getStock
 * PUT    /api/products/:id/stock/:varianteId → updateStock
 */

// ─────────────────────────────────────────────
// UTILITAIRE
// ─────────────────────────────────────────────

async function getBoutiqueId(userId: string): Promise<number | null> {
  const result = await pool.query(
    `SELECT id FROM boutiques WHERE proprietaire_id = $1`,
    [userId]
  );
  return result.rows[0]?.id || null;
}

/**
 * Variante par défaut injectée quand le vendeur ne crée aucune variante.
 * attributs = {} → produit simple sans options (taille, couleur, etc.)
 * Le SKU est généré côté service.
 */
const DEFAULT_VARIANTE = {
  attributs:            {},
  prix_supplementaire:  0,
  stock:                0,
  seuil_stock_faible:   5,
};

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

export async function getProduitsPublic(req: Request, res: Response) {
  try {
    const filters = {
      recherche:        req.query.recherche as string,
      recherche_type:   req.query.recherche_type as string,
      prix_min:         req.query.prix_min  ? Number(req.query.prix_min)  : undefined,
      prix_max:         req.query.prix_max  ? Number(req.query.prix_max)  : undefined,
      categories:       req.query.categories as string,
      note_min:         req.query.note_min  ? Number(req.query.note_min)  : undefined,
      tri:              req.query.tri as string,
      page:             req.query.page   as string,
      limite:           req.query.limite as string,
    };
    const data = await productsService.getProduitsPublicFiltres(filters);
    res.status(200).json(data);
  } catch (error) {
    console.error("Erreur getProduitsPublic :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getProduits(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }
    const produits = await productsService.getProduitsByBoutique(boutiqueId);
    res.status(200).json(produits);
  } catch (error) {
    console.error("Erreur getProduits :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getProduitPublic(req: Request, res: Response) {
  try {
    const produit = await productsService.getProduitPublicById(Number(req.params.id));
    if (!produit) {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }
    res.status(200).json(produit);
  } catch (error) {
    console.error("Erreur getProduitPublic :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getProduit(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }
    const produit = await productsService.getProduitById(Number(req.params.id), boutiqueId);
    if (!produit) {
      res.status(404).json({ error: "Produit introuvable ou non autorisé" });
      return;
    }
    res.status(200).json(produit);
  } catch (error) {
    console.error("Erreur getProduit :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createProduit(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      return res.status(404).json({ error: "Aucune boutique trouvée" });
    }

    const { nom, description, prix, categorie_id, images, prix_compare, actif, variantes, stock } = req.body;

    if (!nom || !prix || !categorie_id) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    // ── Auto-default variant ───────────────────────────────────────────
    // Une variante est considérée "réelle" si elle a au moins un attribut
    // renseigné ou un stock > 0. Si le tableau est vide ou ne contient que
    // des variantes vides, on injecte la variante par défaut pour garantir
    // qu'il y a toujours au moins une variante en base.
    const variantesPayload: any[] = Array.isArray(variantes) ? variantes : [];

    const hasRealVariante = variantesPayload.some(
      (v) =>
        (v.stock !== undefined && v.stock !== "" && Number(v.stock) > 0) ||
        (v.attributs && Object.keys(v.attributs).length > 0)
    );

    const variantesFinales = hasRealVariante
      ? variantesPayload
      : [DEFAULT_VARIANTE];
    // ──────────────────────────────────────────────────────────────────

    const produit = await productsService.createProduit({
      boutiqueId,
      categorieId: categorie_id,
      nom,
      description,
      prix,
      prixCompare:  prix_compare,
      images:       images,
      actif:        actif,
      variantes:    variantesFinales,
      stock:        stock,
    });

    res.status(201).json(produit);
  } catch (error) {
    console.error("Erreur createProduit :", error);
    res.status(500).json({ error: "Erreur serveur lors de la création du produit" });
  }
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updateProduit(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      return res.status(404).json({ error: "Aucune boutique trouvée" });
    }

    const productId = Number(req.params.id);
    const { nom, description, prix, prix_compare, images, actif, variantes, categorie_id } = req.body;

    const result = await productsService.updateProduit(productId, boutiqueId, {
      nom,
      description,
      prix,
      prix_compare,
      images,
      actif,
      variantes,
      categorie_id,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur updateProduit Controller:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteProduit(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }

    const produit = await productsService.deleteProduit(Number(req.params.id), boutiqueId);
    if (!produit) {
      res.status(404).json({ error: "Produit introuvable ou non autorisé" });
      return;
    }

    res.status(200).json({ message: "Produit supprimé avec succès", produit });
  } catch (error) {
    console.error("Erreur deleteProduit :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────
// STOCKS
// ─────────────────────────────────────────────

export async function getStock(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }
    const stock = await productsService.getStockProduit(Number(req.params.id), boutiqueId);
    res.status(200).json(stock);
  } catch (error) {
    console.error("Erreur getStock :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function updateStock(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }

    const { stock } = req.body;
    if (stock === undefined || stock === null || stock < 0) {
      res.status(400).json({ error: "Le stock doit être un nombre positif ou nul" });
      return;
    }

    const variante = await productsService.updateStock(
      Number(req.params.varianteId),
      boutiqueId,
      stock
    );

    if (!variante) {
      res.status(404).json({ error: "Variante introuvable ou non autorisée" });
      return;
    }

    res.status(200).json(variante);
  } catch (error) {
    console.error("Erreur updateStock :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function reapprovisionnerVariante(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);
    if (!boutiqueId) {
      return res.status(404).json({ error: "Aucune boutique trouvée" });
    }

    const { varianteId } = req.params;
    const { quantite } = req.body;

    const quantiteAjouter = Number(quantite);
    if (isNaN(quantiteAjouter) || quantiteAjouter <= 0) {
      return res.status(400).json({ error: "Quantité invalide" });
    }

    const variante = await productsService.reapprovisionnerVariante(
      Number(varianteId),
      boutiqueId,
      quantiteAjouter
    );

    if (!variante) {
      return res.status(404).json({ error: "Variante introuvable ou non autorisée" });
    }

    res.status(200).json(variante);
  } catch (error) {
    console.error("Erreur reapprovisionnerVariante :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}