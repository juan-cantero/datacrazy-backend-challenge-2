# Datacrazy Backend Challenge #2

**NestJS + Prisma ORM + Intelligent Caching**

This project implements a complete Data Access Object (DAO) pattern with intelligent caching for managing `Pessoa` records.

## Features

- ✅ **CRUD Operations**: Full Create, Read, Update, Delete support using Prisma API
- ✅ **Native SQL Queries**: `findByEmail` and `findByTelefone` use native SQL with caching
- ✅ **Intelligent Caching**: SHA256-based cache keys with 5-minute TTL
- ✅ **Automatic Cache Eviction**: Cache is automatically cleared on updates/deletes
- ✅ **Cache Monitoring**: Console logs show HIT/MISS behavior
- ✅ **REST API**: Full REST endpoints with Swagger/OpenAPI documentation
- ✅ **Input Validation**: DTO validation using class-validator

## Technologies

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma ORM** - Modern database toolkit with PostgreSQL adapter
- **PostgreSQL** - Relational database (Docker)
- **cache-manager** - In-memory caching solution
- **Swagger/OpenAPI** - Interactive API documentation
- **class-validator** - DTO validation

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or pnpm

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL Database

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container on port 5432.

### 3. Run Database Migrations

```bash
npx prisma migrate deploy
```

This creates the `pessoas` table with all necessary indexes.

### 4. Start the Application

```bash
npm run start:dev
```

The application will be available at:
- 🚀 **API**: http://localhost:3000
- 📚 **Swagger Documentation**: http://localhost:3000/api

## Testing the Application

### Option 1: Interactive Testing with Swagger UI (Recommended)

1. Open http://localhost:3000/api in your browser
2. You'll see the Swagger UI with all available endpoints
3. Click on any endpoint to expand it
4. Click "Try it out" to test the endpoint
5. Fill in the required fields and click "Execute"
6. Check the console logs to see cache HIT/MISS behavior

**Example: Testing Cache Behavior**

1. **Create a Pessoa**:
   - Go to `POST /pessoas`
   - Click "Try it out"
   - Use this example data:
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
   - Click "Execute" and copy the returned `id`

2. **Test Cache MISS**:
   - Go to `GET /pessoas/email/{email}`
   - Enter `joao.silva@example.com`
   - Click "Execute"
   - Check the console - you'll see: `❌ Cache MISS for email: joao.silva@example.com`

3. **Test Cache HIT**:
   - Execute the same request again
   - Check the console - you'll see: `✅ Cache HIT for email: joao.silva@example.com`

4. **Test Cache Eviction**:
   - Go to `PUT /pessoas/{id}`
   - Enter the ID from step 1
   - Update the age to 31
   - Click "Execute"
   - Check the console - you'll see: `🗑️ Cache evicted`

5. **Verify Cache was Evicted**:
   - Go back to `GET /pessoas/email/{email}`
   - Execute the request again
   - Check the console - you'll see: `❌ Cache MISS` (cache was cleared!)

### Option 2: Automated Test Script

Run the comprehensive test suite:

```bash
npx ts-node src/test-dao.ts
```

This executes 13 automated tests covering:
- CRUD operations
- Native SQL queries
- Cache HIT/MISS scenarios
- Automatic cache eviction
- Data cleanup

### Option 3: Manual Testing with curl

```bash
# Create a Pessoa
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

# Find by email (Cache MISS - first time)
curl http://localhost:3000/pessoas/email/joao.silva@example.com

# Find by email again (Cache HIT)
curl http://localhost:3000/pessoas/email/joao.silva@example.com

# Find by telefone (Cache MISS - first time)
curl http://localhost:3000/pessoas/telefone/\(11\)%2098765-4321

# Search by name
curl "http://localhost:3000/pessoas/search/by-name?nome=João"
```

## API Endpoints

| Method | Endpoint | Description | Caching |
|--------|----------|-------------|---------|
| POST | `/pessoas` | Create a new Pessoa | Evicts cache |
| GET | `/pessoas/:id` | Get Pessoa by ID | No cache |
| GET | `/pessoas/email/:email` | Find by email (native SQL) | ✅ Cached (5 min TTL) |
| GET | `/pessoas/telefone/:telefone` | Find by telefone (native SQL) | ✅ Cached (5 min TTL) |
| GET | `/pessoas/search/by-name?nome=xxx` | Search by name | No cache |
| PUT | `/pessoas/:id` | Update Pessoa | Evicts cache |
| DELETE | `/pessoas/:id` | Delete Pessoa | Evicts cache |

## Project Structure

```
src/
├── main.ts                 # Application entry point with Swagger config
├── app.module.ts          # Root module with cache and database config
├── prisma/
│   ├── prisma.module.ts   # Global Prisma module
│   └── prisma.service.ts  # Database connection factory
└── pessoa/
    ├── pessoa.module.ts           # Pessoa module
    ├── pessoa.dao.ts              # DAO with CRUD and caching logic
    ├── pessoa.controller.ts       # REST API endpoints
    └── dto/
        ├── create-pessoa.dto.ts   # Create DTO with validation
        ├── update-pessoa.dto.ts   # Update DTO
        └── pessoa-response.dto.ts # Response DTO
```

## Cache Implementation Details

### Cache Strategy

1. **SHA256 Cache Keys**: Generated from `SQL query + parameters`
   ```typescript
   const cacheKey = createHash('sha256')
     .update(sql + JSON.stringify(params))
     .digest('hex');
   ```

2. **Time-To-Live (TTL)**: 5 minutes (300 seconds)
   - Configurable via `CACHE_TTL_SECONDS` env variable

3. **Automatic Eviction**: Cache is cleared when:
   - A new Pessoa is created
   - An existing Pessoa is updated
   - A Pessoa is deleted

4. **Cache Storage**: In-memory using `cache-manager`
   - Fast access
   - No external dependencies
   - Max 100 items (configurable via `CACHE_MAX_ITEMS`)

### Cache Monitoring

All cache operations are logged to the console:
- ✅ `Cache HIT` - Data retrieved from cache
- ❌ `Cache MISS` - Data fetched from database
- 🗑️ `Cache evicted` - Cache cleared after write operation

## Database Schema

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

## Environment Variables

Create a `.env` file (or use `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/desafio2?schema=public"
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=100
NODE_ENV=development
PORT=3000
```

## Development Commands

```bash
# Install dependencies
npm install

# Start PostgreSQL database
docker-compose up -d

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run linter
npm run lint

# Run automated tests
npx ts-node src/test-dao.ts

# View Prisma Studio (database GUI)
npx prisma studio
```

## Challenge Requirements Checklist

✅ **DAO Class**: Implemented in `PessoaDao`
✅ **CRUD Methods**: `create`, `update`, `delete`, `getById`, `findByName`
✅ **Native SQL Methods**: `findByEmail`, `findByTelefone` using `$queryRaw`
✅ **Cache Implementation**: In-memory cache with `cache-manager`
✅ **SHA256 Cache Keys**: Hash of SQL query + parameters
✅ **TTL Configuration**: 5-minute cache expiration
✅ **Automatic Cache Eviction**: On create/update/delete operations
✅ **Prisma Connection Factory**: Using `PrismaService` with PostgreSQL adapter
✅ **Database**: PostgreSQL with Docker Compose

## Architecture Highlights

### Separation of Concerns

- **DAO Layer** (`pessoa.dao.ts`): Direct database access with caching logic
- **Controller Layer** (`pessoa.controller.ts`): HTTP request handling and validation
- **DTO Layer**: Input validation and API documentation

### Design Patterns

- **DAO Pattern**: Abstraction of data persistence
- **Dependency Injection**: NestJS IoC container
- **Repository Pattern**: Prisma ORM as data source abstraction
- **Factory Pattern**: PrismaService for database connections

### Best Practices

- ✅ Type safety with TypeScript
- ✅ Input validation with class-validator
- ✅ API documentation with Swagger/OpenAPI
- ✅ Consistent error handling
- ✅ Clean code structure
- ✅ Comprehensive logging
- ✅ Environment configuration
- ✅ Docker containerization

## License

This is a challenge project for Datacrazy evaluation.

## Author

Built with NestJS, Prisma, and intelligent caching strategies.
