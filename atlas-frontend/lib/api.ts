const API_BASE_URL = "";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  return res.json();
}
// Dans lib/api.ts (Frontend)
export async function addToCart(varianteId: number, quantity: number = 1) {
  const res = await fetch(`/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // On change "productId" par "variante_id" pour plaire au backend
    body: JSON.stringify({ 
      variante_id: varianteId, 
      quantite: quantity 
    }),
    credentials: 'include', 
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Erreur lors de l'ajout au panier");
  }
  
  return res.json();
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface CategoryFromAPI {
  id: number;
  nom: string;
  parent_id: number | null;
  count: number;
}

export async function getCategories(): Promise<CategoryFromAPI[]> {
  return apiFetch<CategoryFromAPI[]>("/api/categories");
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductFromAPI {
  id: number;
  variante_id: number | null;
  nom: string;
  description: string;
  prix: number;
  prix_compare: number | null;
  images: string[];
  actif: boolean;
  cree_le: string;
  categorie_id: number;
  categorie_nom: string;
  boutique_id: number;
  boutique_nom: string;
  note_moyenne?: number;
  nombre_avis?: number;
  stock_total?: number;
}

export interface ProductsFilters {
  categories?: string;
  prix_min?: number;
  prix_max?: number;
  recherche?: string;
  recherche_type?: string;
  note_min?: number;
  tri?: string;
  page?: number;
  limite?: number;
}

export interface PaginatedProductsFromAPI {
  produits: ProductFromAPI[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export async function getProducts(filters?: ProductsFilters): Promise<PaginatedProductsFromAPI> {
  const params = new URLSearchParams();
  if (filters?.categories) params.set("categories", filters.categories);
  if (filters?.prix_min !== undefined) params.set("prix_min", String(filters.prix_min));
  if (filters?.prix_max !== undefined) params.set("prix_max", String(filters.prix_max));
  if (filters?.recherche) params.set("recherche", filters.recherche);
  if (filters?.recherche_type) params.set("recherche_type", filters.recherche_type);
  if (filters?.note_min !== undefined) params.set("note_min", String(filters.note_min));
  if (filters?.tri) params.set("tri", filters.tri);
  
  // On envoie la page et la limite au backend
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limite) params.set("limite", String(filters.limite));

  const query = params.toString();
  return apiFetch<PaginatedProductsFromAPI>(`/api/products${query ? `?${query}` : ""}`);
}
// Modifier la quantité
export async function updateCartQuantity(itemId: number, newQuantity: number) {
  const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantite: newQuantity }),
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    // On retourne l'erreur avec le stock disponible si dispo
    throw new Error(data.error || "Erreur lors de la mise à jour");
  }

  return data;
}

// Supprimer un article
export async function removeFromCart(itemId: number) {
  const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface ArticleCommandeFromAPI {
  id: number;
  commande_id: number;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  article_statut: string;
  boutique_nom: string;
  images: string[];
  variante_attributs: Record<string, string>;
  sku: string;
  numero_suivi?: string;
  transporteur?: string;
}

export interface OrderFromAPI {
  id: number;
  statut: string;
  sous_total: number;
  frais_livraison: number;
  montant_total: number;
  methode_paiement: string;
  adresse_livraison: {
    nom: string;
    rue: string;
    ville: string;
    code_postal: string;
    pays: string;
  } | null;
  cree_le: string;
  articles: ArticleCommandeFromAPI[];
}

/** Récupère toutes les commandes du client connecté */
export async function getMyOrders(): Promise<OrderFromAPI[]> {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

/** Récupère le détail d'une commande spécifique */
export async function getOrderById(id: number): Promise<OrderFromAPI> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

/** Annule une commande (statut EN_ATTENTE_PAIEMENT ou PAYEE uniquement) */
export async function cancelOrder(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}/cancel`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}
