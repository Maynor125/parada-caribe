-- Create cash_sessions table (compatible con integers)
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id BIGSERIAL PRIMARY KEY,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(10, 2) DEFAULT 0,
  closing_balance DECIMAL(10, 2),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add cash_session_id to orders table (como BIGINT para que coincida con BIGSERIAL)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_cash_session ON public.orders(cash_session_id);
