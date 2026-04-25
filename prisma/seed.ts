// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin user ──────────────────────────────────────────────
  const adminEmail = requireEnv("ADMIN_EMAIL");
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  const adminName = process.env.ADMIN_NAME ?? "Admin User";

  const adminHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  console.log("✅ Admin created:", admin.email);

  // ── Wheelchairs ─────────────────────────────────────────────
  const wheelchairs = [
    {
      name: "Standard Comfort Chair",
      nameAr: "كرسي متحرك عادي مريح",
      description:
        "Our most popular model. Lightweight aluminum frame, foldable design, and padded armrests for all-day comfort.",
      descriptionAr:
        "أكثر نماذجنا شعبية. إطار ألومنيوم خفيف الوزن، قابل للطي، ومساند ذراعين مبطنة للراحة طوال اليوم.",
      category: "STANDARD" as const,
      pricePerDay: 25.0,
      serialNumber: "STD-2024-001",
      images: [
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600",
      ],
      features: ["Foldable", "Lightweight", "Padded Armrests"],
      featuresAr: ["قابل للطي", "خفيف الوزن", "مساند ذراعين مبطنة"],
      weight: 11.5,
      maxLoad: 120,
    },
    {
      name: "Electric Power Chair",
      nameAr: "كرسي متحرك كهربائي",
      description:
        "Full-featured electric wheelchair with joystick control. Long battery life up to 20 hours. Perfect for extended mobility needs.",
      descriptionAr:
        "كرسي متحرك كهربائي متكامل الميزات مع تحكم بعصا التوجيه. عمر بطارية يصل إلى 20 ساعة.",
      category: "ELECTRIC" as const,
      pricePerDay: 75.0,
      serialNumber: "ELC-2024-001",
      images: [
        "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600",
      ],
      features: [
        "Electric",
        "Joystick Control",
        "20hr Battery",
        "USB Charging",
      ],
      featuresAr: ["كهربائي", "تحكم بعصا", "بطارية 20 ساعة", "شحن USB"],
      weight: 28.0,
      maxLoad: 150,
    },
    {
      name: "Pediatric Wheelchair",
      nameAr: "كرسي متحرك للأطفال",
      description:
        "Specially designed for children ages 3-12. Colorful, adjustable, and safe with anti-tip protection.",
      descriptionAr:
        "مصمم خصيصاً للأطفال من 3 إلى 12 سنة. ملوّن، قابل للتعديل، وآمن مع حماية من الانقلاب.",
      category: "PEDIATRIC" as const,
      pricePerDay: 30.0,
      serialNumber: "PED-2024-001",
      images: [
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",
      ],
      features: [
        "For Children",
        "Anti-Tip Protection",
        "Adjustable",
        "Colorful",
      ],
      featuresAr: ["للأطفال", "حماية من الانقلاب", "قابل للتعديل", "ملوّن"],
      weight: 7.0,
      maxLoad: 50,
    },
    {
      name: "Bariatric Heavy-Duty Chair",
      nameAr: "كرسي متحرك للأوزان الثقيلة",
      description:
        "Heavy-duty bariatric wheelchair with reinforced steel frame. Supports up to 250kg with extra-wide seat.",
      descriptionAr:
        "كرسي متحرك مقوّى بإطار فولاذي. يدعم حتى 250 كيلوغرام مع مقعد عريض.",
      category: "BARIATRIC" as const,
      pricePerDay: 45.0,
      serialNumber: "BAR-2024-001",
      images: [
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600",
      ],
      features: [
        "Heavy Duty",
        "250kg Capacity",
        "Wide Seat",
        "Reinforced Frame",
      ],
      featuresAr: [
        "للأوزان الثقيلة",
        "يتحمل 250 كجم",
        "مقعد عريض",
        "إطار مقوّى",
      ],
      weight: 22.0,
      maxLoad: 250,
    },
    {
      name: "Transport Companion Chair",
      nameAr: "كرسي النقل والمرافقة",
      description:
        "Lightweight transport chair designed for caregiver use. Compact and easy to maneuver in tight spaces.",
      descriptionAr:
        "كرسي نقل خفيف الوزن مصمم للمرافق. مدمج وسهل المناورة في الأماكن الضيقة.",
      category: "TRANSPORT" as const,
      pricePerDay: 20.0,
      serialNumber: "TRN-2024-001",
      images: [
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600",
      ],
      features: [
        "Ultra Lightweight",
        "Compact",
        "Easy Transport",
        "Caregiver Friendly",
      ],
      featuresAr: ["خفيف للغاية", "مدمج", "سهل النقل", "مناسب للمرافق"],
      weight: 8.5,
      maxLoad: 100,
    },
    {
      name: "Deluxe Reclining Chair",
      nameAr: "كرسي مائل فاخر",
      description:
        "Premium reclining wheelchair with adjustable footrests and headrest. Ideal for post-surgery recovery.",
      descriptionAr:
        "كرسي متحرك مائل فاخر مع مساند للقدمين والرأس قابلة للتعديل. مثالي للتعافي بعد العمليات.",
      category: "STANDARD" as const,
      pricePerDay: 55.0,
      serialNumber: "DLX-2024-001",
      images: [
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600",
      ],
      features: [
        "Reclining",
        "Adjustable Headrest",
        "Premium Padding",
        "Footrest Adjustable",
      ],
      featuresAr: [
        "قابل للإمالة",
        "مسند رأس قابل للتعديل",
        "حشوة فاخرة",
        "مسند قدم قابل للتعديل",
      ],
      weight: 14.0,
      maxLoad: 130,
    },
  ];

  for (const w of wheelchairs) {
    await prisma.wheelchair.upsert({
      where: { serialNumber: w.serialNumber },
      update: {},
      create: { ...w, status: "AVAILABLE" },
    });
  }

  console.log(`✅ ${wheelchairs.length} wheelchairs seeded`);

  // ── Invoice counter ─────────────────────────────────────────
  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, year: new Date().getFullYear(), count: 0 },
  });

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// // prisma/seed.ts
// import { PrismaClient } from "@prisma/client";
// import { hash } from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Seeding database...");

//   // ── Admin user ──────────────────────────────────────────────
//   const adminHash = await hash("Admin@12345", 12);
//   const admin = await prisma.user.upsert({
//     where: { email: "admin@wheelrent.com" },
//     update: {},
//     create: {
//       email: "admin@wheelrent.com",
//       name: "Admin User",
//       passwordHash: adminHash,
//       role: "ADMIN",
//       emailVerified: true,
//     },
//   });
//   console.log("✅ Admin created:", admin.email);

//   // ── Demo customer ───────────────────────────────────────────
//   const customerHash = await hash("Customer@123", 12);
//   const customer = await prisma.user.upsert({
//     where: { email: "demo@wheelrent.com" },
//     update: {},
//     create: {
//       email: "demo@wheelrent.com",
//       name: "Demo Customer",
//       passwordHash: customerHash,
//       role: "CUSTOMER",
//       emailVerified: true,
//     },
//   });
//   console.log("✅ Customer created:", customer.email);

//   // ── Wheelchairs ─────────────────────────────────────────────
//   const wheelchairs = [
//     {
//       name: "Standard Comfort Chair",
//       nameAr: "كرسي متحرك عادي مريح",
//       description:
//         "Our most popular model. Lightweight aluminum frame, foldable design, and padded armrests for all-day comfort.",
//       descriptionAr:
//         "أكثر نماذجنا شعبية. إطار ألومنيوم خفيف الوزن، قابل للطي، ومساند ذراعين مبطنة للراحة طوال اليوم.",
//       category: "STANDARD" as const,
//       pricePerDay: 25.0,
//       serialNumber: "STD-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600",
//       ],
//       features: ["Foldable", "Lightweight", "Padded Armrests"],
//       featuresAr: ["قابل للطي", "خفيف الوزن", "مساند ذراعين مبطنة"],
//       weight: 11.5,
//       maxLoad: 120,
//     },
//     {
//       name: "Electric Power Chair",
//       nameAr: "كرسي متحرك كهربائي",
//       description:
//         "Full-featured electric wheelchair with joystick control. Long battery life up to 20 hours. Perfect for extended mobility needs.",
//       descriptionAr:
//         "كرسي متحرك كهربائي متكامل الميزات مع تحكم بعصا التوجيه. عمر بطارية يصل إلى 20 ساعة.",
//       category: "ELECTRIC" as const,
//       pricePerDay: 75.0,
//       serialNumber: "ELC-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600",
//       ],
//       features: [
//         "Electric",
//         "Joystick Control",
//         "20hr Battery",
//         "USB Charging",
//       ],
//       featuresAr: ["كهربائي", "تحكم بعصا", "بطارية 20 ساعة", "شحن USB"],
//       weight: 28.0,
//       maxLoad: 150,
//     },
//     {
//       name: "Pediatric Wheelchair",
//       nameAr: "كرسي متحرك للأطفال",
//       description:
//         "Specially designed for children ages 3-12. Colorful, adjustable, and safe with anti-tip protection.",
//       descriptionAr:
//         "مصمم خصيصاً للأطفال من 3 إلى 12 سنة. ملوّن، قابل للتعديل، وآمن مع حماية من الانقلاب.",
//       category: "PEDIATRIC" as const,
//       pricePerDay: 30.0,
//       serialNumber: "PED-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",
//       ],
//       features: [
//         "For Children",
//         "Anti-Tip Protection",
//         "Adjustable",
//         "Colorful",
//       ],
//       featuresAr: ["للأطفال", "حماية من الانقلاب", "قابل للتعديل", "ملوّن"],
//       weight: 7.0,
//       maxLoad: 50,
//     },
//     {
//       name: "Bariatric Heavy-Duty Chair",
//       nameAr: "كرسي متحرك للأوزان الثقيلة",
//       description:
//         "Heavy-duty bariatric wheelchair with reinforced steel frame. Supports up to 250kg with extra-wide seat.",
//       descriptionAr:
//         "كرسي متحرك مقوّى بإطار فولاذي. يدعم حتى 250 كيلوغرام مع مقعد عريض.",
//       category: "BARIATRIC" as const,
//       pricePerDay: 45.0,
//       serialNumber: "BAR-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600",
//       ],
//       features: [
//         "Heavy Duty",
//         "250kg Capacity",
//         "Wide Seat",
//         "Reinforced Frame",
//       ],
//       featuresAr: [
//         "للأوزان الثقيلة",
//         "يتحمل 250 كجم",
//         "مقعد عريض",
//         "إطار مقوّى",
//       ],
//       weight: 22.0,
//       maxLoad: 250,
//     },
//     {
//       name: "Transport Companion Chair",
//       nameAr: "كرسي النقل والمرافقة",
//       description:
//         "Lightweight transport chair designed for caregiver use. Compact and easy to maneuver in tight spaces.",
//       descriptionAr:
//         "كرسي نقل خفيف الوزن مصمم للمرافق. مدمج وسهل المناورة في الأماكن الضيقة.",
//       category: "TRANSPORT" as const,
//       pricePerDay: 20.0,
//       serialNumber: "TRN-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600",
//       ],
//       features: [
//         "Ultra Lightweight",
//         "Compact",
//         "Easy Transport",
//         "Caregiver Friendly",
//       ],
//       featuresAr: ["خفيف للغاية", "مدمج", "سهل النقل", "مناسب للمرافق"],
//       weight: 8.5,
//       maxLoad: 100,
//     },
//     {
//       name: "Deluxe Reclining Chair",
//       nameAr: "كرسي مائل فاخر",
//       description:
//         "Premium reclining wheelchair with adjustable footrests and headrest. Ideal for post-surgery recovery.",
//       descriptionAr:
//         "كرسي متحرك مائل فاخر مع مساند للقدمين والرأس قابلة للتعديل. مثالي للتعافي بعد العمليات.",
//       category: "STANDARD" as const,
//       pricePerDay: 55.0,
//       serialNumber: "DLX-2024-001",
//       images: [
//         "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600",
//       ],
//       features: [
//         "Reclining",
//         "Adjustable Headrest",
//         "Premium Padding",
//         "Footrest Adjustable",
//       ],
//       featuresAr: [
//         "قابل للإمالة",
//         "مسند رأس قابل للتعديل",
//         "حشوة فاخرة",
//         "مسند قدم قابل للتعديل",
//       ],
//       weight: 14.0,
//       maxLoad: 130,
//     },
//   ];

//   for (const w of wheelchairs) {
//     await prisma.wheelchair.upsert({
//       where: { serialNumber: w.serialNumber },
//       update: {},
//       create: { ...w, status: "AVAILABLE" },
//     });
//   }
//   console.log(`✅ ${wheelchairs.length} wheelchairs seeded`);

//   // ── Invoice counter ─────────────────────────────────────────
//   await prisma.invoiceCounter.upsert({
//     where: { id: 1 },
//     update: {},
//     create: { id: 1, year: new Date().getFullYear(), count: 0 },
//   });

//   console.log("🎉 Seed complete!");
//   console.log("\n📝 Login credentials:");
//   console.log("  Admin:    admin@wheelrent.com  / Admin@12345");
//   console.log("  Customer: demo@wheelrent.com   / Customer@123");
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(() => prisma.$disconnect());
