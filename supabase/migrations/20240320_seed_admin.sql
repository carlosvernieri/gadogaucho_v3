-- Seed admin user
INSERT INTO users (name, email, city, phone, password, is_admin)
VALUES ('Administrador', 'admin@admin.com', 'Porto Alegre', '(51) 99999-9999', 'admin', true)
ON CONFLICT (email) DO UPDATE SET is_admin = true;
