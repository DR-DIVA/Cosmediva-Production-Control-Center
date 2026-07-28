CREATE TABLE IF NOT EXISTS public.fg_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  rack TEXT NOT NULL,
  level INTEGER NOT NULL,
  capacity_pallets INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fg_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES public.products(id),
  lot_no TEXT NOT NULL,
  box_lot_no TEXT,
  mfg_date DATE,
  exp_date DATE,
  receive_qty_cartons INTEGER DEFAULT 0,
  receive_qty_pcs INTEGER DEFAULT 0,
  available_qty_pcs INTEGER DEFAULT 0,
  location_id UUID REFERENCES public.fg_locations(id),
  qc_status TEXT DEFAULT 'QUARANTINE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fg_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.fg_inventory(id),
  transaction_type TEXT NOT NULL,
  qty_pcs INTEGER NOT NULL,
  reference_doc TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fg_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_transactions ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for all authenticated users" ON public.fg_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for all authenticated users" ON public.fg_locations FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.fg_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for all authenticated users" ON public.fg_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.fg_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for all authenticated users" ON public.fg_transactions FOR ALL TO authenticated USING (true);

-- Insert dummy locations
INSERT INTO public.fg_locations (zone, rack, level, capacity_pallets) VALUES
('Zone A', 'Rack 01', 1, 2),
('Zone A', 'Rack 01', 2, 2),
('Zone B', 'Rack 01', 1, 2),
('Zone B', 'Rack 02', 1, 2)
ON CONFLICT DO NOTHING;
