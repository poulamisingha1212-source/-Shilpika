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
 * Product images live in backend/public/assets/market/ and are referenced by
 * their /assets/market/… path.
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
    tagline: "Metal, pith and patina — forms cast and carved by hand",
    description:
      "Hand-formed sculpture traditions of India, from bell-metal Dhokra castings to the delicate carved reliefs of Shola pith.",
    imageUrl: "/assets/market/cat-dhokra.jpg",
    subcategories: [
      {
        slug: "dhokra-art",
        name: "Dhokra Art",
        description:
          "Dokra (or Dhokra) art is an ancient non-ferrous metal casting tradition that dates back over 4,000 years to the Indus Valley Civilization. Artisans build a clay core, wrap it in thin beeswax threads for intricate patterns, cover it in another layer of clay, melt out the wax, and pour molten brass or bell metal into the cavity — the same lost-wax (cire perdue) technique their ancestors used four millennia ago.",
        culturalInfo:
          "The earliest and most iconic evidence of this craft is the bronze “Dancing Girl” figurine recovered from Mohenjo-daro — lost-wax casting as practised by Dokra artisans today.\n\nThe term “Dokra” comes from the Dhokra Damar tribes, a traditional nomadic metalsmith community that originally lived in West Bengal and travelled across central and eastern India. As the tribes migrated over centuries, they settled in pockets across modern-day West Bengal, Odisha, Chhattisgarh, Jharkhand, Madhya Pradesh, and Telangana, passing down the secrets of the craft through generations.\n\nBecause the outer clay mould must be broken open to reveal the hardened metal piece, every mould is single-use — no two Dokra items can ever be identical.",
        youtubeUrl: "https://youtu.be/XOvusvnTO8Q",
        imageUrl: "/assets/market/cat-dhokra.jpg",
        products: [
          {
            sku: "DHOKRA-001",
            name: "Dhokra Elephant with Rider",
            description:
              "A solid bell-metal elephant cast in the classic Dhokra lost-wax tradition — crowned with a ritual finial, draped in hand-worked detail, and carrying a trident-bearing rider. A guardian piece for the home.",
            floorPrice: 2500,
            exportPrice: 4500,
            stock: 5,
            imageUrl: "/assets/market/DHOKRA-001.jpg",
          },
          {
            sku: "DHOKRA-002",
            name: "Dhokra Owl Figurine",
            description:
              "The tribal owl of wisdom, cast in brass with the characteristic coiled-wax lattice of Dhokra work. Each casting is one of a kind — the mould is broken to release the metal.",
            floorPrice: 1800,
            exportPrice: 3400,
            stock: 6,
            imageUrl: "/assets/market/DHOKRA-002.jpg",
          },
          {
            sku: "DHOKRA-003",
            name: "Dhokra Horse Pair",
            description:
              "A pair of cast brass horses in the Dhokra idiom — votive horses of the kind offered at village shrines across central India, standing on hand-drawn legs with patterned bodies.",
            floorPrice: 3200,
            exportPrice: 5800,
            stock: 4,
            imageUrl: "/assets/market/DHOKRA-003.jpg",
          },
        ],
      },
      {
        slug: "shola-pith-art",
        name: "Shola Pith Art",
        description:
          "Sholapith is a traditional, eco-friendly craft from Eastern India — deeply rooted in the marshy wetlands of West Bengal, Assam, and Odisha — where artisans sculpt the milky-white, spongy core of the Aeschynomene aspera plant into delicate works of art. The pith is cut with a small knife into crisp, snow-white filigree that weighs almost nothing yet holds detail no other material can.",
        culturalInfo:
          "Sholapith does not have a single recorded moment of historical origin, but it is deeply woven into regional ritual and ceremonial life. Folklore credits the divine architect Vishwakarma — or Lord Shiva himself — with creating the first Sholapith craft to fashion pure white crowns (mukut) and garlands for the wedding of Shiva and Parvati.\n\nThe artisans who practise this craft are known as Malakars — literally “garland makers” — a title passed down through generations, tracing their community lineage back to these mythical origins.\n\nHistorically, Sholapith was reserved for sacred and auspicious occasions. It became indispensable for traditional Bengali wedding headgear like the groom’s topor and the bride’s mukut, and for delicate floral ornaments. The craft reached grand heights during community celebrations like Durga Puja, where artisans in districts like Murshidabad, Nadia, and Bardhaman created magnificent white backdrops known as sholar saj or daaker saaj.\n\nDuring the British Empire, the lightweight and heat-insulating qualities of shola pith gained global fame: it was used to manufacture the iconic “pith helmet” (shola topee) worn by travellers across tropical and subtropical regions of Asia and Africa.",
        youtubeUrl: "https://youtu.be/qcZR9lj3ic4",
        imageUrl: "/assets/market/cat-shola.jpg",
        products: [
          {
            sku: "SHOLA-001",
            name: "Shola Pith Royal Elephant with Howdah",
            description:
              "A milky-white shola pith elephant bearing a carved royal howdah — its canopy, rider and trappings all shaped by hand from the spongy reed core in fine ceremonial detail.",
            floorPrice: 3200,
            exportPrice: 5800,
            stock: 5,
            imageUrl: "/assets/market/SHOLA-001.jpg",
          },
          {
            sku: "SHOLA-002",
            name: "Shola Pith Peacock Panel",
            description:
              "A peacock with a fully fanned tail rendered in layered white pith filigree on a deep ground — petals, plumage and scrolls each cut individually by the Malakar’s knife.",
            floorPrice: 1500,
            exportPrice: 2900,
            stock: 7,
            imageUrl: "/assets/market/SHOLA-002.jpg",
          },
          {
            sku: "SHOLA-003",
            name: "Shola Pith Durga Panel",
            description:
              "Goddess Durga’s serene face framed in the layered crown-work of a shola pith tableau — the craft’s most devotional expression, presented in a protective display case.",
            floorPrice: 2200,
            exportPrice: 4100,
            stock: 5,
            imageUrl: "/assets/market/SHOLA-003.png",
          },
        ],
      },
    ],
  },
  {
    slug: "outfits",
    name: "Outfits",
    tagline: "Cloth as storytelling — painted heritage you can wear",
    description:
      "Wearable heritage: garments and drapes made with hands, brushes and looms, carrying centuries of iconography.",
    imageUrl: "/assets/market/cat-pattachitra.jpg",
    subcategories: [
      {
        slug: "pattachitra-saree",
        name: "Pattachitra Saree",
        description:
          "Pattachitra sarees originate from a traditional 12th-century cloth-painting art form tied to the Jagannath Temple in Puri, Odisha, and parts of West Bengal. The word combines the Sanskrit terms “Patta” (cloth) and “Chitra” (picture) — a picture painted on cloth. Originally painted on standalone cloth canvases or palm leaves, the intricate storytelling art naturally transitioned onto handloom cotton and silk sarees as a wearable canvas.",
        culturalInfo:
          "Temple roots: the art form began around the 12th century AD in Odisha, closely linked to the worship of Lord Jagannath. Hereditary painters, known as Chitrakars, created devotional scroll paintings and ritual items for pilgrims.\n\nHeartland: the village of Raghurajpur in Odisha remains the main hub, where families pass down these specialized painting techniques through generations.\n\nDesigns feature mythological episodes from the Ramayana and Mahabharata, tales of Lord Krishna, and traditional motifs like the Tree of Life. Artists traditionally use organic, mineral, and vegetable dyes — predominantly red, yellow, indigo, white, and black — giving the fabric rich, long-lasting earth tones. Painting a single saree is a slow, meticulous process requiring fine brushwork, bold black outlines, and stylized figures with distinct rounded eyes and elaborate ornaments.",
        youtubeUrl: "https://youtu.be/AWwwK5_Jia4",
        imageUrl: "/assets/market/cat-pattachitra.jpg",
        products: [
          {
            sku: "PATTA-001",
            name: "Pattachitra Krishna Rasa Silk Saree",
            description:
              "Deep maroon silk hand-painted with a Krishna rasa procession — ceremonial umbrellas, dancers and villagers rendered in the craft’s natural red, green and gold palette with bold black outlines.",
            floorPrice: 6500,
            exportPrice: 11000,
            stock: 3,
            imageUrl: "/assets/market/PATTA-001.png",
          },
          {
            sku: "PATTA-002",
            name: "Pattachitra Jagannath Boat Silk Saree",
            description:
              "A black silk canvas carrying the famous Pattachitra boat episode — the white swan-vessel, temple towers and costumed figures in brilliant natural pigment, framed by an ornate border.",
            floorPrice: 5200,
            exportPrice: 9200,
            stock: 4,
            imageUrl: "/assets/market/PATTA-002.png",
          },
          {
            sku: "PATTA-003",
            name: "Pattachitra Cow Herd Silk Saree",
            description:
              "Krishna among the cows beneath flowering trees — a black-and-teal silk saree where every cow, tree and village figure is individually painted by hand in traditional mineral dyes.",
            floorPrice: 4800,
            exportPrice: 8600,
            stock: 5,
            imageUrl: "/assets/market/PATTA-003.png",
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
