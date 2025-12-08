# Adaptive Similarity Threshold

PathConvert uses an intelligent adaptive threshold system to ensure every store gets relevant recommendations, regardless of how similar their collections are.

## How It Works

### Two-Pass Analysis

1. **First Pass**: Calculate all similarity scores between collections
2. **Analysis**: Examine the distribution of scores (min, max, median, mean)
3. **Second Pass**: Use the calculated adaptive threshold to filter recommendations

### Adaptive Strategy

The threshold is automatically determined based on the store's similarity profile:

#### High Similarity Stores (max score > 0.80)
- **Threshold**: 75% of median score, minimum 0.60
- **Rationale**: Collections are very similar, so we can be picky and show only the best matches
- **Example**: A sportswear store with "Running Shoes", "Training Shoes", "Basketball Shoes" - very high semantic overlap

#### Medium Similarity Stores (max score 0.60-0.80)
- **Threshold**: 60% of median score, minimum 0.45
- **Rationale**: Collections have moderate similarity, use balanced threshold
- **Example**: A clothing store with "Men's Shirts", "Women's Dresses", "Kids Clothing" - some overlap

#### Low Similarity Stores (max score < 0.60)
- **Threshold**: 50% of median score, minimum 0.35
- **Rationale**: Collections are quite different, lower threshold to ensure recommendations
- **Example**: A general store with "Electronics", "Kitchen", "Garden" - low semantic overlap

### Safety Net

If the calculated threshold would result in too few recommendations (less than 50% of the target), the system automatically lowers the threshold to ensure each collection gets at least some recommendations.

## Benefits

1. **Better Experience for All Stores**: Every store gets relevant recommendations, not just those with similar products
2. **Quality Control**: High-similarity stores maintain high-quality recommendations
3. **Coverage**: Low-similarity stores still get useful cross-sells
4. **Transparency**: The calculated threshold is stored in `shop_settings.min_similarity_threshold`

## Example

For your test store with 7 collections:

```
Score distribution: min=0.505, median=0.563, mean=0.579, max=0.672
Adaptive threshold: 0.450 (matches medium similarity store profile)
Result: 10 recommendations created
```

This ensures collections like "Mens Clothing" and "Womens Activewear" can still recommend each other even though they're not extremely similar (score: 0.517).

## Monitoring

Check the Render logs or the debug endpoint to see:
- The score distribution for your store
- The calculated threshold
- How many recommendations were created

```bash
curl "https://pathconvert.onrender.com/api/simple/debug?shop=your-store.myshopify.com"
```
