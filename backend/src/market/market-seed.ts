import { DataSource } from "typeorm";
import { MarketCategory } from "./market-category.entity";
import { MarketSubcategory } from "./market-subcategory.entity";
import { Product, ProductStatus } from "../products/product.entity";

/**
 * ── MARKET CATALOG CONTENT ──────────────────────────────────────────────────
 * Single source of truth for curated Market content. The project owner edits
 * this file (names, descriptions, youtubeUrl, prices, product images) and the
 * catalog is upserted on every backend boot — no frontend changes required.
 *
 * TO REPLACE PLACEHOLDER CONTENT:
 *   • Product image  → set `imageUrl` to a path under /uploads or a public URL.
 *   • YouTube video  → set `youtubeUrl` to the video's watch/embed URL.
 *   • Prices         → edit `floorPrice` / `exportPrice` (INR, kept separate).
 *
 * NOTE: values below are SAMPLE content so the application runs end-to-end;
 * they are not final owner content.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface MarketProductSeed {
  sku: string;
  name: string;
  description: string;
  floorPrice: number;
  exportPrice: number;
  stock: number;
  imageUrl?: string;
}

export interface MarketSubcategorySeed {
  slug: string;
  name: string;
  description: string;
  culturalInfo: string;
  youtubeUrl?: string;
  imageUrl?: string;
  products: MarketProductSeed[];
}

export interface MarketCategorySeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl?: string;
  subcategories: MarketSubcategorySeed[];
}

export const MARKET_CATALOG: MarketCategorySeed[] = [
  {
    slug: "sculpture",
    name: "Sculpture",
    tagline: "Metal, pith and patina — forms cast by hand",
    description:
      "Hand-formed sculpture traditions of India, from bell-metal Dhokra castings to the delicate carved reliefs of Shola pith.",
    subcategories: [
      {
        slug: "dhokra-art",
        name: "Dhokra Art",
        description:
          "Dhokra is a 4,000-year-old non-ferrous metal casting tradition using the lost-wax technique, practiced by artisan families across Chhattisgarh, West Bengal and Odisha. Every piece is cast in a one-time clay mould, so no two works are identical.",
        culturalInfo:
          "Dhokra artisans descend from the Dokra Damar nomadic metal-smith communities. Work travels through generations: the wax model is built by hand over a clay core, encased, and molten bell metal replaces the wax — a craft recognised as a Geographical Indication in several regions.",
        youtubeUrl: "",
        products: [
          {
            sku: "DHOKRA-001",
            name: "Dhokra Standing Elephant",
            description:
              "Cast in solid bell metal with the classic coiled-wax texture, this standing elephant is a traditional symbol of strength and household blessing.",
            floorPrice: 2500,
            exportPrice: 4500,
            stock: 5,
          },
          {
            sku: "DHOKRA-002",
            name: "Dhokra Tribal Dancer Figurine",
            description:
              "A lost-wax casting of a tribal dancer mid-step, wrapped in the characteristic spiral filigree of Dhokra work.",
            floorPrice: 3200,
            exportPrice: 5800,
            stock: 4,
          },
          {
            sku: "DHOKRA-003",
            name: "Dhokra Oil Lamp (Diya Stand)",
            description:
              "A ceremonial bell-metal lamp with ritual figurines around the rim, cast entirely by hand in the traditional Dhokra way.",
            floorPrice: 1800,
            exportPrice: 3400,
            stock: 6,
          },
        ],
      },
      {
        slug: "shola-pith-art",
        name: "Shola Pith Art",
        description:
          "Shola pith — the light, cork-like core of the Aeschynomene aspera reed — is carved into impossibly fine sculptural relief. Bengal's artisans have shaped it for temple ritual and wedding ornament for centuries.",
        culturalInfo:
          "Shola artists, called Malakars, traditionally supplied ritual headgear and temple decoration in Bengal. The reed pith is cut with a small knife into crisp, snow-white filigree that weighs almost nothing yet lasts generations when kept dry.",
        youtubeUrl: "",
        products: [
          {
            sku: "SHOLA-001",
            name: "Shola Pith Temple Panel",
            description:
              "A hand-carved shola pith relief panel depicting a temple gateway, layered in fine white filigree detail.",
            floorPrice: 1500,
            exportPrice: 2900,
            stock: 7,
          },
          {
            sku: "SHOLA-002",
            name: "Shola Pith Bridal Mukut (Crown)",
            description:
              "The traditional Bengali wedding crown carved from shola reed, ornamented with delicate geometric openwork.",
            floorPrice: 900,
            exportPrice: 1800,
            stock: 10,
          },
          {
            sku: "SHOLA-003",
            name: "Shola Pith Boat Procession",
            description:
              "A ceremonial boat procession carved entirely from shola pith — figures, oars and sails in miniature white relief.",
            floorPrice: 2200,
            exportPrice: 4100,
            stock: 5,
          },
        ],
      },
    ],
  },
  {
    slug: "outfits",
    name: "Outfits",
    tagline: "Cloth as storytelling — woven and painted heritage",
    description:
      "Wearable heritage: garments and drapes made with hands, brushes and looms, carrying centuries of iconography.",
    subcategories: [
      {
        slug: "pattachitra-saree",
        name: "Pattachitra Saree",
        description:
          "Pattachitra — literally 'cloth painting' — is the ancient narrative scroll art of Odisha and Bengal, now painted onto silk sarees. Mythological episodes, temple motifs and floral borders are hand-drawn with natural pigments.",
        culturalInfo:
          "Pattachitra painters, the Chitrakars, follow iconographic canons laid down centuries ago; every saree carries scenes from epics like the Ramayana, framed by the craft's signature bold outlines and earthy red, black and yellow palette.",
        youtubeUrl: "",
        products: [
          {
            sku: "PATTA-001",
            name: "Pattachitra Ramayana Silk Saree",
            description:
              "Hand-painted silk saree narrating a Ramayana episode in the classic Pattachitra palette, with hand-drawn temple borders.",
            floorPrice: 6500,
            exportPrice: 11000,
            stock: 3,
          },
          {
            sku: "PATTA-002",
            name: "Pattachitra Lotus Motif Saree",
            description:
              "A pure silk drape painted with the signature Pattachitra lotus and elephant motifs — wearable scroll art.",
            floorPrice: 5200,
            exportPrice: 9200,
            stock: 4,
          },
          {
            sku: "PATTA-003",
            name: "Pattachitra Village Life Saree",
            description:
              "Everyday village scenes rendered in natural pigment on tussar silk — festival processions, paddy fields and ponds.",
            floorPrice: 4800,
            exportPrice: 8600,
            stock: 5,
          },
        ],
      },
    ],
  },
];

/**
 * Idempotent upsert of the curated market catalog. Runs on every backend boot
 * (config file is the source of truth), so owner edits to this file propagate
 * without touching the database by hand.
 */
export async function seedMarketCatalog(ds: DataSource): Promise<void> {
  try {
    const categoryRepo = ds.getRepository(MarketCategory);
    const subcategoryRepo = ds.getRepository(MarketSubcategory);
    const productRepo = ds.getRepository(Product);

    for (const [catIndex, catSeed] of MARKET_CATALOG.entries()) {
      let category = await categoryRepo.findOne({ where: { slug: catSeed.slug } });
      if (!category) {
        category = categoryRepo.create({ slug: catSeed.slug });
      }
      categoryRepo.merge(category, {
        name: catSeed.name,
        tagline: catSeed.tagline,
        description: catSeed.description,
        imageUrl: catSeed.imageUrl ?? null,
        sortOrder: catIndex,
      });
      await categoryRepo.save(category);

      for (const [subIndex, subSeed] of catSeed.subcategories.entries()) {
        let subcategory = await subcategoryRepo.findOne({ where: { slug: subSeed.slug } });
        if (!subcategory) {
          subcategory = subcategoryRepo.create({ slug: subSeed.slug });
        }
        subcategoryRepo.merge(subcategory, {
          categoryId: category.id,
          name: subSeed.name,
          description: subSeed.description,
          culturalInfo: subSeed.culturalInfo,
          youtubeUrl: subSeed.youtubeUrl ?? null,
          imageUrl: subSeed.imageUrl ?? null,
          sortOrder: subIndex,
        });
        await subcategoryRepo.save(subcategory);

        for (const prodSeed of subSeed.products) {
          let product = await productRepo.findOne({ where: { sku: prodSeed.sku } });
          if (!product) {
            product = productRepo.create({
              sku: prodSeed.sku,
              status: ProductStatus.PUBLISHED,
              currency: "INR",
              aiProcessed: false,
            });
          }
          productRepo.merge(product, {
            title: prodSeed.name,
            description: prodSeed.description,
            category: catSeed.name,
            craft: subSeed.name,
            subcategoryId: subcategory.id,
            floorPrice: prodSeed.floorPrice,
            exportPrice: prodSeed.exportPrice,
            stock: prodSeed.stock,
            thumbnailUrl: prodSeed.imageUrl ?? null,
            priceMin: prodSeed.floorPrice,
            priceMax: prodSeed.exportPrice,
          });
          await productRepo.save(product);
        }
      }
    }
    console.log("🏛️  Market catalog upserted (categories → subcategories → products)");
  } catch (err: any) {
    console.error("❌ Market catalog seed failed:", err.message);
  }
}
