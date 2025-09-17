-- Insert initial data for subscription system

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Administrador', 'admin@sistema.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert subscription plans
INSERT INTO plans (name, description, price_per_property, items_included) VALUES 
(
    'Básico',
    'Plano básico com itens essenciais de limpeza',
    29.90,
    '[
        "Kit de limpeza básico",
        "Detergente multiuso",
        "Panos de limpeza",
        "Luvas descartáveis",
        "Saco de lixo"
    ]'::jsonb
),
(
    'Premium',
    'Plano premium com kit completo de limpeza e serviços extras',
    49.90,
    '[
        "Kit de limpeza completo",
        "Detergente multiuso premium",
        "Desinfetante",
        "Panos de microfibra",
        "Luvas de borracha",
        "Saco de lixo biodegradável",
        "Esponja dupla face",
        "Álcool gel",
        "Papel toalha",
        "Aromatizador de ambiente",
        "Serviço de consultoria por telefone",
        "Relatório mensal de limpeza"
    ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

