/**
 * @file dashboard.routes.ts
 * @description Routes API pour le tableau de bord (Dashboard) des vendeurs.
 *
 * ROUTES :
 * - GET /kpis           -> CA total, nb commandes, produits actifs, note moyenne
 * - GET /top-products   -> 5 produits les plus vendus (volume + revenus)
 * - GET /stock-alerts   -> Variantes sous le seuil d'alerte, groupées par produit
 * - GET /recent-orders  -> 10 dernières commandes de la boutique
 *
 * SÉCURITÉ :
 * - Toutes les routes passent par `getVendorBoutique` qui vérifie la session
 *   BetterAuth ET que l'utilisateur possède bien une boutique.
 * - Filtrage strict par boutique_id : un vendeur ne voit jamais les données
 *   d'une autre boutique.
 *
 * CORRECTIONS /stock-alerts vs version précédente :
 * - Réponse groupée par produit : un objet par produit avec un tableau `variantes[]`
 *   au lieu d'une ligne plate par variante. Si un produit a 5 variantes en rupture,
 *   le frontend reçoit 1 entrée avec 5 éléments dans variantes[], pas 5 entrées.
 * - vp.actif = true et p.actif = true sont tous les deux présents — les deux colonnes
 *   existent bien dans le schéma.
 */

import express from 'express';
import type { Request, Response } from 'express';
import { auth } from '../../auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { pool } from '../../db/index.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { vendorMiddleware } from '../../middlewares/vendor.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(vendorMiddleware);

// -----------------------------------------------------------------------------
// Helper : vérifie la session et récupère la boutique du vendeur connecté
// Retourne null (et répond avec une erreur HTTP) si la session est invalide
// ou si la boutique n'existe pas.
// -----------------------------------------------------------------------------
async function getVendorBoutique(req: Request, res: Response) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: 'Non authentifié' });
    return null;
  }

  const result = await pool.query(
    `SELECT id, note_moyenne FROM boutiques WHERE proprietaire_id = $1`,
    [session.user.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Boutique introuvable' });
    return null;
  }

  return result.rows[0] as { id: number; note_moyenne: string };
}

// -----------------------------------------------------------------------------
// GET /api/vendor/dashboard/kpis
// Retourne : revenue, orders, activeProducts, averageRating
// -----------------------------------------------------------------------------
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(prix_unitaire * quantite), 0) AS total
       FROM articles_commande
       WHERE boutique_id = $1`,
      [boutique.id]
    );

    const ordersResult = await pool.query(
      `SELECT COUNT(DISTINCT commande_id) AS count
       FROM articles_commande
       WHERE boutique_id = $1`,
      [boutique.id]
    );

    const activeProductsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM produits
       WHERE boutique_id = $1 AND actif = true`,
      [boutique.id]
    );

    const revenue        = Number(revenueResult.rows[0].total);
    const orders         = Number(ordersResult.rows[0].count);
    const activeProducts = Number(activeProductsResult.rows[0].count);
    const averageRating  = Number(boutique.note_moyenne ?? 0);

    res.json({
      revenue: {
        value:      revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
        trend:      '+0%',
        isPositive: true,
      },
      orders: {
        value:      String(orders),
        trend:      '+0%',
        isPositive: true,
      },
      activeProducts: {
        value:      String(activeProducts),
        trend:      '+0%',
        isPositive: true,
      },
      averageRating: {
        value:      averageRating.toFixed(1),
        trend:      '+0%',
        isPositive: true,
      },
    });
  } catch (error) {
    console.error('Erreur /kpis :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/vendor/dashboard/top-products
// Retourne : les 5 produits les plus vendus (unitsSold + revenue)
// -----------------------------------------------------------------------------
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         p.id,
         p.nom     AS name,
         p.images,
         c.nom     AS category,
         SUM(ac.quantite)                    AS "unitsSold",
         SUM(ac.prix_unitaire * ac.quantite) AS revenue
       FROM articles_commande ac
       JOIN variantes_produit vp ON vp.id = ac.variante_id
       JOIN produits p           ON p.id  = vp.produit_id
       LEFT JOIN categories c    ON c.id  = p.categorie_id
       WHERE ac.boutique_id = $1
       GROUP BY p.id, p.nom, p.images, c.nom
       ORDER BY "unitsSold" DESC
       LIMIT 5`,
      [boutique.id]
    );

    const topProducts = result.rows.map((row: any) => {
      const images = Array.isArray(row.images) ? row.images : [];
      return {
        id:        row.id,
        name:      row.name,
        category:  row.category ?? 'Sans catégorie',
        unitsSold: Number(row.unitsSold),
        revenue:   Number(row.revenue),
        image:     images[0] ?? '/placeholder.png',
      };
    });

    res.json(topProducts);
  } catch (error) {
    console.error('Erreur /top-products :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/vendor/dashboard/stock-alerts
//
// Retourne les variantes dont stock <= seuil_stock_faible, GROUPÉES par produit.
//
// Shape de la réponse (tableau d'objets) :
// [
//   {
//     produitId:   number,
//     productName: string,
//     variantes: [
//       {
//         varianteId: number,
//         label:      string,   // ex: "Couleur: Rouge, Taille: M"
//         stock:      number,
//         seuil:      number,
//       },
//       ...
//     ]
//   },
//   ...
// ]
//
// Pourquoi grouper côté backend ?
// - Évite que le frontend reçoive 5 lignes pour un produit avec 5 variantes en rupture.
// - Le modal de réappro peut alors lister toutes les variantes du produit directement.
// - Le frontend n'a plus à dédupliquer.
//
// varianteId est exposé car le frontend en a besoin pour l'URL du PATCH :
//   PATCH /api/vendor/products/:produitId/stock/:varianteId/reapprovisionner
// -----------------------------------------------------------------------------
router.get('/stock-alerts', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         vp.id                  AS "varianteId",
         p.id                   AS "produitId",
         p.nom                  AS "productName",
         vp.attributs,
         vp.stock,
         vp.seuil_stock_faible  AS seuil
       FROM variantes_produit vp
       JOIN produits p ON p.id = vp.produit_id
       WHERE p.boutique_id = $1
         AND p.actif = true
         AND vp.actif = true
         AND vp.stock <= vp.seuil_stock_faible
       ORDER BY p.id ASC, vp.stock ASC`,
      [boutique.id]
    );

    // Grouper les lignes par produit
    const map = new Map<number, {
      produitId:   number;
      productName: string;
      variantes:   { varianteId: number; label: string; stock: number; seuil: number }[];
    }>();

    for (const row of result.rows) {
      const attrs  = row.attributs as Record<string, string> | null;
      const label  =
        attrs && Object.keys(attrs).length > 0
          ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ')
          : 'Variante unique';

      const produitId   = Number(row.produitId);
      const productName = row.productName as string;

      if (!map.has(produitId)) {
        map.set(produitId, { produitId, productName, variantes: [] });
      }

      map.get(produitId)!.variantes.push({
        varianteId: Number(row.varianteId),
        label,
        stock:      Number(row.stock ?? 0),
        seuil:      Number(row.seuil ?? 5),
      });
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error('Erreur /stock-alerts :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/vendor/dashboard/recent-orders
// Retourne : les 10 dernières commandes contenant au moins un article
//            de la boutique, avec client, montant et statut
// -----------------------------------------------------------------------------
router.get('/recent-orders', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         cmd.id,
         cmd.statut,
         SUM(ac.prix_unitaire * ac.quantite) AS montant_total,
         cmd.cree_le,
         u.name           AS "clientName",
         SUM(ac.quantite) AS "itemsCount"
       FROM commandes cmd
       JOIN articles_commande ac ON ac.commande_id = cmd.id
       JOIN "user" u             ON u.id = cmd.client_id
       WHERE ac.boutique_id = $1
       GROUP BY cmd.id, cmd.statut, cmd.montant_total, cmd.cree_le, u.name
       ORDER BY cmd.cree_le DESC
       LIMIT 10`,
      [boutique.id]
    );

    const recentOrders = result.rows.map((row: any) => ({
      id:     `#${row.id}`,
      client: row.clientName,
      items:  Number(row.itemsCount),
      amount: Number(row.montant_total),
      status: row.statut,
    }));

    res.json(recentOrders);
  } catch (error) {
    console.error('Erreur /recent-orders :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;