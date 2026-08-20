"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import CrossedLink from "@/components/ui/crossed-link";

const showcaseImages = [
  {
    id: 1,
    src: "/Ramazah_Catalog_0408202312555 1_resized.jpg",
    alt: "Art piece 1",
  },
  {
    id: 2,
    src: "/Ramazah_Catalog_0408202313209_resized.jpg",
    alt: "Art piece 2",
  },
  {
    id: 3,
    src: "/DSC05257 (1).jpg",
    alt: "Art piece 3",
  },
  {
    id: 4,
    src: "/Ramazah_0408202445315 - Copy.jpg",
    alt: "Art piece 4",
  },
  {
    id: 5,
    src: "/banner/Ramazah_банер 1 _resized.jpg",
    alt: "Art piece 5",
  },
  {
    id: 6,
    src: "/DSC09599.jpg",
    alt: "Art piece 6",
  },
];

export default function ArtShowcase({isArt}: {isArt?: boolean}) {
  return (
    <section className="relative bg-background z-10">
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Left Side - Sticky Main Image */}
        <div className="w-full md:w-1/2 h-[50vh] md:h-screen md:sticky md:top-0 relative overflow-hidden">
          {/* Main Showcase Image */}
          <div className="relative w-full h-full">
            <Image
              src="/banner/Ramazah_банер правка.jpg"
              alt="Art Showcase"
              fill
              className="object-cover"
              priority
            />
            
            {/* Overlay with Text */}
            {!isArt && <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center px-6 z-10"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="font-body text-xs tracking-[0.3em] text-sage-light mb-2 uppercase"
                >
                  Gallery
                </motion.p>
                
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="font-heading text-5xl md:text-6xl lg:text-7xl tracking-wider text-background mb-4"
                >
                  ART SHOWCASE
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="font-body text-sm md:text-base text-background/80 max-w-md mx-auto mb-8"
                >
                  Discover our exclusive collection of street art and creative designs 
                  that define the culture.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <CrossedLink
                    href="/artwork"
                    lineColor="gold"
                  >
                    <span className="font-body text-base font-medium text-background">
                      Explore Collection
                    </span>
                  </CrossedLink>
                </motion.div>
              </motion.div>
            </div>}
          </div>
        </div>

        {/* Right Side - Grid of Images */}
        <div className="w-full md:w-1/2 grid grid-cols-2 gap-0">
          {showcaseImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative h-[40vh] md:h-[50vh] overflow-hidden group cursor-pointer"
            >
              {/* Image */}
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Hover Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-foreground/10 flex items-center justify-center"
              >
              </motion.div>

              {/* Border effect */}
              <div className="absolute inset-0 border border-foreground/20 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}