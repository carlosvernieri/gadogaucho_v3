-- Seed admin user
INSERT INTO users (name, email, city, phone, password, is_admin)
VALUES ('Administrador', 'adriano.prog@gmail.com', 'Porto Alegre', '(51) 99999-9999', 'admin123', true)
ON CONFLICT (email) DO UPDATE SET is_admin = true;
