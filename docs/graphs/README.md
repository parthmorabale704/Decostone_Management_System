# DecoStone project charts

High-resolution (300 DPI) PNG charts generated from the local SQLite database in read-only mode.

- Generated: 2026-10-23 11:38 India Standard Time
- Database activity represented: 2026-10-22 to 2026-10-22
- Current stock unit: Box
- Scope: active materials and active godowns; soft-deleted records are excluded.
- The charts show a snapshot of the local database at generation time. Regenerate after data changes with `python docs/tools/generate_project_graphs.py`.

## Files

- `category-stock-distribution.png` — pie chart of current stock by category.
- `godown-stock-column-chart.png` — column chart of current stock by godown.
- `material-stock-bar-chart.png` — horizontal bar chart of current stock by material.
- `stock-movement-line-chart.png` — cumulative movement by transaction time.

Movement timeline aggregates stock-in and opening stock, stock-out, and both transfer directions separately. If active materials use different units, it switches to counting transaction events rather than summing incomparable quantities.
