# PathConvert API Documentation

## Base URL

```
https://your-app-url.com/api
```

## Authentication

### OAuth Flow

PathConvert uses Shopify OAuth 2.0 for authentication.

#### 1. Start OAuth

```
GET /api/auth?shop={shop-domain}
```

**Parameters:**
- `shop` (required): The Shopify store domain (e.g., `example.myshopify.com`)

**Response:**
Redirects to Shopify OAuth consent screen

#### 2. OAuth Callback

```
GET /api/auth/callback
```

**Query Parameters:**
- `code`: OAuth authorization code
- `shop`: Shop domain
- `state`: CSRF token

**Response:**
Redirects to app admin on success

### Admin Endpoints

Admin endpoints require a valid Shopify session. Include the shop parameter in queries.

## Public Endpoints

### Get Related Collections

Fetch AI-recommended related collections for a specific collection.

```
GET /api/collections/:handle/related
```

**Parameters:**
- `handle` (path): Collection handle (e.g., `summer-collection`)
- `shop` (query): Shop domain

**Example Request:**

```bash
curl "https://your-app-url.com/api/collections/summer-collection/related?shop=example.myshopify.com"
```

**Example Response:**

```json
{
  "success": true,
  "related": [
    {
      "handle": "beach-accessories",
      "title": "Beach Accessories",
      "url": "/collections/beach-accessories",
      "similarity_score": 0.87,
      "position": 1
    },
    {
      "handle": "outdoor-gear",
      "title": "Outdoor Gear",
      "url": "/collections/outdoor-gear",
      "similarity_score": 0.82,
      "position": 2
    }
  ]
}
```

### Track Button Click

Record analytics when a user clicks a related collection button.

```
POST /api/analytics/click
```

**Request Body:**

```json
{
  "shop": "example.myshopify.com",
  "source": "summer-collection",
  "target": "beach-accessories"
}
```

**Example Response:**

```json
{
  "success": true
}
```

## Admin Endpoints

### List All Collections

Get all collections for the authenticated shop.

```
GET /api/admin/collections?shop={shop-domain}
```

**Example Response:**

```json
{
  "success": true,
  "collections": [
    {
      "collection_id": "summer-collection",
      "handle": "summer-collection",
      "title": "Summer Collection",
      "description": "Hot summer styles",
      "url": "/collections/summer-collection",
      "product_count": 45,
      "last_analyzed": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Collection Details

Get a specific collection with its related collections.

```
GET /api/admin/collections/:id?shop={shop-domain}
```

**Example Response:**

```json
{
  "success": true,
  "collection": {
    "collection_id": "summer-collection",
    "handle": "summer-collection",
    "title": "Summer Collection",
    "description": "Hot summer styles",
    "product_count": 45,
    "last_analyzed": "2024-01-15T10:30:00Z"
  },
  "related": [
    {
      "collection_id": "beach-accessories",
      "handle": "beach-accessories",
      "title": "Beach Accessories",
      "similarity_score": 0.87,
      "position": 1
    }
  ]
}
```

### Get Shop Settings

Retrieve current settings for the authenticated shop.

```
GET /api/admin/settings?shop={shop-domain}
```

**Example Response:**

```json
{
  "success": true,
  "settings": {
    "shop_domain": "example.myshopify.com",
    "is_active": true,
    "max_recommendations": 4,
    "min_similarity_threshold": 0.7,
    "button_style": {
      "primaryColor": "#000000",
      "primaryTextColor": "#ffffff",
      "borderRadius": "4px"
    },
    "last_sync": "2024-01-15T10:30:00Z",
    "installed_at": "2024-01-10T09:00:00Z"
  }
}
```

### Update Shop Settings

Update settings for the authenticated shop.

```
PUT /api/admin/settings?shop={shop-domain}
```

**Request Body:**

```json
{
  "is_active": true,
  "max_recommendations": 5,
  "min_similarity_threshold": 0.75
}
```

**Example Response:**

```json
{
  "success": true
}
```

### Trigger Collection Analysis

Start a new analysis of all collections.

```
POST /api/admin/analyze?shop={shop-domain}
```

**Request Body (optional):**

```json
{
  "immediate": false
}
```

- `immediate`: If `true`, runs analysis synchronously. If `false`, queues for background processing.

**Example Response:**

```json
{
  "success": true,
  "message": "Analysis queued"
}
```

Or, if `immediate: true`:

```json
{
  "success": true,
  "result": {
    "collectionsAnalyzed": 25,
    "success": true
  }
}
```

### Get Analytics

Retrieve click analytics for related collection buttons.

```
GET /api/admin/analytics?shop={shop-domain}
```

**Example Response:**

```json
{
  "success": true,
  "clicks": [
    {
      "source_collection_handle": "summer-collection",
      "target_collection_handle": "beach-accessories",
      "clicks": 47
    },
    {
      "source_collection_handle": "winter-collection",
      "target_collection_handle": "ski-gear",
      "clicks": 32
    }
  ]
}
```

## Webhook Endpoints

### Collections Created

```
POST /api/webhooks/collections/create
```

**Headers:**
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: Webhook verification HMAC

**Payload:**

```json
{
  "id": 123456789,
  "title": "New Collection",
  "handle": "new-collection"
}
```

### Collections Updated

```
POST /api/webhooks/collections/update
```

**Headers:**
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: Webhook verification HMAC

**Payload:**

```json
{
  "id": 123456789,
  "title": "Updated Collection",
  "handle": "updated-collection"
}
```

### Collections Deleted

```
POST /api/webhooks/collections/delete
```

**Headers:**
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: Webhook verification HMAC

**Payload:**

```json
{
  "id": 123456789
}
```

### App Uninstalled

```
POST /api/webhooks/app/uninstalled
```

**Headers:**
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: Webhook verification HMAC

Cleans up all shop data from the database.

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

PathConvert respects Shopify's API rate limits:
- **REST Admin API**: 2 requests per second
- **GraphQL Admin API**: 50 points per second

OpenAI API rate limits:
- **text-embedding-3-small**: 3000 requests per minute

## Pagination

Currently, endpoints return all results. Future versions may implement pagination for large datasets.

## Versioning

API version is included in the URL path. Current version: `v1`

Future endpoint structure:
```
GET /api/v1/collections/:handle/related
```

## SDKs and Libraries

### JavaScript/Node.js

```javascript
// Using fetch
const response = await fetch(
  `https://your-app-url.com/api/collections/summer-collection/related?shop=example.myshopify.com`
);
const data = await response.json();
console.log(data.related);
```

### cURL

```bash
curl -X GET \
  "https://your-app-url.com/api/collections/summer-collection/related?shop=example.myshopify.com" \
  -H "Content-Type: application/json"
```

## Support

For API support or to report issues:
- GitHub Issues: [repository-url]/issues
- Email: support@pathconvert.com
- Documentation: [repository-url]/docs
