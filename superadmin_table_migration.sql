-- Migration: Création de la table 'superadmins'
-- Cette table permet de stocker des informations détaillées pour les utilisateurs ayant le rôle 'SUPERADMIN'
-- en suivant la même logique que les tables 'doctors', 'inspectors' et 'health_authorities'.

CREATE TABLE superadmins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20), -- Numéro de téléphone (comme suggéré)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pour mettre à jour automatiquement la colonne `updated_at`
CREATE TRIGGER update_superadmins_modtime 
BEFORE UPDATE ON superadmins 
FOR EACH ROW 
EXECUTE PROCEDURE update_modified_column();
