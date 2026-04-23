
import Hero from "@/components/ui/Hero";
import Categories from "@/components/ui/Categories";
import ProduitVedette from "@/components/ui/ProduitVedette";
import WhyAtlas from "@/components/ui/WhyAtlas";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f2e]">
      <Hero />
      <Categories />
      <ProduitVedette /> 
      <WhyAtlas />
    </main>
  );
}