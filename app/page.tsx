import Hero from "@/components/home/Hero";
import Info from "@/components/home/Info";
import Categories from "@/components/home/Categories";
import Banner from "@/components/home/Banner";
import Trending from "@/components/home/Trending";
import ArtShowcase from "@/components/home/ArtShowcase";
import CTA from "@/components/home/CTA";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <Info />
      <Categories />
      <Banner />  
      <Trending />
      <ArtShowcase />
      <CTA />
    </main>
  );
}