-- Create cash sessions table to track opening and closing of the cash box
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(10, 2) DEFAULT 0,
  closing_balance DECIMAL(10, 2),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add cash_session_id foreign key to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_cash_session ON public.orders(cash_session_id);
