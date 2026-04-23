"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_STYLES: Record<string, { icon: React.ReactNode; gradient: string }> = {
  "Électronique": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
    gradient: "from-[#3b6bff] to-[#7b4fff]",
  },
  "Mode & Vêtements": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    gradient: "from-[#7b4fff] to-[#c026d3]",
  },
  "Maison & Décoration": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
      </svg>
    ),
    gradient: "from-[#0ea5e9] to-[#3b6bff]",
  },
  "Beauté & Bien-être": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21C12 21 4 14 4 8.5a8 8 0 0116 0C20 14 12 21 12 21z" />
      </svg>
    ),
    gradient: "from-[#f472b6] to-[#7b4fff]",
  },
  "Sport & Loisirs": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0 3 4.5 3 9s-3 9-3 9M12 3c0 0-3 4.5-3 9s3 9 3 9M3 12h18" />
      </svg>
    ),
    gradient: "from-[#3b6bff] to-[#0ea5e9]",
  },
  "Alimentation & Épicerie": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8 2 4 6 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4-4-8-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    gradient: "from-[#22c55e] to-[#0ea5e9]",
  },
  "default": {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: "from-[#3b6bff] to-[#7b4fff]",
  },
};

interface CategoryFromDB {
  id: number;
  nom: string;
  count: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<CategoryFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setLoading(false);
      });
  }, []);

  const handleCategoryClick = (cat: CategoryFromDB) => {
    router.push(`/catalogue?categorie=${encodeURIComponent(cat.nom)}`);
  };

  if (loading) return null;

  return (
    <section className="bg-gray-50 py-12 md:py-20 px-4 md:px-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-7 rounded-sm bg-gradient-to-b from-[#3b6bff] to-[#7b4fff]" />
          <h2 className="font-bold text-2xl text-[#111]">Explorez par catégorie</h2>
        </div>
        <div className="flex overflow-x-auto pb-4 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 no-scrollbar">
          {categories.map((cat) => {
            const style = CATEGORY_STYLES[cat.nom] || CATEGORY_STYLES["default"];
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className={`flex-none w-[140px] md:w-full rounded-2xl bg-gradient-to-br ${style.gradient} p-6 flex flex-col items-center gap-3 transition-all shadow-md hover:-translate-y-1 hover:shadow-xl active:scale-95 cursor-pointer`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                  {style.icon}
                </div>
                <div className="text-center">
                  <div className="font-bold text-[13px] text-white leading-tight">
                    {cat.nom}
                  </div>
                  <div className="text-[11px] text-white/75">
                    {cat.count} produits
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}