#!/bin/bash

# Test script to verify all app functionality
SHOP="sports-clothing-test.myshopify.com"
BASE_URL="https://pathconvert.onrender.com"

echo "========================================="
echo "PathConvert App Functionality Test"
echo "========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s "${BASE_URL}/health" | jq '.'
echo ""

# Test 2: Dashboard Stats
echo "Test 2: Dashboard Stats (fetchDashboardStats)"
curl -s "${BASE_URL}/api/simple/debug?shop=${SHOP}" | jq '{collections: .count.collections, recommendations: .count.recommendations}'
echo ""

# Test 3: Analytics Total Clicks
echo "Test 3: Analytics - Total Clicks"
curl -s "${BASE_URL}/api/analytics/total-clicks?shop=${SHOP}" | jq '.'
echo ""

# Test 4: Collections with Buttons
echo "Test 4: Collections List (fetchCollectionsWithButtons)"
curl -s "${BASE_URL}/api/simple/debug?shop=${SHOP}" | jq '.collections[] | {handle, title}'
echo ""

# Test 5: Deactivate Buttons (bulk action)
echo "Test 5: Deactivate Buttons Test"
curl -s -X POST "${BASE_URL}/api/simple/deactivate-buttons?shop=${SHOP}" \
  -H "Content-Type: application/json" \
  -d '{"collectionIds": ["frontpage"]}' | jq '.'
echo ""

# Test 6: Reactivate Buttons (bulk action)
echo "Test 6: Reactivate Buttons Test"
curl -s -X POST "${BASE_URL}/api/simple/reactivate-buttons?shop=${SHOP}" \
  -H "Content-Type: application/json" \
  -d '{"collectionIds": ["frontpage"]}' | jq '.'
echo ""

# Test 7: Settings Save
echo "Test 7: Settings Save (updateAiSettings)"
curl -s -X PUT "${BASE_URL}/api/admin/settings?shop=${SHOP}" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": true,
    "max_recommendations": 15,
    "button_style": {
      "alignment": "center",
      "colorMode": "theme",
      "placement": "aboveGrid"
    }
  }' | jq '.'
echo ""

# Test 8: Cleanup Function
echo "Test 8: Cleanup (runCleanup)"
curl -s -X POST "${BASE_URL}/api/simple/cleanup?shop=${SHOP}" \
  -H "Content-Type: application/json" \
  -d '{
    "removeDeletedTargets": true,
    "rebuildEmbeddings": false
  }' | jq '.'
echo ""

# Test 9: Storefront Related Collections
echo "Test 9: Storefront - Get Related Collections"
curl -s "${BASE_URL}/api/collections/mens-clothing/related?shop=${SHOP}" | jq '.'
echo ""

# Test 10: App loads correctly
echo "Test 10: Frontend App Loads"
curl -s "${BASE_URL}/app?shop=${SHOP}" | grep -o '<title>[^<]*</title>'
echo ""

echo "========================================="
echo "All Tests Complete!"
echo "========================================="
