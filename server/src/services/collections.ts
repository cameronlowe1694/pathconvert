import prisma from "../db.js";
import { createShopifyGraphQLClient } from "../utils/shopify.js";

const SALE_KEYWORDS = [
  "sale",
  "sales",
  "clearance",
  "outlet",
  "offer",
  "offers",
  "deals",
  "discount",
  "promotions",
  "promo",
];

const GENDER_PATTERNS = {
  men: ["men", "mens", "man", "male", "him", "his", "guys", "gentleman"],
  women: [
    "women",
    "womens",
    "woman",
    "female",
    "her",
    "hers",
    "ladies",
    "girls",
  ],
};

/**
 * Classify gender category from title and handle
 */
function classifyGender(title: string, handle: string): string {
  const text = `${title} ${handle}`.toLowerCase();

  let menMatch = false;
  let womenMatch = false;

  for (const keyword of GENDER_PATTERNS.men) {
    if (text.includes(keyword)) {
      menMatch = true;
      break;
    }
  }

  for (const keyword of GENDER_PATTERNS.women) {
    if (text.includes(keyword)) {
      womenMatch = true;
      break;
    }
  }

  if (menMatch && !womenMatch) return "men";
  if (womenMatch && !menMatch) return "women";
  if (menMatch && womenMatch) return "unisex";

  return "unknown"; // Treat as unisex
}

/**
 * Check if collection is a sale collection
 */
function isSaleCollection(title: string, handle: string): boolean {
  const text = `${title} ${handle}`.toLowerCase();
  return SALE_KEYWORDS.some((keyword) => text.includes(keyword));
}

/**
 * Clean HTML description to plain text
 */
function cleanDescription(descriptionHtml: string | null): string {
  if (!descriptionHtml) return "";

  // Strip HTML tags
  let text = descriptionHtml.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Fetch all collections from Shopify Admin API
 */
export async function fetchCollectionsFromShopify(shop: string, accessToken: string) {
  const client = createShopifyGraphQLClient(shop, accessToken);
  const collections: any[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await client.request(`
      query getCollections($cursor: String) {
        collections(first: 250, after: $cursor) {
          edges {
            node {
              id
              handle
              title
              descriptionHtml
              updatedAt
              products(first: 50) {
                edges {
                  node {
                    title
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: { cursor },
    });

    const data = response.data as any;

    if (data?.collections?.edges) {
      collections.push(...data.collections.edges.map((edge: any) => edge.node));
    }

    hasNextPage = data?.collections?.pageInfo?.hasNextPage || false;
    cursor = data?.collections?.pageInfo?.endCursor || null;
  }

  return collections;
}

/**
 * Sync collections from Shopify to database
 */
export async function syncCollections(shopId: string, shop: string, accessToken: string) {
  const shopifyCollections = await fetchCollectionsFromShopify(shop, accessToken);

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const sc of shopifyCollections) {
    const shopifyId = sc.id.replace("gid://shopify/Collection/", "");
    const descriptionText = cleanDescription(sc.descriptionHtml);
    const genderCategory = classifyGender(sc.title, sc.handle);
    const isExcludedSale = isSaleCollection(sc.title, sc.handle);

    // Extract product titles for AI context (up to 50 products)
    const productTitles = sc.products?.edges
      ?.map((edge: any) => edge.node.title)
      .filter(Boolean)
      .join(', ') || null;

    try {
      const existing = await prisma.collection.findUnique({
        where: {
          shopId_shopifyCollectionId: {
            shopId,
            shopifyCollectionId: shopifyId,
          },
        },
      });

      if (existing) {
        // Update if changed
        if (
          existing.title !== sc.title ||
          existing.descriptionText !== descriptionText ||
          existing.productTitles !== productTitles ||
          existing.handle !== sc.handle
        ) {
          await prisma.collection.update({
            where: { id: existing.id },
            data: {
              title: sc.title,
              handle: sc.handle,
              descriptionText,
              productTitles,
              genderCategory,
              isExcludedSale,
              updatedAtShopify: new Date(sc.updatedAt),
            },
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        // Create new
        await prisma.collection.create({
          data: {
            shopId,
            shopifyCollectionId: shopifyId,
            handle: sc.handle,
            title: sc.title,
            descriptionText,
            productTitles,
            genderCategory,
            isExcludedSale,
            isEnabled: !isExcludedSale, // Disable sale collections by default
            updatedAtShopify: new Date(sc.updatedAt),
          },
        });
        results.created++;
      }
    } catch (error) {
      console.error(`Error syncing collection ${sc.handle}:`, error);
    }
  }

  return results;
}
