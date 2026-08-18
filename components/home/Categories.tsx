"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { WobbleCard } from "@/components/ui/wobble-card";
import { ArrowRight } from "lucide-react";

interface Category {
  title: string;
  description?: string;
  image?: string;
  href: string;
  span?: string;
  bgColor?: string;
  textColor?: string;
}

const categories: Category[] = [
  {
    title: "PROMOTIONS",
    description: "Explore exclusive deals on our top products. The perfect opportunity to enrich your wardrobe with trendy pieces at affordable prices.",
    image: "/Ramazah_0408202445315 - Copy.jpg",
    href: "/clothings/jeans",
    span: "md:row-span-2",
  },
  {
    title: "HOODIES",
    description: "Explore exclusive deals on our top products. The perfect opportunity to enrich your wardrobe with trendy pieces at affordable prices.",
    image: "/banner/Ramazah_банер правка.jpg",
    href: "/promotions",
    span: "md:col-span-2",
    textColor: "text-white",
  },
  {
    title: "T-SHIRTS",
    image: "/Ramazah_Catalog_0408202312555 1_resized.jpg",
    href: "/clothings/hood-wears/t-shirts",
    textColor: "text-white",
  },
  {
    title: "JEANS",
    image: "/Ramazah_Catalog_0408202313209_resized.jpg",
    href: "/accessories/sneakers",
    textColor: "text-white",
  },
  {
    title: "CANDLES AND MATCHES",
    image: "/DSC09599.jpg",
    description: "Discover our unique range of candles and matches, perfect for adding a touch of elegance to any occasion.",
    href: "/clothings/hood-wears/shirts",
    span: "md:col-span-2",
    textColor: "text-white",
  },
];

export default function Categories() {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.3, 1], [0.95, 1, 1]);

  return (
    <section 
      ref={sectionRef} 
      className="relative z-20 min-h-screen bg-gray-200 rounded-t-3xl py-10 md:py-16 overflow-hidden"
    >
      <motion.div style={{ scale }}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-wider mb-4">
              ELEVATING YOUR STYLE GAME
            </h2>
            <p className="font-body text-sm md:text-base text-foreground/70 max-w-3xl mx-auto tracking-wide">
              Discover the perfect blend of comfort and trend with our exclusive collection. 
              Explore deals on jeans, sneakers, and more!
            </p>
          </motion.div>

          {/* Categories Grid with WobbleCards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-2 auto-rows-[280px] md:auto-rows-[320px]">
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={category.span || ''}
              >
                <Link href={category.href} className="block h-full">
                  <WobbleCard
                    containerClassName={`h-full  group cursor-pointer`}
                    className="relative h-full p-6 "
                  >
                    {/* Background Image */}
                    <div className="absolute inset-0 transition-opacity duration-500">
                      <div className="relative w-full h-full">
                        {/* Replace with actual image */}
                        {category.image && <Image
                          src={category.image}
                          alt={category.title}
                          fill
                          className="w-full h-full object-cover"
                        />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between">
                      <div className="flex-1 flex flex-col justify-end">
                        <h3 className={`font-heading text-3xl md:text-4xl lg:text-4xl ${category.textColor || ' text-black'} tracking-wide group-hover:translate-y-[-4px] transition-transform duration-300`}>
                          {category.title}
                        </h3>
                        {category.description && <p className={`font-body text-xs mt-2 ${category.textColor || 'text-black/90'} leading-relaxed line-clamp-3 max-w-xs`}>
                          {category.description}
                        </p>}
                      </div>
                    </div>

                    {/* Optional: Add actual category images positioned creatively */}
                    {index === 4 && (
                      <div className="absolute -right-10 -bottom-10 w-48 h-48 opacity-60 group-hover:opacity-80 transition-opacity">
                        <div className="relative w-full h-full">
                          {/* Replace with actual image */}
                          <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm" />
                        </div>
                      </div>
                    )}
                  </WobbleCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}