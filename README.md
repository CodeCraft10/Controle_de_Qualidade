# GP 4 - Sistema Inteligente de Controle de Qualidade

## 📌 Escopo do Projeto

### Problema
O controle de qualidade é realizado por meio de registros manuais e planilhas, tornando o processo lento, suscetível a erros humanos e com baixa rastreabilidade das inspeções. 
A ausência de um sistema centralizado dificulta a identificação das causas raiz dos defeitos, compromete a análise de indicadores e aumenta o risco de envio de produtos não conformes ao cliente..

### Objetivo
Desenvolver uma solução digital centralizada para gerenciamento completo do controle de qualidade, permitindo o registro ágil de inspeções, rastreabilidade de lotes, 
gestão de não conformidades e geração automática de relatórios e dashboards para apoio à tomada de decisão.

### Público-alvo
Inspetores de qualidade, supervisores de produção, analistas de processos e gestores industriais.

### Solução
Aplicação web responsiva integrada a um banco de dados relacional que automatiza a rotina de auditoria através de checklists, permite o anexo de evidências fotográficas, faz a gestão de não conformidades e 
disponibiliza visões analíticas em tempo real, mantendo histórico seguro e auditável.

### Principais funcionalidades
- Cadastro de produtos, lotes, inspetores e critérios de inspeção
- Execução de checklists e registro de inspeções
- Registro e gestão de não conformidades com anexo de fotos (evidências)
- Histórico auditável e mecanismo de pesquisa e filtros
- Dashboards com indicadores de desempenho e geração de relatórios
- Controle de usuários e gestão de permissões de acesso
- Preparação de arquitetura para futura integração com IA (identificação de padrões de defeitos)

## 🎨 Design System

### Cores
- Cor primária: Azul-Marinho
- Cor secundária: Azul
- Cor de fundo: Cinza Claro
- Cor de texto: Cinza Escuro

### 🔤 Tipografia
- Fonte principal: Inter
- Títulos: Inter Bold (700)
- Subtítulos: Inter Semibold (600)
- Texto: Inter Regular

### 🔷 Logotipo
- Nome: GP4 | Controle de Qualidade
- Símbolo: Escudo com check centralizado (✔️)
- Cor principal: Azul-Marinho (#142D4E)
- Cor secundária: Azul (#2563EB)
- Tipografia: Inter Bold (700)
- Estilo: Minimalista, moderno e profissional
- Versões: Horizontal, ícone e monocromático

## 🛠️ Tecnologias
- Frontend: HTML5 / CSS3 / JavaScript, Vite
- Backend: PHP 8.2+ (API independente, sem framework)
- Persistência atual do backend: JSON local para desenvolvimento
- Banco de dados futuro: PostgreSQL, integração pendente
- Git / GitHub
- [Ferramenta de Gestão: Trello / Jira / GitHub Projects]

## ▶️ Executar o sistema

A aplicação está integrada: `public/index.php` entrega a interface e encaminha `/api` ao backend PHP, usando uma única URL.

Siga o [guia de instalação na VPS](docs/implantacao/VPS.md) para compilar, iniciar e criar a primeira conta. Com Docker Compose:

```sh
cp .env.example .env
# Edite APP_BIND=0.0.0.0 em .env para abrir pelo IP da VPS privada.
docker compose up -d --build
docker compose exec --user www-data app php backend/bin/create-admin.php
```

Acesse `http://IP_DA_VPS:8080/` após configurar a interface de escuta e o firewall. Não há senha padrão. O guia também cobre execução local, Nginx/PHP-FPM, backups e testes.

- [Backend](backend/README.md): API, regras, armazenamento e testes PHP.
- [Frontend](frontend/README.md): interface integrada e testes de navegador.

A persistência permanece em JSON local privado, em volume persistente na instalação Docker. PostgreSQL é uma integração futura.

A implementação do frontend corresponde às atividades F01–F07 do plano individual do João. As [rotas e os esboços](frontend/docs/ROTAS_E_TELAS.md), o [padrão visual](frontend/docs/DESIGN_SYSTEM.md) e a [matriz de validação](frontend/docs/VALIDACAO.md) registram as decisões e evidências. A cor azul foi normalizada de `#25663EB`, que não é um hexadecimal CSS válido, para `#2563EB`.

## 👥 Equipe
- Pedro Peruzzo
- Felipe Pantarotti
- João Guilherme
- Luiz Eduardo
