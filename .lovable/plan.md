

## Bug: `formatBRL` crashes the Projection page

**Root cause:** On line 28, `minimumFractionDigits: 2` is set alongside `maximumFractionDigits: 0`. The spec requires `max >= min`, so the browser throws `RangeError: maximumFractionDigits value is out of range`.

**Fix:** Change line 28 to use consistent fraction digits. Since these are rounded whole numbers (from `Math.round`), using `minimumFractionDigits: 2, maximumFractionDigits: 2` is correct for BRL display:

```typescript
// Line 28 — change maximumFractionDigits from 0 to 2
return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
```

Single-line fix in `src/pages/Projection.tsx`. No other files affected.

