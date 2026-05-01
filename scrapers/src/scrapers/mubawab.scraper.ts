import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type {
  ScraperConfig,
  ScrapedProperty,
  ScrapeResult,
} from "../interfaces/scraper.interface.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MubawabScraper - Scraper class for extracting sale apartment listings from mubawab.tn
 * Only scrapes apartments for sale (no "neuf", "louer", or vacation/seasonal).
 */
export class MubawabScraper {
  private browser: Browser | null = null;
  private config: ScraperConfig;

  // Only sale apartments (no vacation, neuf, rental)
  private readonly CATEGORIES = [
    {
      url: "sc/appartements-a-vendre",
      type: "APARTMENT",
      transaction: "SALE",
      name: "Appartements à Vendre",
    },
  ];

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      source: "mubawab",
      maxPages: config.maxPages || 10,
      delayMin: config.delayMin || 2000,
      delayMax: config.delayMax || 5000,
      userAgent:
        config.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomDelay(): Promise<void> {
    const delay =
      Math.floor(
        Math.random() * (this.config.delayMax! - this.config.delayMin!),
      ) + this.config.delayMin!;
    return this.delay(delay);
  }

  private parsePrice(text: string): number | undefined {
    if (!text) return undefined;
    const cleaned = text
      .replace(/dt/gi, "")
      .replace(/\/mois/gi, "")
      .replace(/(dinars?|tnd)/gi, "")
      .replace(/[,\.\s\xa0]+/g, "")
      .trim();
    if (!/^\d+$/.test(cleaned)) return undefined;
    const num = parseInt(cleaned, 10);
    if (num >= 900 && num <= 100000000) {
      return num;
    }
    return undefined;
  }

  private extractSize(text: string): number | undefined {
    if (!text) return undefined;
    const sizeMatch = text.match(/(\d+([\.,]\d+)?)\s*m[²2]/i);
    if (sizeMatch) {
      const raw = sizeMatch[1].replace(",", "."); // handle 108,5 m2
      return Math.round(parseFloat(raw));
    }
    return undefined;
  }

  private extractBedrooms(text: string): number | undefined {
    if (!text) return undefined;
    if (/studio/i.test(text)) return 0;
    const bedroomMatch = text.match(
      /(\d+)\s*(chambre|bedroom|bed|chambres|pi[eè]ces?)/i,
    );
    if (bedroomMatch) {
      return parseInt(bedroomMatch[1], 10);
    }
    return undefined;
  }

  private parseCoordinates(text: string | undefined): {
    latitude?: number;
    longitude?: number;
  } {
    if (!text) return {};
    const patterns = [
      /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
      /[?&](?:q|query|ll|sll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
      /(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
      /data-lat="(-?\d{1,2}\.\d+)".*data-lng="(-?\d{1,3}\.\d+)"/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Math.abs(latitude) <= 90 &&
          Math.abs(longitude) <= 180
        ) {
          return { latitude, longitude };
        }
      }
    }
    return {};
  }

  private filterRealImages(images: string[]): string[] {
    return [
      ...new Set(
        images.filter((src) => {
          if (!src || src.length < 16) return false;
          const lower = src.toLowerCase();
          return (
            !lower.includes("logo") &&
            !lower.includes("banner") &&
            !lower.includes("icon") &&
            !lower.includes("placeholder") &&
            !lower.includes("avatar") &&
            !lower.includes("sprite") &&
            !lower.includes("default") &&
            !lower.includes("noimage") &&
            src.startsWith("http")
          );
        }),
      ),
    ];
  }

  private async scrapePropertyDetails(
    page: Page,
    url: string,
  ): Promise<Partial<ScrapedProperty> | null> {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await this.delay(1500);

      const details = await page.evaluate(() => {
        const result: any = {};

        // price
        const priceElement =
          document.querySelector(
            '[class*="price"], .price-box, [data-testid="price"]',
          ) || document.querySelector(".priceTag");
        if (priceElement) {
          result.priceRaw = priceElement.textContent?.trim() || "";
        }

        // Features
        const features = Array.from(
          document.querySelectorAll(
            '[class*="feature"], [class*="characteristic"], li, .detail-item',
          ),
        );
        const allText = features
          .map((f) => f.textContent?.trim() || "")
          .join(" ");
        result.allFeatures = allText;

        // Description
        const descElement =
          document.querySelector(
            '[class*="description"], [class*="desc"], .property-description',
          ) || document.querySelector(".listingTit");
        if (descElement) {
          result.description = descElement.textContent
            ?.trim()
            .substring(0, 950);
        }

        // Images
        const images: string[] = [];
        const imgElements = document.querySelectorAll(
          'img[src*="mubawab"], img[data-src*="mubawab"], .gallery img, .slider img, .photoMask img',
        );
        imgElements.forEach((img) => {
          const src =
            img.getAttribute("src") || img.getAttribute("data-src") || "";
          if (src && src.startsWith("http")) {
            images.push(src);
          }
        });
        result.images = images;

        // Location details
        const locationElement =
          document.querySelector(
            '[class*="location"], [class*="address"], .breadcrumb',
          ) ||
          document.querySelector(".listingH3") ||
          document.querySelector(".contactBar");
        if (locationElement) {
          result.location = locationElement.textContent?.trim();
        }

        // coordinates hint
        result.coordinateHint = Array.from(
          document.querySelectorAll(
            "a[href], iframe[src], [data-lat], [data-lng], [data-lon]",
          ),
        )
          .map(
            (el) =>
              el.getAttribute("href") ||
              el.getAttribute("src") ||
              `${el.getAttribute("data-lat") || ""},${
                el.getAttribute("data-lng") || el.getAttribute("data-lon") || ""
              }` ||
              "",
          )
          .join(" ");

        // Phone
        const phoneElement = document.querySelector(
          '[class*="phone"], [href^="tel:"], .contactPhoneClick',
        );
        if (phoneElement) {
          result.contact_phone =
            phoneElement.textContent?.trim() ||
            phoneElement.getAttribute("href")?.replace("tel:", "");
        }

        // Title
        const titleElement =
          document.querySelector(".listingTit") ||
          document.querySelector("h2.listingTit");
        if (titleElement) {
          result.title = titleElement.textContent
            ?.trim()
            .replace(/\s+/g, " ")
            .substring(0, 180);
        }

        return result;
      });

      // Post-process and transformations
      if (details.priceRaw) {
        const parsedPrice = this.parsePrice(details.priceRaw);
        if (parsedPrice) details.price = parsedPrice;
      }
      if (details.allFeatures) {
        const size = this.extractSize(details.allFeatures);
        if (size) details.size = size;
        const bedrooms = this.extractBedrooms(details.allFeatures);
        if (bedrooms !== undefined) details.bedrooms = bedrooms;
        const bathroomMatch = details.allFeatures.match(
          /(\d+)\s*(salle.*bain|bathroom|sdb|baths?)/i,
        );
        if (bathroomMatch) {
          details.bathrooms = parseInt(bathroomMatch[1], 10);
        }
      }
      if (details.location) {
        const locationParts = details.location
          .split(/[>\/,]/)
          .map((p: string) => p.trim())
          .filter(Boolean);
        if (locationParts.length >= 2) {
          details.governorate = locationParts[1];
        }
        if (locationParts.length >= 3) {
          details.delegation = locationParts[2];
        }
      }
      const parsedCoordinates = this.parseCoordinates(
        `${details.coordinateHint || ""} ${details.location || ""} ${
          details.allFeatures || ""
        }`,
      );
      if (parsedCoordinates.latitude !== undefined)
        details.latitude = parsedCoordinates.latitude;
      if (parsedCoordinates.longitude !== undefined)
        details.longitude = parsedCoordinates.longitude;

      if (details.images) {
        details.images = this.filterRealImages(details.images).slice(0, 10);
        if (details.images.length === 0) {
          delete details.images;
        }
      }
      if (!details.title && details.description)
        details.title = details.description.substring(0, 100);

      return details;
    } catch (error) {
      console.error(`Error scraping details from ${url}:`, error);
      return null;
    }
  }

  async scrape(): Promise<ScrapeResult> {
    const startTime = new Date().toISOString();
    const errors: string[] = [];
    const properties: ScrapedProperty[] = [];
    const seenIds = new Set<string>();

    try {
      console.log("🚀 Starting Mubawab SALES scraper...");

      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await this.browser.newPage();
      await page.setUserAgent(this.config.userAgent!);
      await page.setViewport({ width: 1920, height: 1080 });

      for (const category of this.CATEGORIES) {
        console.log(`\n📂 Scraping ${category.name}...`);

        for (
          let pageNum = 1;
          pageNum <= (this.config.maxPages || 1);
          pageNum++
        ) {
          try {
            console.log(`   📄 Page ${pageNum}/${this.config.maxPages}...`);
            const url = `https://www.mubawab.tn/fr/${category.url}:p:${pageNum}`;
            await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
            await this.delay(2000);

            // Extract listing URLs (strict selectors for .listingTit > a)
            const listingUrls = await page.evaluate(() => {
              const urls: string[] = [];
              const regularLinks = Array.from(
                document.querySelectorAll("h2.listingTit > a"),
              );
              for (const a of regularLinks) {
                let href = a.getAttribute("href");
                if (
                  href &&
                  href.includes("/fr/") &&
                  /\/\d+($|[?#])/.test(href)
                ) {
                  urls.push(
                    href.startsWith("http")
                      ? href
                      : `https://www.mubawab.tn${href.split("?")[0]}`,
                  );
                }
              }
              return [...new Set(urls)];
            });

            console.log(`      Found ${listingUrls.length} listings`);
            for (let i = 0; i < listingUrls.length; i++) {
              const listingUrl = listingUrls[i];
              const listingId = listingUrl.match(/\/(\d+)(?:$|\?)/)?.[1] || "";

              if (!listingId) continue;
              if (seenIds.has(listingId)) {
                console.log(`      Skipping duplicate: ${listingId}`);
                continue;
              }
              seenIds.add(listingId);

              console.log(
                `      Scraping ${i + 1}/${listingUrls.length}: ${listingId}`,
              );
              try {
                const details = await this.scrapePropertyDetails(
                  page,
                  listingUrl,
                );

                if (details) {
                  const timestamp = new Date().toISOString();
                  const property: ScrapedProperty = {
                    source_url: listingUrl,
                    listing_id: listingId,
                    title:
                      details.title ||
                      details.description?.substring(0, 90) ||
                      "",
                    price: details.price,
                    size: details.size,
                    bedrooms: details.bedrooms,
                    bathrooms: details.bathrooms,
                    description: details.description,
                    images: details.images,
                    governorate: details.governorate,
                    delegation: details.delegation,
                    latitude: details.latitude,
                    longitude: details.longitude,
                    contact_phone: details.contact_phone,
                    source_website: "mubawab.tn",
                    scrape_timestamp: timestamp,
                    price_currency: "TND",
                    size_unit: "m2",
                    transaction_type: category.transaction,
                    property_type: category.type,
                  };
                  properties.push(property);
                }

                await this.delay(1000);
              } catch (detailError: any) {
                console.error(
                  `      Error scraping ${listingId}: ${detailError.message}`,
                );
                errors.push(
                  `Error scraping ${listingUrl}: ${detailError.message}`,
                );
              }
            }

            if (pageNum < (this.config.maxPages || 1)) {
              await this.randomDelay();
            }
          } catch (pageError: any) {
            const errorMsg = `Error scraping page ${pageNum} of ${category.name}: ${pageError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      // Save to file
      const endTime = new Date().toISOString();
      const now = new Date();
      const timestamp =
        now.toISOString().replace(/[:.]/g, "-").split("T")[0] +
        "_" +
        now.toISOString().replace(/[:.]/g, "").split("T")[1].slice(0, 6);

      const dataDir = path.join(__dirname, "../../data/bronze");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, `mubawab_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(properties, null, 2));

      console.log(`\n✅ Saved ${properties.length} properties to ${filePath}`);

      return {
        source: "mubawab",
        success: true,
        propertiesScraped: properties.length,
        errors,
        startTime,
        endTime,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime(),
        filePath,
      };
    } catch (error: any) {
      const endTime = new Date().toISOString();
      console.error("❌ Fatal error in Mubawab scraper:", error);
      return {
        source: "mubawab",
        success: false,
        propertiesScraped: properties.length,
        errors: [...errors, `Fatal error: ${error.message}`],
        startTime,
        endTime,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime(),
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log("Browser closed");
      }
    }
  }
}
