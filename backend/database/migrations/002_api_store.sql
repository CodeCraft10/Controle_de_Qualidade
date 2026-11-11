ALTER TABLE sessoes ADD COLUMN sessao_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE gp4_store_lock (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    descricao VARCHAR(100) NOT NULL DEFAULT 'serialização de operações da API'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO gp4_store_lock (id) VALUES (1);

CREATE TABLE app_settings (
    setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
