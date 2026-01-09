# Desafio Datacrazy Backend #2

**NestJS + Prisma ORM + Cache Inteligente**

Este projeto implementa o padrão completo Data Access Object (DAO) com cache inteligente para gerenciar registros de `Pessoa`.

## Funcionalidades

- ✅ **Operações CRUD**: Suporte completo para Create, Read, Update, Delete usando API Prisma
- ✅ **Consultas SQL Nativas**: `findByEmail` e `findByTelefone` usam SQL nativo com cache
- ✅ **Cache Inteligente**: Chaves de cache baseadas em SHA256 com TTL de 5 minutos
- ✅ **Eviction Automática de Cache**: Cache é automaticamente limpo em updates/deletes
- ✅ **Monitoramento de Cache**: Logs no console mostram comportamento HIT/MISS
- ✅ **REST API**: Endpoints REST completos com documentação Swagger/OpenAPI
- ✅ **Validação de Entrada**: Validação de DTOs usando class-validator

## Tecnologias

- **NestJS** - Framework progressivo Node.js
- **TypeScript** - Desenvolvimento type-safe
- **Prisma ORM** - Toolkit moderno de banco de dados com adaptador PostgreSQL
- **PostgreSQL** - Banco de dados relacional (Docker)
- **cache-manager** - Solução de cache em memória
- **Swagger/OpenAPI** - Documentação interativa da API
- **class-validator** - Validação de DTOs

## Início Rápido

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- npm ou pnpm

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar Banco de Dados PostgreSQL

```bash
docker-compose up -d
```

Isso inicia um container PostgreSQL 15 na porta 5432.

### 3. Executar Migrações do Banco de Dados

```bash
npx prisma migrate deploy
```

Isso cria a tabela `pessoas` com todos os índices necessários.

### 4. Iniciar a Aplicação

```bash
npm run start:dev
```

A aplicação estará disponível em:
- 🚀 **API**: http://localhost:3000
- 📚 **Documentação Swagger**: http://localhost:3000/api

## Testando a Aplicação

### Opção 1: Testes Interativos com Swagger UI (Recomendado)

1. Abra http://localhost:3000/api no seu navegador
2. Você verá a interface Swagger UI com todos os endpoints disponíveis
3. Clique em qualquer endpoint para expandi-lo
4. Clique em "Try it out" para testar o endpoint
5. Preencha os campos obrigatórios e clique em "Execute"
6. Verifique os logs do console para ver o comportamento de cache HIT/MISS

**Exemplo: Testando Comportamento do Cache**

1. **Criar uma Pessoa**:
   - Vá para `POST /pessoas`
   - Clique em "Try it out"
   - Use estes dados de exemplo:
   ```json
   {
     "nome": "João Silva",
     "idade": 30,
     "cpf": "123.456.789-00",
     "endereco": "Rua A, 123 - São Paulo, SP",
     "email": "joao.silva@example.com",
     "telefone": "(11) 98765-4321"
   }
   ```
   - Clique em "Execute" e copie o `id` retornado

2. **Testar Cache MISS**:
   - Vá para `GET /pessoas/email/{email}`
   - Digite `joao.silva@example.com`
   - Clique em "Execute"
   - Verifique o console - você verá: `❌ Cache MISS for email: joao.silva@example.com`

3. **Testar Cache HIT**:
   - Execute a mesma requisição novamente
   - Verifique o console - você verá: `✅ Cache HIT for email: joao.silva@example.com`

4. **Testar Eviction de Cache**:
   - Vá para `PUT /pessoas/{id}`
   - Digite o ID do passo 1
   - Atualize a idade para 31
   - Clique em "Execute"
   - Verifique o console - você verá: `🗑️ Cache evicted`

5. **Verificar que o Cache foi Removido**:
   - Volte para `GET /pessoas/email/{email}`
   - Execute a requisição novamente
   - Verifique o console - você verá: `❌ Cache MISS` (o cache foi limpo!)

### Opção 2: Script de Testes Automatizados

Execute a suíte completa de testes:

```bash
npx ts-node src/test-dao.ts
```

Isso executa 13 testes automatizados cobrindo:
- Operações CRUD
- Consultas SQL nativas
- Cenários de cache HIT/MISS
- Eviction automática de cache
- Limpeza de dados

### Opção 3: Testes Manuais com curl

```bash
# Criar uma Pessoa
curl -X POST http://localhost:3000/pessoas \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "idade": 30,
    "cpf": "123.456.789-00",
    "endereco": "Rua A, 123 - São Paulo, SP",
    "email": "joao.silva@example.com",
    "telefone": "(11) 98765-4321"
  }'

# Buscar por email (Cache MISS - primeira vez)
curl http://localhost:3000/pessoas/email/joao.silva@example.com

# Buscar por email novamente (Cache HIT)
curl http://localhost:3000/pessoas/email/joao.silva@example.com

# Buscar por telefone (Cache MISS - primeira vez)
curl http://localhost:3000/pessoas/telefone/\(11\)%2098765-4321

# Buscar por nome
curl "http://localhost:3000/pessoas/search/by-name?nome=João"
```

## Endpoints da API

| Método | Endpoint | Descrição | Cache |
|--------|----------|-----------|-------|
| POST | `/pessoas` | Criar nova Pessoa | Remove cache |
| GET | `/pessoas/:id` | Buscar Pessoa por ID | Sem cache |
| GET | `/pessoas/email/:email` | Buscar por email (SQL nativo) | ✅ Cache (TTL 5 min) |
| GET | `/pessoas/telefone/:telefone` | Buscar por telefone (SQL nativo) | ✅ Cache (TTL 5 min) |
| GET | `/pessoas/search/by-name?nome=xxx` | Buscar por nome | Sem cache |
| PUT | `/pessoas/:id` | Atualizar Pessoa | Remove cache |
| DELETE | `/pessoas/:id` | Deletar Pessoa | Remove cache |

## Estrutura do Projeto

```
src/
├── main.ts                 # Ponto de entrada da aplicação com config Swagger
├── app.module.ts          # Módulo raiz com configuração de cache e database
├── prisma/
│   ├── prisma.module.ts   # Módulo Prisma global
│   └── prisma.service.ts  # Factory de conexão com banco de dados
└── pessoa/
    ├── pessoa.module.ts           # Módulo Pessoa
    ├── pessoa.dao.ts              # DAO com CRUD e lógica de cache
    ├── pessoa.controller.ts       # Endpoints da REST API
    └── dto/
        ├── create-pessoa.dto.ts   # DTO de criação com validação
        ├── update-pessoa.dto.ts   # DTO de atualização
        └── pessoa-response.dto.ts # DTO de resposta
```

## Detalhes da Implementação do Cache

### Estratégia de Cache

1. **Chaves SHA256**: Geradas a partir de `SQL query + parâmetros`
   ```typescript
   const cacheKey = createHash('sha256')
     .update(sql + JSON.stringify(params))
     .digest('hex');
   ```

2. **Time-To-Live (TTL)**: 5 minutos (300 segundos)
   - Configurável via variável de ambiente `CACHE_TTL_SECONDS`

3. **Eviction Automática**: Cache é limpo quando:
   - Uma nova Pessoa é criada
   - Uma Pessoa existente é atualizada
   - Uma Pessoa é deletada

4. **Armazenamento do Cache**: Em memória usando `cache-manager`
   - Acesso rápido
   - Sem dependências externas
   - Máximo de 100 itens (configurável via `CACHE_MAX_ITEMS`)

### Monitoramento do Cache

Todas as operações de cache são registradas no console:
- ✅ `Cache HIT` - Dados recuperados do cache
- ❌ `Cache MISS` - Dados buscados do banco de dados
- 🗑️ `Cache evicted` - Cache limpo após operação de escrita

## Schema do Banco de Dados

```prisma
model Pessoa {
  id        String   @id @default(uuid())
  nome      String
  idade     Int
  cpf       String   @unique
  endereco  String
  email     String   @unique
  telefone  String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([telefone])
  @@index([cpf])
  @@map("pessoas")
}
```

## Variáveis de Ambiente

Crie um arquivo `.env` (ou use `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/desafio2?schema=public"
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=100
NODE_ENV=development
PORT=3000
```

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar banco de dados PostgreSQL
docker-compose up -d

# Executar migrações
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Iniciar servidor de desenvolvimento
npm run start:dev

# Build para produção
npm run build

# Iniciar servidor de produção
npm run start:prod

# Executar linter
npm run lint

# Executar testes automatizados
npx ts-node src/test-dao.ts

# Visualizar Prisma Studio (GUI do banco de dados)
npx prisma studio
```

## Checklist dos Requisitos do Desafio

✅ **Classe DAO**: Implementada em `PessoaDao`
✅ **Métodos CRUD**: `create`, `update`, `delete`, `getById`, `findByName`
✅ **Métodos SQL Nativos**: `findByEmail`, `findByTelefone` usando `$queryRaw`
✅ **Implementação de Cache**: Cache em memória com `cache-manager`
✅ **Chaves SHA256**: Hash da query SQL + parâmetros
✅ **Configuração TTL**: Expiração de cache de 5 minutos
✅ **Eviction Automática**: Em operações de create/update/delete
✅ **Prisma Connection Factory**: Usando `PrismaService` com adaptador PostgreSQL
✅ **Banco de Dados**: PostgreSQL com Docker Compose

## Destaques da Arquitetura

### Separação de Responsabilidades

- **Camada DAO** (`pessoa.dao.ts`): Acesso direto ao banco de dados com lógica de cache
- **Camada Controller** (`pessoa.controller.ts`): Manipulação de requisições HTTP e validação
- **Camada DTO**: Validação de entrada e documentação da API

### Padrões de Design

- **Padrão DAO**: Abstração da persistência de dados
- **Injeção de Dependência**: Container IoC do NestJS
- **Padrão Repository**: Prisma ORM como abstração de fonte de dados
- **Padrão Factory**: PrismaService para conexões com banco de dados

### Boas Práticas

- ✅ Segurança de tipos com TypeScript
- ✅ Validação de entrada com class-validator
- ✅ Documentação da API com Swagger/OpenAPI
- ✅ Tratamento consistente de erros
- ✅ Estrutura de código limpa
- ✅ Logging abrangente
- ✅ Configuração por variáveis de ambiente
- ✅ Containerização com Docker

## Licença

Este é um projeto de desafio para avaliação da Datacrazy.

## Autor

**Juan Cantero**

Desenvolvido com NestJS, Prisma e estratégias de cache inteligente.
