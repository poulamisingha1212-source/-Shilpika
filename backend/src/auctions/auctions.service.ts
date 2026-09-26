import { Injectable, Inject, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThanOrEqual, In } from "typeorm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AuctionSession, AuctionStatus } from "./auction-session.entity";
import { AuctionBid } from "./auction-bid.entity";
import { Product } from "../products/product.entity";

export const MIN_BID_INCREMENT = 500;
const ANTI_SNIPE_WINDOW_MS = 60_000;
const ANTI_SNIPE_EXTENSION_MS = 120_000;
const TARGET_LIVE_SESSIONS = 3;

// Artifact pool used to open fresh Nilaam sessions (matches the demo catalog)
const SESSION_POOL = [
  {
    title: "Antique Dokra Ritual Elephant",
    hindi: "प्राचीन डोकरा हाथी",
    artForm: "Dhra Dhokra (lost-wax brass)",
    img: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    lineage: "Dhokra foundry of Mayurbhanj · 3rd generation",
    reserve: 24000,
    openingBid: 27250,
  },
  {
    title: "Tanjore Painting, Gilded Panel",
    hindi: "तंजावर चित्रकला",
    artForm: "Tanjore (Mysore gesso work)",
    img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80",
    lineage: "Thanjavur studio lineage · 4th generation",
    reserve: 40000,
    openingBid: 34000,
  },
  {
    title: "Real Zari Banarasi, 1970s Heirloom",
    hindi: "असली ज़री की बनारसी",
    artForm: "Banarasi kadwa weaving",
    img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    lineage: "Ansari atelier archive piece",
    reserve: 60000,
    openingBid: 66000,
  },
];

const BOT_NAMES = ["Collector #4211", "Gallery Kensho", "Heritage Trust BLR", "Museum of Textiles", "Collector #0912", "Collector #7734"];

@Injectable()
export class AuctionsService {
  private listCache: { data: any; at: number } | null = null;
  private refreshing: Promise<any> | null = null;

  constructor(
    @InjectRepository(AuctionSession) private sessionRepo: Repository<AuctionSession>,
    @InjectRepository(AuctionBid) private bidRepo: Repository<AuctionBid>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  /**
   * List sessions for the Nilaam room. Closes expired sessions, keeps the demo
   * room alive by opening fresh sessions when fewer than TARGET_LIVE_SESSIONS
   * are live, and occasionally simulates a competing collector bid.
   * Responses are cached for a few seconds — remote DB round trips are ~1s each.
   */
  getSessions() {
    const TTL = 5000;
    if (this.listCache && Date.now() - this.listCache.at < TTL) return Promise.resolve(this.listCache.data);
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.refreshSessions()
      .then((data) => {
        this.listCache = { data, at: Date.now() };
        return data;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private async refreshSessions() {
    await Promise.all([this.closeExpired(), this.ensureLiveSessions(), this.maybeSimulateBids()]);

    const sessions = await this.sessionRepo.find({
      where: [{ status: AuctionStatus.LIVE }, { status: AuctionStatus.ENDED }],
      order: { status: "ASC", endsAt: "ASC" },
      take: 12,
    });

    const ids = sessions.map((s) => s.id);
    const bids = ids.length
      ? await this.bidRepo.find({ where: { sessionId: In(ids) }, order: { createdAt: "DESC" }, take: 200 })
      : [];

    return sessions.map((s) => ({
      ...s,
      bids: bids.filter((b) => b.sessionId === s.id).slice(0, 8),
    }));
  }

  async getSession(id: string) {
    await this.closeExpired([id]);
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException("Auction session not found");
    const bids = await this.bidRepo.find({ where: { sessionId: id }, order: { createdAt: "DESC" }, take: 8 });
    return { ...session, bids };
  }

  async placeBid(sessionId: string, bidder: string, amount: number, bidderId?: string) {
    await this.closeExpired([sessionId]);
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Auction session not found");
    if (session.status !== AuctionStatus.LIVE || new Date(session.endsAt).getTime() <= Date.now()) {
      throw new BadRequestException("This auction has closed.");
    }

    const minBid = Number(session.currentBid) + MIN_BID_INCREMENT;
    if (!amount || amount < minBid) {
      throw new BadRequestException(`Minimum bid is ₹${minBid}.`);
    }

    // Anti-sniping (FR 2.3.3): a bid inside the final minute extends the timer by 2 minutes
    const msLeft = new Date(session.endsAt).getTime() - Date.now();
    let extended = false;
    if (msLeft < ANTI_SNIPE_WINDOW_MS) {
      session.endsAt = new Date(new Date(session.endsAt).getTime() + ANTI_SNIPE_EXTENSION_MS);
      session.extensionCount += 1;
      extended = true;
    }

    const bid = this.bidRepo.create({ sessionId, bidder, bidderId, amount, isBot: false });
    await this.bidRepo.save(bid);

    session.currentBid = amount;
    session.bidCount += 1;
    await this.sessionRepo.save(session);

    this.logger.info("Auction bid placed", { sessionId, bidder, amount, extended, context: "AuctionsService" });
    this.listCache = null; // bid changes the room state immediately
    return { session: { ...session, currentBid: amount }, extended };
  }

  private async closeExpired(onlyIds?: string[]) {
    const where: any = { status: AuctionStatus.LIVE, endsAt: LessThan(new Date()) };
    if (onlyIds) where.id = In(onlyIds);
    const expired = await this.sessionRepo.find({ where });
    for (const s of expired) {
      s.status = AuctionStatus.ENDED;
      await this.sessionRepo.save(s);
    }
    if (expired.length) {
      this.logger.info(`Closed ${expired.length} expired auction session(s)`, { context: "AuctionsService" });
    }
  }

  /** Demo continuity: never let the Nilaam room go dead. */
  private async ensureLiveSessions() {
    const liveCount = await this.sessionRepo.count({ where: { status: AuctionStatus.LIVE, endsAt: MoreThanOrEqual(new Date()) } });
    for (let i = liveCount; i < TARGET_LIVE_SESSIONS; i++) {
      await this.openFreshSession(i);
    }
  }

  private async openFreshSession(offset: number) {
    // Prefer real published marketplace listings; fall back to the curated pool
    let fromProduct: AuctionSession | null = null;
    try {
      const published = await this.productRepo
        .createQueryBuilder("p")
        .leftJoin("p.artisan", "a")
        .addSelect(["a.id", "a.displayName"])
        .where("p.status = :status", { status: "published" })
        .orderBy("p.publishedAt", "DESC")
        .take(20)
        .getMany();
      if (published.length) {
        const product = published[Math.floor(Math.random() * published.length)];
        const reserve = Number(product.priceMin || 0) || 1000;
        const anchor = Number(product.priceMax || product.priceMin || reserve * 1.3);
        fromProduct = this.sessionRepo.create({
          productId: product.id,
          title: product.title,
          hindi: product.titleHindi || undefined,
          artForm: product.craft || product.category || "Handcrafted",
          img: product.thumbnailUrl || undefined,
          lineage: `${product.region || product.origin || "India"}${product.artisan?.displayName ? ` · ${product.artisan.displayName}` : ""}`,
          reserve,
          currentBid: Math.round(anchor * 0.9),
          bidCount: 0,
          status: AuctionStatus.LIVE,
          endsAt: new Date(Date.now() + (6 + offset * 3) * 60_000),
        });
      }
    } catch (e: any) {
      this.logger.warn(`Could not load published products for the auction pool: ${e.message}`, { context: "AuctionsService" });
    }

    const live = await this.sessionRepo.find({ where: { status: AuctionStatus.LIVE } });
    const usedTitles = new Set(live.map((s) => s.title));
    let poolItem: typeof SESSION_POOL[number] | null = null;
    let session: AuctionSession;
    if (fromProduct && !usedTitles.has(fromProduct.title)) {
      session = fromProduct;
    } else {
      let candidates = SESSION_POOL.filter((p) => !usedTitles.has(p.title));
      if (!candidates.length) candidates = SESSION_POOL;
      poolItem = candidates[Math.floor(Math.random() * candidates.length)];
      session = this.sessionRepo.create({
        ...poolItem,
        currentBid: poolItem.openingBid,
        bidCount: 0,
        status: AuctionStatus.LIVE,
        endsAt: new Date(Date.now() + (6 + offset * 3) * 60_000),
      });
    }
    const saved = await this.sessionRepo.save(session);

    // Seed a couple of credible opening bids
    const openingBid = Number(session.currentBid);
    const reserveFloor = Number(session.reserve);
    const seedBids = [openingBid, openingBid - 1500, openingBid - 2750].filter((a) => a > reserveFloor * 0.8);
    for (let i = 0; i < Math.min(2, seedBids.length); i++) {
      const bid = this.bidRepo.create({
        sessionId: saved.id,
        bidder: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
        amount: seedBids[i],
        isBot: true,
      });
      await this.bidRepo.save(bid);
    }
    session.bidCount = Math.min(2, seedBids.length);
    await this.sessionRepo.save(session);

    this.logger.info(`Nilaam session opened: ${session.title}`, { sessionId: saved.id, context: "AuctionsService" });
  }

  /** Occasional simulated collector bids so the room feels alive. */
  private async maybeSimulateBids() {
    if (Math.random() > 0.12) return;
    const live = await this.sessionRepo.find({ where: { status: AuctionStatus.LIVE, endsAt: MoreThanOrEqual(new Date()) } });
    if (!live.length) return;
    const session = live[Math.floor(Math.random() * live.length)];
    const amount = Number(session.currentBid) + MIN_BID_INCREMENT * (1 + Math.floor(Math.random() * 3));
    const bid = this.bidRepo.create({
      sessionId: session.id,
      bidder: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      amount,
      isBot: true,
    });
    await this.bidRepo.save(bid);
    session.currentBid = amount;
    session.bidCount += 1;
    await this.sessionRepo.save(session);
  }
}
