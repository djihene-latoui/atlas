import express from "express";
import { auth } from "../../auth.js";
import { pool } from "../../db/index.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, name, shopName, shopDescription, callbackURL } = req.body;

  if (!email || !password || !name || !shopName) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  // Step 1 — Create the auth user (outside transaction, better-auth manages its own state)
  let createdUserId: string | null = null;

  try {
    const authResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        role: "VENDEUR",
        callbackURL: callbackURL || undefined,
      },
    });
    createdUserId = authResponse.user.id;
  } catch (error: any) {
    const isEmailTaken = error.message?.toLowerCase().includes("email");
    return res.status(isEmailTaken ? 409 : 500).json({
      message: isEmailTaken
        ? "Cette adresse email est déjà utilisée."
        : "Une erreur est survenue lors de la création du compte.",
    });
  }

  // Step 2 — Create the boutique in a transaction so it's atomic
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO boutiques (proprietaire_id, nom, description, statut)
       VALUES ($1, $2, $3, $4)`,
      [createdUserId, shopName, shopDescription, "EN_ATTENTE"]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Compte vendeur et boutique créés avec succès.",
    });

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Erreur création boutique, rollback DB:", error);

    // Helper — always attempt to clean up the orphaned auth user
    const cleanupAuthUser = async () => {
      try {
        await pool.query(`DELETE FROM "user" WHERE id = $1`, [createdUserId]);
      } catch (cleanupError) {
        console.error(
          `ORPHANED USER — manual cleanup required for user id: ${createdUserId}`,
          cleanupError
        );
      }
    };

    // Unique constraint violation — boutique name already taken
    if (error.code === "23505" && error.constraint === "boutiques_nom_unique") {
      await cleanupAuthUser();
      return res.status(409).json({
        message: "Ce nom de boutique est déjà pris. Veuillez en choisir un autre.",
        field: "shopName",
      });
    }

    // Generic DB failure
    await cleanupAuthUser();
    return res.status(500).json({
      message: "Erreur lors de la création de la boutique.",
    });

  } finally {
    client.release();
  }
});

export default router;