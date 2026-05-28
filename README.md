# Encurtador Full Stack

Projeto de encurtador de links com stack React + TypeScript + Vite no front-end e Node.js + TypeScript + Fastify no back-end.

## Estrutura do repositório

```
root/
├── web/        # Front-end React
├── server/     # API Node.js
├── README.md
├── docker-compose.yml
├── .gitignore
└── .env.example
```

## Tecnologias

- Front-end: React, TypeScript, Vite, TailwindCSS, React Query, React Hook Form, Zod
- Back-end: Node.js, TypeScript, Fastify, Drizzle ORM, PostgreSQL
- DevOps: Docker, Docker Compose

## Como rodar

### 1. Definir variáveis de ambiente

Copie o arquivo `.env.example` para `.env` na raiz do projeto e ajuste conforme necessário.

### 2. Rodar com Docker Compose

```bash
docker compose up --build
```

### 3. Rodar localmente sem Docker

#### Back-end

```bash
cd server
npm install
npm run dev
```

#### Front-end

```bash
cd web
npm install
npm run dev
```

## Scripts úteis

### Back-end
- `npm run dev` - iniciar servidor em modo desenvolvimento
- `npm run build` - compilar TypeScript
- `npm run start` - iniciar servidor compilado
- `npm run db:migrate` - executar migrações
- `npm run db:generate` - gerar migração (stub)
- `npm run lint` - lint stub
- `npm run test` - teste stub

### Front-end
- `npm run dev` - iniciar Vite em modo desenvolvimento
- `npm run build` - gerar build de produção
- `npm run preview` - pré-visualizar build
- `npm run lint` - verificar código (se configurado)
- `npm run test` - teste stub

## Variáveis de ambiente

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_BACKEND_URL`
- `VITE_FRONTEND_URL`
- `FRONTEND_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET`

## Docker

- `docker-compose.yml` define serviços para `db`, `server` e `web`.
- O back-end usa o Dockerfile em `server/Dockerfile`.
- O front-end usa o Dockerfile em `web/Dockerfile`.
