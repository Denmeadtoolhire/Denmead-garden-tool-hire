ALTER TABLE tools ADD COLUMN IF NOT EXISTS price_2day numeric(10,2) NOT NULL DEFAULT 0;
UPDATE tools SET price_2day = price_1day + 5 WHERE price_2day = 0;
