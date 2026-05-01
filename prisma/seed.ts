import "dotenv/config";
import { PrismaClient, type WheelchairCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function getSeedValue(key: string, fallback?: string): string {
  const value = process.env[key]?.trim();
  if (value) {
    return value;
  }

  if (fallback) {
    console.warn(`[SEED] ${key} is not set. Using placeholder value.`);
    return fallback;
  }

  throw new Error(`[SEED] ${key} is not set and no fallback provided.`);
}

const wheelchairs: Array<{
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: WheelchairCategory;
  pricePerDay: number;
  serialNumber: string;
  images: string[];
  features: string[];
  featuresAr: string[];
  weight: number;
  maxLoad: number;
}> = [
  {
    name: "Standard Comfort Chair",
    nameAr: "كرسي مريح قياسي",
    description:
      "Lightweight foldable wheelchair with padded armrests for everyday comfort.",
    descriptionAr:
      "كرسي متحرك خفيف وقابل للطي مع مساند مبطنة للاستخدام اليومي.",
    category: "STANDARD",
    pricePerDay: 25,
    serialNumber: "STD-2024-001",
    images: ["https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600"],
    features: ["Foldable", "Lightweight", "Padded Armrests"],
    featuresAr: ["قابل للطي", "خفيف الوزن", "مساند مبطنة"],
    weight: 11.5,
    maxLoad: 120,
  },
  {
    name: "Electric Power Chair",
    nameAr: "كرسي كهربائي",
    description:
      "Electric wheelchair with joystick control and long battery life for extended mobility.",
    descriptionAr: "كرسي كهربائي بعصا تحكم وبطارية طويلة للاستخدام الممتد.",
    category: "ELECTRIC",
    pricePerDay: 75,
    serialNumber: "ELC-2024-001",
    images: [
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600",
    ],
    features: ["Electric", "Joystick Control", "20hr Battery", "USB Charging"],
    featuresAr: ["كهربائي", "عصا تحكم", "بطارية 20 ساعة", "شحن USB"],
    weight: 28,
    maxLoad: 150,
  },
  {
    name: "Pediatric Wheelchair",
    nameAr: "كرسي للأطفال",
    description:
      "Adjustable pediatric wheelchair with anti-tip protection and child-friendly fit.",
    descriptionAr: "كرسي أطفال قابل للتعديل مع حماية من الانقلاب ومقاس مناسب.",
    category: "PEDIATRIC",
    pricePerDay: 30,
    serialNumber: "PED-2024-001",
    images: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",
    ],
    features: ["For Children", "Anti-Tip Protection", "Adjustable", "Colorful"],
    featuresAr: ["للأطفال", "حماية من الانقلاب", "قابل للتعديل", "ملون"],
    weight: 7,
    maxLoad: 50,
  },
  {
    name: "Bariatric Heavy-Duty Chair",
    nameAr: "كرسي للأوزان الثقيلة",
    description:
      "Reinforced heavy-duty wheelchair with a wide seat and high weight capacity.",
    descriptionAr: "كرسي قوي بمقعد عريض وقدرة تحمل عالية للأوزان الثقيلة.",
    category: "BARIATRIC",
    pricePerDay: 45,
    serialNumber: "BAR-2024-001",
    images: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600",
    ],
    features: ["Heavy Duty", "250kg Capacity", "Wide Seat", "Reinforced Frame"],
    featuresAr: ["قوي", "يتحمل 250 كجم", "مقعد عريض", "هيكل معزز"],
    weight: 22,
    maxLoad: 250,
  },
  {
    name: "Transport Companion Chair",
    nameAr: "كرسي نقل",
    description:
      "Compact transport chair designed for caregivers and tight indoor spaces.",
    descriptionAr: "كرسي نقل مدمج مناسب للمرافقين وللمساحات الضيقة.",
    category: "TRANSPORT",
    pricePerDay: 20,
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
    featuresAr: ["خفيف جدا", "مدمج", "سهل النقل", "مناسب للمرافق"],
    weight: 8.5,
    maxLoad: 100,
  },
  {
    name: "Deluxe Reclining Chair",
    nameAr: "كرسي فاخر قابل للإمالة",
    description:
      "Premium reclining wheelchair with adjustable headrest and footrests.",
    descriptionAr:
      "كرسي فاخر قابل للإمالة مع مسند رأس ومساند قدم قابلة للتعديل.",
    category: "STANDARD",
    pricePerDay: 55,
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
    weight: 14,
    maxLoad: 130,
  },
];

async function main() {
  // console.log("[SEED] Seeding database...");

  const adminEmail = getSeedValue("ADMIN_EMAIL");
  const adminPassword = getSeedValue("ADMIN_PASSWORD");
  const adminName = getSeedValue("ADMIN_NAME", "Admin User");

  const adminHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  // console.log("[SEED] Admin user ready", { email: admin.email });

  for (const wheelchair of wheelchairs) {
    await prisma.wheelchair.upsert({
      where: { serialNumber: wheelchair.serialNumber },
      update: {},
      create: { ...wheelchair, status: "AVAILABLE" },
    });
  }

  // console.log("[SEED] Wheelchairs ready", { count: wheelchairs.length });

  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: { year: new Date().getFullYear() },
    create: { id: 1, year: new Date().getFullYear(), count: 0 },
  });

  // console.log("[SEED] Seed complete");
}

main()
  .catch((error) => {
    console.error("[SEED ERROR]", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
