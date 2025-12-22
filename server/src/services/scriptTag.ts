import { createShopifyGraphQLClient } from '../utils/shopify.js';

/**
 * Install ScriptTag to auto-inject recommendation buttons on collection pages
 * This eliminates the need for users to manually add app blocks to their theme
 */
export async function installScriptTag(shop: string, accessToken: string): Promise<void> {
  const client = createShopifyGraphQLClient(shop, accessToken);

  // Check if script tag already exists
  const checkQuery = `
    query {
      scriptTags(first: 10) {
        edges {
          node {
            id
            src
          }
        }
      }
    }
  `;

  const checkResponse = await client.request(checkQuery);
  const data = checkResponse.data as any;

  const scriptUrl = `${process.env.APP_URL}/apps/pathconvert/script.js`;
  const existingTag = data?.scriptTags?.edges?.find((edge: any) =>
    edge.node.src === scriptUrl
  );

  if (existingTag) {
    console.log('[ScriptTag] Already installed, skipping');
    return;
  }

  // Install script tag
  const createMutation = `
    mutation scriptTagCreate($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag {
          id
          src
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      src: scriptUrl,
      displayScope: 'ONLINE_STORE',
      cache: false, // Always fetch latest version
    }
  };

  const createResponse = await client.request(createMutation, { variables });
  const result = createResponse.data as any;

  if (result?.scriptTagCreate?.userErrors?.length > 0) {
    console.error('[ScriptTag] Installation errors:', result.scriptTagCreate.userErrors);
    throw new Error('Failed to install script tag');
  }

  console.log('[ScriptTag] Successfully installed:', scriptUrl);
}

/**
 * Uninstall ScriptTag (called on app uninstall webhook)
 */
export async function uninstallScriptTag(shop: string, accessToken: string): Promise<void> {
  const client = createShopifyGraphQLClient(shop, accessToken);

  const scriptUrl = `${process.env.APP_URL}/apps/pathconvert/script.js`;

  // Find script tag
  const checkQuery = `
    query {
      scriptTags(first: 10) {
        edges {
          node {
            id
            src
          }
        }
      }
    }
  `;

  const checkResponse = await client.request(checkQuery);
  const data = checkResponse.data as any;

  const tag = data?.scriptTags?.edges?.find((edge: any) =>
    edge.node.src === scriptUrl
  );

  if (!tag) {
    console.log('[ScriptTag] Not found, skipping uninstall');
    return;
  }

  // Delete script tag
  const deleteMutation = `
    mutation scriptTagDelete($id: ID!) {
      scriptTagDelete(id: $id) {
        deletedScriptTagId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const deleteResponse = await client.request(deleteMutation, {
    variables: { id: tag.node.id }
  });
  const result = deleteResponse.data as any;

  if (result?.scriptTagDelete?.userErrors?.length > 0) {
    console.error('[ScriptTag] Uninstall errors:', result.scriptTagDelete.userErrors);
    throw new Error('Failed to uninstall script tag');
  }

  console.log('[ScriptTag] Successfully uninstalled');
}
