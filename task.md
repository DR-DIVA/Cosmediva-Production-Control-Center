# Lot Profitability Analysis Dashboard - Tasks

- [x] **Database Updates**
  - [x] Add `selling_price` to `product_bom` table. (SQL provided to user)
- [x] **Backend (costing.ts)**
  - [x] Update `saveProductBOM` to handle `selling_price`.
  - [x] Create `calculateLotCost(lot_id)` function.
  - [x] Create `getLotCostings()` function.
- [x] **Frontend - BOM Setup**
  - [x] Add "ราคาขาย / ชิ้น" (Selling Price) input to `/costing/bom/page.tsx`.
- [x] **Frontend - Costing Dashboard**
  - [x] Build UI in `/costing/page.tsx` to display KPIs and Lot summary table.
  - [x] Integrate "Calculate Cost" button to trigger `calculateLotCost`.
