import prisma from "../db.js";
import { createShopifyGraphQLClient } from "../utils/shopify.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

/**
 * Classify gender category using OpenAI (more reliable than regex)
 */
async function classifyGenderWithAI(
  title: string,
  handle: string,
  description: string,
  productTitles: string | null
): Promise<string> {
  try {
    const context = `
Collection Title: ${title}
Handle: ${handle}
Description: ${description || "None"}
Sample Products: ${productTitles?.split(',').slice(0, 5).join(', ') || "None"}
`.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a gender classifier for e-commerce collections. Respond with ONLY one word: 'men', 'women', 'unisex', or 'unknown'. Base your classification on the collection name, description, and sample products."
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const classification = response.choices[0]?.message?.content?.toLowerCase().trim() || "unknown";

    // Validate response
    if (["men", "women", "unisex", "unknown"].includes(classification)) {
      return classification;
    }

    return "unknown";
  } catch (error) {
    console.error("[Gender Classification] OpenAI error:", error);
    // Fallback to unknown on error
    return "unknown";
  }
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
    disabled: 0,
  };

  // Get all existing collection IDs from Shopify
  const shopifyCollectionIds = new Set(
    shopifyCollections.map((sc) => sc.id.replace("gid://shopify/Collection/", ""))
  );

  for (const sc of shopifyCollections) {
    const shopifyId = sc.id.replace("gid://shopify/Collection/", "");
    const descriptionText = cleanDescription(sc.descriptionHtml);
    const isExcludedSale = isSaleCollection(sc.title, sc.handle);

    // Extract product titles for AI context (up to 50 products)
    const productTitles = sc.products?.edges
      ?.map((edge: any) => edge.node.title)
      .filter(Boolean)
      .join(', ') || null;

    // Classify gender using AI
    const genderCategory = await classifyGenderWithAI(
      sc.title,
      sc.handle,
      descriptionText,
      productTitles
    );

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
        // Update if changed OR if gender classification differs
        if (
          existing.title !== sc.title ||
          existing.descriptionText !== descriptionText ||
          existing.productTitles !== productTitles ||
          existing.handle !== sc.handle ||
          existing.genderCategory !== genderCategory
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
          console.log(`[Collection Sync] Updated gender for "${sc.title}": ${genderCategory}`);
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

  // Detect and disable collections that no longer exist in Shopify (broken links)
  const dbCollections = await prisma.collection.findMany({
    where: {
      shopId,
      isEnabled: true,
    },
    select: {
      id: true,
      shopifyCollectionId: true,
      title: true,
    },
  });

  const disabledCollectionIds: string[] = [];

  for (const dbCollection of dbCollections) {
    if (!shopifyCollectionIds.has(dbCollection.shopifyCollectionId)) {
      // Collection no longer exists in Shopify - disable it
      await prisma.collection.update({
        where: { id: dbCollection.id },
        data: { isEnabled: false },
      });
      disabledCollectionIds.push(dbCollection.id);
      results.disabled++;
      console.log(`[Collection Sync] Disabled deleted collection: "${dbCollection.title}"`);
    }
  }

  // Clean up edges pointing to disabled collections
  if (disabledCollectionIds.length > 0) {
    const deletedEdges = await prisma.edge.deleteMany({
      where: {
        OR: [
          { sourceCollectionId: { in: disabledCollectionIds } },
          { targetCollectionId: { in: disabledCollectionIds } },
        ],
      },
    });
    console.log(`[Collection Sync] Cleaned up ${deletedEdges.count} edges pointing to disabled collections`);
  }

  return results;
}
