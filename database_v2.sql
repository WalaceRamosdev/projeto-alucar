-- Tabela de Imagens de Veículos
CREATE TABLE IF NOT EXISTS vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

-- Restrição: Máximo 5 imagens por veículo (Logica deve ser aplicada no Backend/Trigger)
-- Exemplo de trigger (PostgreSQL):
CREATE OR REPLACE FUNCTION limit_vehicle_images()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM vehicle_images WHERE vehicle_id = NEW.vehicle_id) >= 5 THEN
        RAISE EXCEPTION 'Limite de 5 imagens por veículo atingido';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_vehicle_images
BEFORE INSERT ON vehicle_images
FOR EACH ROW EXECUTE FUNCTION limit_vehicle_images();
