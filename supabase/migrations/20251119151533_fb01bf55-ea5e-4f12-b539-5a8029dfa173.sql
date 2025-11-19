-- Add fulfillment tracking to food_items
ALTER TABLE public.food_items 
ADD COLUMN fulfilled BOOLEAN DEFAULT FALSE,
ADD COLUMN fulfilled_at TIMESTAMP WITH TIME ZONE;