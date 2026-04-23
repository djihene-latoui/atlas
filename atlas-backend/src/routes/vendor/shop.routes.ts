import express from "express";
import multer from "multer";
import { auth } from "../../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { pool } from "../../db/index.js";
import { supabaseAdmin } from "../../lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées."));
    }
  },
});

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";
import { clearCache } from "../../middlewares/cache.middleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(vendorMiddleware);

// Helper: map DB row → camelCase response --------------------------------
function mapShopRow(b: any) {
  return {
    id: b.id,
    ownerId: b.proprietaire_id,
    name: b.nom,
    description: b.description,
    logoUrl: b.url_logo,
    coverImageUrl: b.url_image_couverture,
    status: b.statut,
    iban: b.iban,
    siret: b.siret,
    averageRating: parseFloat(b.note_moyenne || "0"),
    createdAt: b.cree_le,
  };
}

/**
 * GET /api/vendor/shop/me
 * Récupère la boutique du vendeur connecté
 */
router.get("/me", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    res.json(mapShopRow(result.rows[0]));
  } catch (error) {
    console.error("Erreur GET /shop/me:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/vendor/shop/stats
 * Récupère les statistiques de la boutique
 */
router.get("/stats", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM produits p WHERE p.boutique_id = b.id AND p.actif = true) as product_count,
         (SELECT COALESCE(SUM(ac.quantite), 0) FROM articles_commande ac JOIN commandes c ON ac.commande_id = c.id WHERE ac.boutique_id = b.id AND c.statut NOT IN ('ANNULEE', 'EN_ATTENTE_PAIEMENT')) as sales_count,
         b.note_moyenne,
         (SELECT COUNT(*) FROM avis a JOIN produits p ON a.produit_id = p.id WHERE p.boutique_id = b.id) as review_count
       FROM boutiques b 
       WHERE b.proprietaire_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    const row = result.rows[0];
    res.json({
      productCount: parseInt(row.product_count || "0", 10),
      salesCount: parseInt(row.sales_count || "0", 10),
      averageRating: parseFloat(row.note_moyenne || "0"),
      reviewCount: parseInt(row.review_count || "0", 10),
    });
  } catch (error) {
    console.error("Erreur GET /shop/stats:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Helper: détermine le statut en fonction des champs remplis
 * Statut ACTIVE si: nom, description, iban, url_logo, url_image_couverture sont remplis
 */
function getNewStatus(shopData: any): string {
  const hasRequiredFields =
    shopData.nom?.trim() &&
    shopData.description?.trim() &&
    shopData.iban?.trim() &&
    shopData.url_logo?.trim() &&
    shopData.url_image_couverture?.trim();

  return hasRequiredFields ? "ACTIVE" : "EN_ATTENTE";
}

/**
 * PUT /api/vendor/shop/info
 * Met à jour les informations de la boutique (nom, description, iban)
 * Calcule automatiquement le statut basé sur les champs remplis
 */
router.put("/info", async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, iban } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: name || currentShop.nom,
      description: description !== undefined ? description : currentShop.description,
      iban: iban !== undefined ? iban : currentShop.iban,
      url_logo: currentShop.url_logo,
      url_image_couverture: currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET nom = COALESCE($1, nom),
           description = COALESCE($2, description),
           iban = COALESCE($3, iban),
           statut = $4
       WHERE proprietaire_id = $5 RETURNING *`,
      [name, description, iban, newStatus, userId]
    );

    clearCache("boutiques"); // Invalider le cache de la page vendeurs
    res.json({
      message: "Informations enregistrées avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop/info:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * PUT /api/vendor/shop/visuals
 * Met à jour les visuels de la boutique (logo, cover)
 * Calcule automatiquement le statut basé sur les champs remplis
 */
router.put("/visuals", async (req, res) => {
  const userId = (req as any).user.id;
  const { logoUrl, coverImageUrl } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: currentShop.nom,
      description: currentShop.description,
      iban: currentShop.iban,
      url_logo: logoUrl !== undefined ? logoUrl : currentShop.url_logo,
      url_image_couverture: coverImageUrl !== undefined ? coverImageUrl : currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET url_logo = COALESCE($1, url_logo),
           url_image_couverture = COALESCE($2, url_image_couverture),
           statut = $3
       WHERE proprietaire_id = $4 RETURNING *`,
      [logoUrl, coverImageUrl, newStatus, userId]
    );

    clearCache("boutiques"); // Invalider le cache de la page vendeurs
    res.json({
      message: "Visuels enregistrés avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop/visuals:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * PUT /api/vendor/shop (déprécié - conservé pour compatibilité)
 * Met à jour la boutique du vendeur 
 */
router.put("/", async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, logoUrl, coverImageUrl, iban } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: name || currentShop.nom,
      description: description !== undefined ? description : currentShop.description,
      iban: iban !== undefined ? iban : currentShop.iban,
      url_logo: logoUrl !== undefined ? logoUrl : currentShop.url_logo,
      url_image_couverture: coverImageUrl !== undefined ? coverImageUrl : currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET nom = COALESCE($1, nom),
           description = COALESCE($2, description),
           url_logo = COALESCE($3, url_logo),
           url_image_couverture = COALESCE($4, url_image_couverture),
           iban = COALESCE($5, iban),
           statut = $6
       WHERE proprietaire_id = $7 RETURNING *`,
      [name, description, logoUrl, coverImageUrl, iban, newStatus, userId]
    );

    res.json({
      message: "Boutique mise à jour avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * DELETE /api/vendor/shop
 * Supprime la boutique du vendeur
 */
router.delete("/", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `DELETE FROM boutiques WHERE proprietaire_id = $1 RETURNING id`,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    res.json({ message: "Boutique supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /shop:", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

/**
 * POST /api/vendor/shop/upload?type=logo|cover
 * Upload une image vers Supabase Storage et retourne l'URL publique
 */
router.post("/upload", upload.single("image"), async (req, res) => {
  const userId = (req as any).user.id;
  const file = req.file;
  const type = req.query.type as string; // "logo" ou "cover"

  if (!file) {
    res.status(400).json({ error: "Aucun fichier fourni." });
    return;
  }

  if (!type || !["logo", "cover"].includes(type)) {
    res.status(400).json({ error: "Type invalide. Utilisez 'logo' ou 'cover'." });
    return;
  }

  try {
    const folder = type === "logo" ? "logos" : "covers";
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `${folder}/${userId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("boutiques-images")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Erreur upload Supabase:", uploadError);
      res.status(500).json({ error: "Erreur lors du téléversement vers le stockage." });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("boutiques-images")
      .getPublicUrl(fileName);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("Erreur POST /shop/upload:", error);
    res.status(500).json({ error: "Erreur serveur lors du téléversement." });
  }
});

export default router;