import { pool } from "../db/index.js";

//_______________________________________________
// Générer le sku unique pour une variante
//_______________________________________________
async function generateSku(client: any, boutiqueId: number, produitId: number): Promise<string> {
  const result = await client.query(
    `SELECT COUNT(*) FROM variantes_produit WHERE produit_id = $1`,
    [produitId]
  );
  const count = parseInt(result.rows[0].count) + 1;
  const numero = String(count).padStart(3, "0");
  return `B${boutiqueId}-P${produitId}-${numero}`;
}

// ─────────────────────────────────────────────
// READ — Récupérer un produit par ID (route publique)
// ─────────────────────────────────────────────

export async function getProduitPublicById(id: number) {
  const result = await pool.query(
    `SELECT
        p.id,
        p.nom,
        p.description,
        p.prix,
        p.prix_compare,
        p.images,
        p.actif,
        b.nom        AS boutique_nom,
        b.url_logo   AS boutique_url_logo,
        c.nom        AS categorie_nom,
        COALESCE(AVG(a.note), 0)      AS note_moyenne,
        COUNT(DISTINCT a.id)          AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]')
         FROM variantes_produit v
         WHERE v.produit_id = p.id AND v.actif = true)   AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.id = $1 AND p.actif = true
     GROUP BY p.id, b.nom, b.url_logo, c.nom`,
    [id]
  );
  return result.rows[0] ?? null;
}

// ─────────────────────────────────────────────
// READ — Récupérer les produits (Catalogue public avec filtres)
// ─────────────────────────────────────────────

export async function getProduitsPublicFiltres(filters: any) {
  const values: any[] = [];
  let paramIndex = 1;

  let whereClauses = `p.actif = true
    AND EXISTS (
      SELECT 1 FROM variantes_produit v
      WHERE v.produit_id = p.id AND v.stock > 0
    )`;

  if (filters.recherche) {
    const searchTerm = `%${filters.recherche}%`;
    switch (filters.recherche_type) {
      case 'boutique':
      case 'vendeur':
        whereClauses += ` AND b.nom ILIKE $${paramIndex}`;
        break;
      case 'categorie':
        whereClauses += ` AND c.nom ILIKE $${paramIndex}`;
        break;
      case 'produit':
        whereClauses += ` AND (p.nom ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        break;
      default:
        whereClauses += ` AND (p.nom ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR b.nom ILIKE $${paramIndex} OR c.nom ILIKE $${paramIndex})`;
        break;
    }
    values.push(searchTerm);
    paramIndex++;
  }

  if (filters.prix_min !== undefined) {
    whereClauses += ` AND p.prix >= $${paramIndex}`;
    values.push(filters.prix_min);
    paramIndex++;
  }

  if (filters.prix_max !== undefined) {
    whereClauses += ` AND p.prix <= $${paramIndex}`;
    values.push(filters.prix_max);
    paramIndex++;
  }

  if (filters.categories) {
    const cats = filters.categories.split(',');
    const placeholders = cats.map((_: any, i: number) => `$${paramIndex + i}`).join(', ');
    whereClauses += ` AND c.nom IN (${placeholders})`;
    values.push(...cats);
    paramIndex += cats.length;
  }

  let havingClause = '';
  if (filters.note_min !== undefined && filters.note_min > 0) {
    havingClause = `HAVING ROUND(COALESCE(AVG(a.note), 0)) = $${paramIndex}`;
    values.push(Number(filters.note_min));
    paramIndex++;
  }

  let orderBy = 'cree_le DESC';
  if (filters.tri) {
    switch (filters.tri) {
      case 'price-asc':  orderBy = 'prix ASC'; break;
      case 'price-desc': orderBy = 'prix DESC'; break;
      case 'rating':     orderBy = 'note_moyenne DESC NULLS LAST'; break;
      case 'newest':     orderBy = 'cree_le DESC'; break;
    }
  }

  const page   = filters.page   ? Math.max(1, parseInt(filters.page))   : 1;
  const limite = filters.limite ? Math.max(1, parseInt(filters.limite)) : 9;
  const offset = (page - 1) * limite;

  const query = `
    WITH filtered AS (
      SELECT
        p.id,
        p.nom,
        p.description,
        p.prix,
        p.prix_compare,
        p.images,
        p.cree_le,
        b.nom          AS boutique_nom,
        b.url_logo     AS boutique_url_logo,
        c.nom          AS categorie_nom,
        COALESCE(AVG(a.note), 0)   AS note_moyenne,
        COUNT(DISTINCT a.id)       AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]')
         FROM variantes_produit v
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
      FROM produits p
      JOIN boutiques b ON p.boutique_id = b.id
      JOIN categories c ON p.categorie_id = c.id
      LEFT JOIN avis a ON a.produit_id = p.id
      WHERE ${whereClauses}
      GROUP BY p.id, b.nom, b.url_logo, c.nom
      ${havingClause}
    )
    SELECT
      *,
      COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limite, offset);

  const result = await pool.query(query, values);
  const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
  const produits = result.rows.map(row => {
    const { total_count, ...produit } = row;
    return produit;
  });

  return {
    produits,
    totalCount,
    totalPages: Math.ceil(totalCount / limite),
    currentPage: page,
  };
}

// ─────────────────────────────────────────────
// READ — Récupérer les produits par Boutique (Vendeur)
// ─────────────────────────────────────────────

export async function getProduitsByBoutique(boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        p.*, 
        b.nom AS boutique_nom, 
        c.nom AS categorie_nom,
        COALESCE(AVG(a.note), 0) AS note_moyenne,
        COUNT(DISTINCT a.id) AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]') 
         FROM variantes_produit v 
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.boutique_id = $1
     GROUP BY p.id, b.nom, c.nom
     ORDER BY p.cree_le DESC`,
    [boutiqueId]
  );
  return result.rows;
}

// ─────────────────────────────────────────────
// READ — Récupérer un produit par ID (Vendeur)
// ─────────────────────────────────────────────

export async function getProduitById(id: number, boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        p.*, 
        b.nom AS boutique_nom,
        b.url_logo AS boutique_url_logo,
        c.nom AS categorie_nom,
        COALESCE(AVG(a.note), 0) AS note_moyenne,
        COUNT(DISTINCT a.id) AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]') 
         FROM variantes_produit v 
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.id = $1 AND p.boutique_id = $2
     GROUP BY p.id, b.nom, b.url_logo, c.nom`,
    [id, boutiqueId]
  );
  return result.rows[0];
}

// ─────────────────────────────────────────────
// CREATE — Créer un produit
// ─────────────────────────────────────────────

export async function createProduit(data: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productQuery = `
      INSERT INTO produits (boutique_id, categorie_id, nom, description, prix, prix_compare, images, actif)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;

    const productValues = [
      data.boutiqueId,
      data.categorieId,
      data.nom,
      data.description,
      data.prix,
      data.prixCompare || null,
      JSON.stringify(data.images || []),
      data.actif ?? true,
    ];

    const productResult = await client.query(productQuery, productValues);
    const newProduct = productResult.rows[0];

    if (data.variantes && data.variantes.length > 0) {
      for (const v of data.variantes) {
        const sku = v.sku || await generateSku(client, data.boutiqueId, newProduct.id);
        await client.query(
          `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newProduct.id,
            sku,
            JSON.stringify(v.attributs || {}),
            v.prix_supplementaire || 0,
            v.stock || 0,
            v.seuil_stock_faible || 5,
          ]
        );
      }
    } else {
      const autoSku = await generateSku(client, data.boutiqueId, newProduct.id);
      await client.query(
        `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newProduct.id,
          autoSku,
          JSON.stringify({}),
          0,
          data.stock || 0,
          5,
        ]
      );
    }

    await client.query('COMMIT');
    return newProduct;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// UPDATE — Modifier un produit
// ─────────────────────────────────────────────

export async function updateProduit(id: number, boutiqueId: number, data: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productQuery = `
      UPDATE produits 
      SET nom = COALESCE($1, nom), description = $2, prix = $3, 
          prix_compare = $4, images = $5, actif = $6, categorie_id = $7, mis_a_jour_le = now()
      WHERE id = $8 AND boutique_id = $9 RETURNING *`;
    
    const productResult = await client.query(productQuery, [
      data.nom, data.description, data.prix, data.prix_compare, 
      JSON.stringify(data.images), data.actif, data.categorie_id, id, boutiqueId
    ]);

    if (productResult.rows.length === 0) throw new Error("PRODUIT_NON_TROUVE");

    if (data.variantes && Array.isArray(data.variantes)) {
      const activeIds = data.variantes
        .filter((v: any) => v.id && !v.supprimee)
        .map((v: any) => v.id);

      const softDeleteQuery = `
      UPDATE variantes_produit 
      SET actif = false, stock = 0
      WHERE produit_id = $1 
      AND id NOT IN (${activeIds.length > 0 ? activeIds.join(',') : '0'})`;
      
      await client.query(softDeleteQuery, [id]);

      for (const v of data.variantes) {
        if (v.supprimee && v.id) {
          await client.query(`UPDATE variantes_produit SET actif = false WHERE id = $1`, [v.id]);
        } else if (v.id) {
          await client.query(
            `UPDATE variantes_produit 
             SET attributs = $1, prix_supplementaire = $2, stock = $3, seuil_stock_faible = $4, actif = true
             WHERE id = $5 AND produit_id = $6`,
            [JSON.stringify(v.attributs), v.prix_supplementaire, v.stock, v.seuil_stock_faible, v.id, id]
          );
        } else if (!v.supprimee) {
          const newSku = await generateSku(client, boutiqueId, id);
          await client.query(
            `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible, actif)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [id, newSku, JSON.stringify(v.attributs), v.prix_supplementaire, v.stock, v.seuil_stock_faible]
          );
        }
      }
    }

    await client.query('COMMIT');
    return productResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteProduit(id: number, boutiqueId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `UPDATE produits
       SET actif = false, mis_a_jour_le = now()
       WHERE id = $1 AND boutique_id = $2
       RETURNING *`,
      [id, boutiqueId]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE variantes_produit
       SET stock = 0
       WHERE produit_id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return productResult.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// STOCKS
// ─────────────────────────────────────────────

export async function getStockProduit(produitId: number, boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        v.id, v.sku, v.stock, v.seuil_stock_faible, v.attributs,
        CASE WHEN v.stock <= v.seuil_stock_faible THEN true ELSE false END AS stock_faible
     FROM variantes_produit v
     JOIN produits p ON v.produit_id = p.id
     WHERE v.produit_id = $1 AND p.boutique_id = $2`,
    [produitId, boutiqueId]
  );
  return result.rows;
}

export async function updateStock(varianteId: number, boutiqueId: number, stock: number) {
  const result = await pool.query(
    `UPDATE variantes_produit v
     SET stock = $1
     FROM produits p
     WHERE v.id = $2 AND v.produit_id = p.id AND p.boutique_id = $3
     RETURNING v.*`,
    [stock, varianteId, boutiqueId]
  );
  return result.rows[0];
}

export async function reapprovisionnerVariante(
  varianteId: number,
  boutiqueId: number,
  quantiteAjouter: number
) {
  const result = await pool.query(
    `UPDATE variantes_produit v
     SET stock = v.stock + $1
     FROM produits p
     WHERE v.id = $2 AND v.produit_id = p.id AND p.boutique_id = $3
     RETURNING v.*`,
    [quantiteAjouter, varianteId, boutiqueId]
  );
  return result.rows[0] ?? null;
}