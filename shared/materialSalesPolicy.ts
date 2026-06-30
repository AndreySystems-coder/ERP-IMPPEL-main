export function getEffectiveMaterialSaleDiscountLimit(
  product: { maxDiscount?: unknown },
  generalMaxDiscount: unknown,
) {
  const generalLimit = Math.max(0, Math.min(100, Number(generalMaxDiscount) || 0));
  const productLimit = Number(product.maxDiscount);

  if (Number.isFinite(productLimit) && productLimit > 0) {
    return Math.min(generalLimit, Math.max(0, Math.min(100, productLimit)));
  }

  return generalLimit;
}
