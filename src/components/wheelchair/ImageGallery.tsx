"use client";

// src/components/wheelchair/ImageGallery.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Image strategy:
//  • Cloudinary handles: format (f_auto), quality (q_auto), crop (c_fill)
//  • Next.js handles: responsive widths via srcset + sizes (no double-resize)
//  • Hero image gets priority={true} — no lazy load, faster LCP
//  • Thumbnails are always lazy — below the fold, low priority
//  • Alt text is SEO-enriched: "{name} – wheelchair rental UAE [photo N]"
//  • Lightbox is deferred — zero DOM cost until user clicks zoom
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  /** Product name — used for SEO-rich alt text */
  name: string;
  /** Pre-set to true for above-the-fold hero images. Default: true */
  priority?: boolean;
}

// ── Cloudinary URL optimizer ──────────────────────────────────────────────────
// Applies format, quality, and crop transforms to Cloudinary URLs.
// Width is intentionally NOT set here — Next.js generates a proper srcset via
// the `sizes` prop and its own optimizer, which handles responsive widths
// without double-resizing. Cloudinary owns format+quality; Next.js owns width.
// Non-Cloudinary URLs are returned unchanged.
function cloudinaryTransform(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  // f_auto → serve AVIF/WebP/JPEG based on browser Accept header
  // q_auto → Cloudinary picks optimal quality per image content
  // c_fill → crop to fill container without distortion
  return url.replace("/upload/", "/upload/f_auto,q_auto,c_fill/");
}

// ── SEO alt text ──────────────────────────────────────────────────────────────
// Google uses alt text as a signal for image search ranking.
function buildAlt(name: string, index: number): string {
  if (index === 0) return `${name} – wheelchair rental UAE`;
  return `${name} – wheelchair rental UAE photo ${index + 1}`;
}

export default function ImageGallery({ images, name, priority = true }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Lightbox is NOT mounted until the user clicks — avoids shipping its DOM
  // and event listeners to users who never open it (Task 8: performance).
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    },
    [images.length],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    },
    [images.length],
  );

  if (!images || images.length === 0) {
    return (
      <div
        className="flex items-center justify-center aspect-[4/3] rounded-2xl bg-slate-100 text-8xl text-slate-200"
        aria-label={`${name} – no image available`}
        role="img"
      >
        ♿
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* ── Hero / Main image ──────────────────────────────────────────────── */}
        {/* priority=true tells Next.js to preload this image — critical for LCP */}
        <div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 cursor-zoom-in"
          onClick={openLightbox}
        >
          <Image
            src={cloudinaryTransform(images[activeIndex])}
            alt={buildAlt(name, activeIndex)}
            fill
            // Task 7: explicit sizes — prevents browser downloading oversized image
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 700px"
            // Task 8: priority=true on hero = no lazy load = faster LCP
            priority={priority && activeIndex === 0}
            className="object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm select-none">
            🔍 Click to zoom
          </div>
        </div>

        {/* ── Thumbnails ─────────────────────────────────────────────────────── */}
        {/* loading="lazy" is the default but explicit here for clarity */}
        {images.length > 1 && (
          <div
            className="grid grid-cols-4 gap-2"
            role="list"
            aria-label="Product image thumbnails"
          >
            {images.slice(0, 4).map((img, i) => (
              <div
                key={i}
                role="listitem"
                onClick={() => setActiveIndex(i)}
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer transition-all duration-200 ${
                  activeIndex === i
                    ? "ring-2 ring-primary-500 ring-offset-1"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={cloudinaryTransform(img)}
                  alt={buildAlt(name, i)}
                  fill
                  // Task 7: small thumbnails — tight sizes hint = small download
                  sizes="(max-width: 768px) 25vw, 150px"
                  // Task 8: thumbnails below fold — always lazy
                  loading="lazy"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ───────────────────────────────────────────────────────────
           Conditionally rendered: zero cost until user interacts.
           Uses unoptimized=false (Next.js still serves optimal format/size).
      ─────────────────────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} image viewer`}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
            aria-label="Close image viewer"
          >
            ✕
          </button>

          {images.length > 1 && (
            <button
              className="absolute left-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={goPrev}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <div
            className="relative w-full max-w-4xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={cloudinaryTransform(images[activeIndex])}
              alt={buildAlt(name, activeIndex)}
              fill
              sizes="100vw"
              // Lightbox is user-triggered — lazy is fine, no LCP concern
              loading="lazy"
              className="object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              className="absolute right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={goNext}
              aria-label="Next image"
            >
              ›
            </button>
          )}

          {images.length > 1 && (
            <div
              className="absolute bottom-4 flex gap-2"
              role="tablist"
              aria-label="Image indicators"
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`View image ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === activeIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// "use client";

// import { useState } from "react";
// import Image from "next/image";

// interface Props {
//   images: string[];
//   name: string;
// }

// export default function ImageGallery({ images, name }: Props) {
//   const [activeIndex, setActiveIndex] = useState(0);
//   const [lightboxOpen, setLightboxOpen] = useState(false);

//   if (!images || images.length === 0) {
//     return (
//       <div className="flex items-center justify-center aspect-[4/3] rounded-2xl bg-slate-100 text-8xl text-slate-200">
//         ♿
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="space-y-3">
//         {/* Main image */}
//         <div
//           className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 cursor-zoom-in"
//           onClick={() => setLightboxOpen(true)}
//         >
//           <Image
//             src={images[activeIndex]}
//             alt={name}
//             fill
//             sizes="(max-width: 1024px) 100vw, 50vw"
//             className="object-cover hover:scale-105 transition-transform duration-300"
//           />
//           {/* Zoom hint */}
//           <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
//             🔍 Click to zoom
//           </div>
//         </div>

//         {/* Thumbnails */}
//         {images.length > 1 && (
//           <div className="grid grid-cols-4 gap-2">
//             {images.slice(0, 4).map((img, i) => (
//               <div
//                 key={i}
//                 onClick={() => setActiveIndex(i)}
//                 className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer transition-all duration-200 ${
//                   activeIndex === i
//                     ? "ring-2 ring-primary-500 ring-offset-1"
//                     : "opacity-60 hover:opacity-100"
//                 }`}
//               >
//                 <Image
//                   src={img}
//                   alt={`${name} ${i + 1}`}
//                   fill
//                   sizes="(max-width: 1024px) 25vw, 12vw"
//                   className="object-cover"
//                 />
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Lightbox */}
//       {lightboxOpen && (
//         <div
//           className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
//           onClick={() => setLightboxOpen(false)}
//         >
//           {/* Close button */}
//           <button
//             className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
//             onClick={() => setLightboxOpen(false)}
//           >
//             ✕
//           </button>

//           {/* Prev button */}
//           {images.length > 1 && (
//             <button
//               className="absolute left-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setActiveIndex((prev) =>
//                   prev === 0 ? images.length - 1 : prev - 1,
//                 );
//               }}
//             >
//               ‹
//             </button>
//           )}

//           {/* Main lightbox image */}
//           <div
//             className="relative w-full max-w-4xl aspect-[4/3]"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <Image
//               src={images[activeIndex]}
//               alt={name}
//               fill
//               sizes="100vw"
//               className="object-contain"
//             />
//           </div>

//           {/* Next button */}
//           {images.length > 1 && (
//             <button
//               className="absolute right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setActiveIndex((prev) =>
//                   prev === images.length - 1 ? 0 : prev + 1,
//                 );
//               }}
//             >
//               ›
//             </button>
//           )}

//           {/* Dot indicators */}
//           {images.length > 1 && (
//             <div className="absolute bottom-4 flex gap-2">
//               {images.map((_, i) => (
//                 <button
//                   key={i}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setActiveIndex(i);
//                   }}
//                   className={`w-2 h-2 rounded-full transition-colors ${
//                     i === activeIndex ? "bg-white" : "bg-white/40"
//                   }`}
//                 />
//               ))}
//             </div>
//           )}
//         </div>
//       )}
//     </>
//   );
// }
