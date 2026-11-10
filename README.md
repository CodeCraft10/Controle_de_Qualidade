# GP 4 - Sistema Inteligente de Controle de Qualidade

## 📌 Escopo do Projeto

### Problema
O controle de qualidade é realizado por meio de registros manuais e planilhas, tornando o processo lento, suscetível a erros humanos e com baixa rastreabilidade das inspeções. 
A ausência de um sistema centralizado dificulta a identificação das causas raiz dos defeitos, compromete a análise de indicadores e aumenta o risco de envio de produtos não conformes ao cliente.

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
- Backend: Node.js / Express
- Banco de Dados Relacional: PostgreSQL
- Git / GitHub
- [Ferramenta de Gestão: Trello / Jira / GitHub Projects]

## ▶️ Executar o sistema

O projeto está organizado em duas aplicações:

- [Backend](backend/README.md): configuração do PostgreSQL, migrações, criação da primeira conta e API em `http://localhost:3000/api`.
- [Frontend](frontend/README.md): interface web em `http://localhost:5173`, configuração, testes e manual de uso.

Depois de iniciar a API conforme o guia do backend, execute em outro terminal:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

No PowerShell, substitua `cp` por `Copy-Item` e use `npm.cmd` caso a política de execução bloqueie `npm.ps1`. Não há usuário ou senha padrão: utilize uma conta criada no backend.

A implementação do frontend corresponde às atividades F01–F07 do plano individual do João. As [rotas e os esboços](frontend/docs/ROTAS_E_TELAS.md), o [padrão visual](frontend/docs/DESIGN_SYSTEM.md) e a [matriz de validação](frontend/docs/VALIDACAO.md) registram as decisões e evidências. A cor azul foi normalizada de `#25663EB`, que não é um hexadecimal CSS válido, para `#2563EB`.

## 👥 Equipe
- Pedro Peruzzo
- Felipe Pantarotti
- João Guilherme
- Luiz Eduardo
