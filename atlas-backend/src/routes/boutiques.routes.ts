import express from "express";
import { pool } from "../db/index.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = express.Router();

/**
 * GET /api/boutiques
 * Récupère toutes les boutiques ACTIVE avec leurs stats
 * Cache de 60 secondes — invalidé quand un vendeur modifie sa boutique
 */
/*WHERE b.statut = 'ACTIVE'* => on ajoute cette ligne quand on regle le problème de statut de boutique*/
router.get("/", cacheMiddleware("boutiques", 60_000), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.nom,
        b.description,
        b.url_logo,
        b.url_image_couverture,
        b.note_moyenne,
        b.cree_le,
        u.name AS proprietaire_nom,
        COUNT(DISTINCT p.id) AS nb_produits
      FROM boutiques b
      JOIN public.user u ON u.id = b.proprietaire_id
      LEFT JOIN produits p ON p.boutique_id = b.id AND p.actif = true
      WHERE b.statut = 'ACTIVE'
      GROUP BY b.id, u.name
      ORDER BY b.note_moyenne DESC, b.cree_le DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erreur GET /boutiques:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;