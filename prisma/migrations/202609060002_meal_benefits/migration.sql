ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}';

UPDATE public.meals
SET benefits = ingredients
WHERE (benefits IS NULL OR array_length(benefits, 1) IS NULL)
  AND array_length(ingredients, 1) IS NOT NULL;
