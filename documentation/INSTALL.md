![Alt text](../app/public/brand.png "a title")

# Installation Guide

This guide will walk you through installing and running BlockChess locally or on a remote server.

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher (recommended: 20.x)
- **pnpm**: Package manager (install with `npm install -g pnpm`)
- **Docker & Docker Compose**: For database and containerized deployment (optional)
- **Sui CLI**: For building and deploying Move smart contracts

### Optional Software

- **PostgreSQL**: For production database (can use Docker instead)
- **SQLite**: For development (included with Node.js)

## Installation Methods

### Method 1: Docker (Recommended for Quick Start)

The easiest way to get started is using Docker Compose:

```bash
# Run the installation script
./install.sh
```

This script will:
1. Check Docker installation
2. Create `.env` file from template
3. Build Docker images
4. Start all services (PostgreSQL, Frontend)
5. Initialize database schema
6. Verify services are running

**Access the application**: http://localhost:3050

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Method 2: Manual Installation

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd blockchess
```

#### Step 2: Backend Setup (Sui Move)

```bash
cd back/blockchess

# Install Sui CLI (if not already installed)
# Follow instructions at: https://docs.sui.io/build/install

# Build the Move package
sui move build

# For testing
sui move test
```

**Sui Client Commands**:
- `sui move build` - Build the smart contracts
- `sui move test` - Run Move unit tests
- `sui client publish` - Publish package to network
- `sui client call` - Call Move functions

#### Step 3: Frontend Setup

```bash
cd front/app

# Install dependencies
pnpm install

# Verify Node.js version
node --version  # Should be 18.x or higher
```

#### Step 4: Database Setup

BlockChess supports two database options:

##### Option A: PostgreSQL (Recommended for Production)

1. **Install PostgreSQL** (or use Docker):
   ```bash
   # Using Docker
   docker run --name blockchess-postgres \
     -e POSTGRES_DB=blockchess_db \
     -e POSTGRES_USER=blockchess \
     -e POSTGRES_PASSWORD=your_password \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Initialize Schema**:
   ```bash
   # Copy schema file to PostgreSQL
   psql -U blockchess -d blockchess_db -f sql/postgres/schema.sql
   
   # Or using Docker
   docker exec -i blockchess-postgres psql -U blockchess -d blockchess_db < sql/postgres/schema.sql
   ```

3. **Create Computer Player**:
   ```sql
   -- Connect to database
   psql -U blockchess -d blockchess_db
   
   -- Insert computer player (HAL)
   INSERT INTO players (id, name, sui_address, created_at)
   VALUES ('computer-player', 'HAL', NULL, NOW());
   
   -- Copy the ID (should be 'computer-player')
   -- Add to your .env file as NEXT_PUBLIC_HAL_ID=computer-player
   ```

##### Option B: SQLite (Recommended for Development)

1. **Initialize Database**:
   ```bash
   # The database will be created automatically on first run
   # Or manually create it:
   sqlite3 data/blockchess.db < sql/sqlite/schema.sql
   ```

2. **Create Computer Player**:
   ```bash
   sqlite3 data/blockchess.db
   ```
   ```sql
   INSERT INTO players (id, name, sui_address, created_at)
   VALUES ('computer-player', 'HAL', NULL, strftime('%s', 'now') * 1000);
   
   -- Copy the ID and add to .env as NEXT_PUBLIC_HAL_ID=computer-player
   ```

#### Step 5: Environment Configuration

Create a `.env` file in the `front/app` directory:

```env
# Database Configuration
DATABASE_TYPE=postgres  # or 'sqlite'
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=blockchess_db
POSTGRES_USER=blockchess
POSTGRES_PASSWORD=your_password
SQLITE_PATH=./data/blockchess.db

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3050
PORT=3050

# SUI Blockchain Configuration
NEXT_PUBLIC_SUI_NETWORK_TYPE=testnet  # localnet, testnet, or mainnet
NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID=your_package_id
NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID=your_package_id
NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID=your_package_id
NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL=https://sui-testnet.mystenlabs.com/graphql

# Computer Player Configuration
NEXT_PUBLIC_HAL_ID=computer-player

# Storage Keys
NEXT_PUBLIC_STORAGE_QUEUE=mint-queue
NEXT_PUBLIC_STORAGE_PIXEL=pixel-font

# Cookie Configuration
NEXT_PUBLIC_COOKIE_NAME=blockchess-player
```

#### Step 6: Wallet Setup

To get your Sui address from the local server:

1. **Start the Development Server**:
   ```bash
   cd front/app
   pnpm dev
   ```

2. **Connect Your Wallet**:
   - Open http://localhost:3050
   - Click "Connect" in the navigation
   - Select your Sui wallet (Sui Wallet, Suiet, etc.)
   - Approve the connection

3. **Get Your Address**:
   - Once connected, your Sui address will be displayed in the navigation
   - Copy this address for use in testing or development

**Alternative Method** (using Sui CLI):
```bash
# List active addresses
sui client active-address

# Get address details
sui client active-env
```

#### Step 7: Run the Application

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

The application will be available at http://localhost:3050

## Database Structure

### Tables

- **players**: Stores player information (human players and computer player)
- **games**: Stores game metadata and state
- **moves**: Stores individual chess moves for each game
- **rewards**: Stores player achievements (NFT badges)
- **mint_queue**: Stores pending NFT minting tasks

### Schema Files

- **PostgreSQL**: `front/app/sql/postgres/schema.sql`
- **SQLite**: `front/app/sql/sqlite/schema.sql`

Both schemas are equivalent and provide the same functionality.

### Database Migrations

For SQLite, run migrations if needed:
```bash
cd front/app
node scripts/migrate-sqlite-schema.js
```

## Verification

### Check Backend (Sui Move)

```bash
cd back/blockchess
sui move build  # Should complete without errors
sui move test   # Should pass all tests
```

### Check Frontend

```bash
cd front/app
pnpm typecheck  # TypeScript type checking
pnpm lint       # Linting
pnpm test       # Unit tests
```

### Check Database Connection

```bash
# PostgreSQL
psql -U blockchess -d blockchess_db -c "SELECT COUNT(*) FROM players;"

# SQLite
sqlite3 data/blockchess.db "SELECT COUNT(*) FROM players;"
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify database is running
   - Check connection credentials in `.env`
   - Ensure schema is initialized

2. **Sui Package Not Found**:
   - Run `sui move build` in `back/blockchess`
   - Verify package IDs in `.env`

3. **Port Already in Use**:
   - Change `PORT` in `.env`
   - Or stop the process using port 3050

4. **Computer Player Not Found**:
   - Verify `NEXT_PUBLIC_HAL_ID` in `.env`
   - Check that computer player exists in database
   - Re-run the computer player creation SQL

### Getting Help

- Check the [BLOCKCHAIN.md](./BLOCKCHAIN.md) for blockchain-specific issues
- Review [TESTS.md](./TESTS.md) to verify your setup
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment

## Next Steps

- Read [GAMEPLAY.md](./GAMEPLAY.md) to learn how to play
- Check [BLOCKCHAIN.md](./BLOCKCHAIN.md) to understand the blockchain integration
- Explore [EASTER_EGGS.md](./EASTER_EGGS.md) for hidden features

