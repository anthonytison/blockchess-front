![Alt text](../app/public/brand.png "a title")

# Blockchain Integration

BlockChess integrates with the Sui blockchain to store game state, manage achievements, and mint reward NFTs. This document explains how the blockchain integration works.

## Sui Connection

### Network Configuration

BlockChess supports three Sui networks:

- **localnet**: Local development network
- **testnet**: Sui testnet (default for development)
- **mainnet**: Sui mainnet (production)

Network configuration is managed through environment variables:

```env
NEXT_PUBLIC_SUI_NETWORK_TYPE=testnet
NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID=0x...
NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL=https://sui-testnet.mystenlabs.com/graphql
```

### Sui Client

The application uses `@mysten/sui` and `@mysten/dapp-kit` for blockchain interactions:

```typescript
// Client initialization
const suiClient = useSuiClient();
const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
```

The Sui client is configured through the `SuiClientProvider` which supports multiple networks and automatic network switching.

## Queries

### GraphQL Queries

When available, BlockChess uses GraphQL for efficient data querying. GraphQL requires the Sui indexer to be running and properly configured.

**Setup Requirements**:
- Sui node started with `--with-indexer --with-graphql` flags
- PostgreSQL database with indexer tables initialized
- GraphQL endpoint accessible (default: `http://127.0.0.1:8000/graphql` for localnet)

```typescript
const graphqlClient = new SuiGraphQLClient({ 
  url: process.env.NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL 
});
```

**Benefits of GraphQL**:
- Efficient data fetching with only required fields
- Real-time subscriptions support
- Better performance for complex queries
- Type-safe queries
- Indexed data for faster lookups

**Local Development**:
For local development, set the GraphQL URL to:
```env
NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL=http://127.0.0.1:8000/graphql
```

### RPC Queries

When GraphQL is not available, the application falls back to Sui RPC queries:

```typescript
// Get transaction block
const txResponse = await suiClient.getTransactionBlock({
  digest,
  options: {
    showEffects: true,
    showObjectChanges: true,
    showEvents: true,
  },
});
```

**RPC Methods Used**:
- `getTransactionBlock`: Fetch transaction details
- `getObject`: Get object data
- `queryEvents`: Query blockchain events
- `signAndExecuteTransaction`: Execute transactions

## Smart Contracts

### Game Contract

The main game contract (`game.move`) provides:

**Functions**:
- `create_game`: Create a new chess game on-chain
- `join_game`: Join a versus game
- `make_move`: Record a move on-chain
- `end_game`: Finalize game with winner and result
- `cancel_game`: Cancel an active game

**Events**:
- `GameCreated`: Emitted when a game is created
- `PlayerJoined`: Emitted when player2 joins
- `MovePlayed`: Emitted for each move
- `GameEnded`: Emitted when game completes
- `GameCancelled`: Emitted when game is cancelled

### Badge Contract

The badge contract (`badge.move`) handles NFT minting for achievements:

**Functions**:
- `mint_badge`: Mint a reward badge NFT
- `transfer_badge`: Transfer badge ownership

## Actions

### Game Actions

1. **Create Game**:
   ```typescript
   const transaction = createGameTransaction({
     mode: 'solo' | 'versus',
     difficulty: 'easy' | 'intermediate' | 'hard',
   });
   await signAndExecuteTransaction(transaction);
   ```

2. **Make Move**:
   ```typescript
   const transaction = makeMoveTransaction({
     gameId: string,
     moveSan: string,
     fen: string,
     moveHash: string,
   });
   await signAndExecuteTransaction(transaction);
   ```

3. **End Game**:
   ```typescript
   const transaction = endGameTransaction({
     gameId: string,
     winner: address | null,
     result: '1-0' | '0-1' | '1/2-1/2',
     finalFen: string,
   });
   await signAndExecuteTransaction(transaction);
   ```

### Reward Actions

1. **Mint Badge**:
   ```typescript
   const transaction = mintNftTransaction({
     badgeType: string,
     playerAddress: string,
   });
   await signAndExecuteTransaction(transaction);
   ```

## Queue System

BlockChess uses a queue system for NFT minting to handle:

- **Rate Limiting**: Prevents overwhelming the blockchain
- **Error Handling**: Retries failed transactions
- **User Experience**: Non-blocking mint operations
- **Cost Management**: Batches operations when possible

For detailed information, see [QUEUE.md](./QUEUE.md).

### Queue Flow

1. **Enqueue**: Reward earned → Task added to queue
2. **Process**: Queue processor picks up task
3. **Mint**: Transaction created and executed
4. **Verify**: Wait for transaction confirmation
5. **Update**: Database updated with NFT object ID
6. **Notify**: User receives notification

## Transaction Handling

### Transaction Lifecycle

1. **Create**: Build transaction using Move functions
2. **Sign**: User signs with their wallet
3. **Execute**: Transaction submitted to network
4. **Wait**: Poll for transaction confirmation
5. **Verify**: Check transaction status and effects
6. **Index**: Wait for transaction to be indexed (if using GraphQL)

### Error Handling

```typescript
try {
  const result = await signAndExecuteTransaction(transaction);
  await waitForTransaction(result.digest);
} catch (error) {
  // Handle transaction failure
  // Retry logic or user notification
}
```

### Transaction Waiting

The application implements smart waiting strategies:

```typescript
const waitForTransaction = async (
  digest: string,
  maxRetries = 10,
  delay = 1000
) => {
  // Try GraphQL first (faster)
  // Fallback to RPC if GraphQL unavailable
  // Exponential backoff for retries
};
```

## Events

### Listening to Events

BlockChess listens to blockchain events for:

- **Game State Changes**: Game created, joined, ended
- **Move Events**: Each move recorded on-chain
- **Reward Events**: Badge minting completion

### Event Processing

Events are processed asynchronously:

1. Transaction executed
2. Event emitted on-chain
3. Application queries events
4. Database updated
5. UI refreshed

## Package Management

### Deploying Contracts

```bash
cd back/blockchess

# Build
sui move build

# Publish to network
sui client publish --gas-budget 100000000

# Note the package ID and update .env
```

### Package IDs

Package IDs are network-specific:

- **Localnet**: Deploy locally, get ID from publish output
- **Testnet**: Deploy to testnet, update `NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID`
- **Mainnet**: Deploy to mainnet, update `NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID`

## Best Practices

1. **Gas Budget**: Set appropriate gas budgets for transactions
2. **Error Handling**: Always handle transaction failures gracefully
3. **Confirmation**: Wait for transaction confirmation before updating UI
4. **Indexing**: Use GraphQL when available for better performance
5. **Retries**: Implement retry logic for transient failures
6. **User Feedback**: Show clear status messages during transactions

## Security Considerations

1. **Input Validation**: Validate all inputs before creating transactions
2. **Access Control**: Verify user permissions before executing actions
3. **Transaction Verification**: Verify transaction results before trusting them
4. **Error Messages**: Don't expose sensitive information in error messages
5. **Rate Limiting**: Prevent abuse through queue system

## Local Development Setup

### Starting Local Sui Network

To start a local Sui network with faucet, indexer, and GraphQL support:

```bash
RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis --with-indexer --with-graphql
```

This command:
- Starts a local Sui node with faucet enabled
- Forces regenesis (clears previous state)
- Enables the indexer for transaction indexing
- Enables GraphQL server for efficient queries

**Default Endpoints**:
- RPC: `http://127.0.0.1:9000`
- GraphQL: `http://127.0.0.1:8000/graphql`
- Faucet: `http://127.0.0.1:9123/gas`

### Sui Explorer for Local Development

The Sui Explorer tool allows you to inspect transactions, objects, and addresses on your local network.

Follow the instructions for installing the Sui Explorer on your local machine. [Github](https://github.com/suiware/sui-explorer)

**Access Local Explorer**:
- Navigate to `http://localhost:3050` (if running locally)
- Or use the official Sui Explorer pointing to your local network

**Features**:
- View transaction details and digests
- Inspect object data and ownership
- Check account balances and transactions
- Monitor events and state changes
- Debug transaction failures

**Usage**:
1. Start your local Sui network (see above)
2. Execute transactions in your application
3. Copy the transaction digest
4. Search for it in the explorer to view full details

### Database Setup for GraphQL Indexer

The Sui indexer requires a PostgreSQL database to store indexed blockchain data. The indexer enables GraphQL queries by maintaining an indexed view of the blockchain state.

**Prerequisites**:
- PostgreSQL database running (can use the same instance as your application)
- Database user with CREATE TABLE permissions

**Setup Steps**:

1. **Create Database (if using separate database)**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database for indexer
CREATE DATABASE sui_indexer;

# Or use existing database
# The indexer can use the same database as your application
```

2. **Start Sui with Indexer**:
When you start Sui with `--with-indexer`, it will automatically:
- Connect to the default PostgreSQL instance
- Create the necessary `sui_indexer` schema and tables
- Begin indexing transactions and objects

3. **Verify Indexer Tables**:
```bash
# Connect to your PostgreSQL database
psql -U blockchess -d blockchess_db

# Or using docker exec
docker exec -it blockchess-postgres psql -U blockchess -d blockchess_db
```

```sql
-- Check if indexer schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'sui_indexer';

-- Check indexer tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'sui_indexer';

-- Common indexer tables include:
-- - transactions
-- - objects
-- - events
-- - packages
-- - checkpoints
```

4. **Configure Indexer Database Connection** (if needed):
If the indexer needs to connect to a specific database, you can configure it:

```env
# Environment variable for indexer database URL
SUI_INDEXER_DB_URL=postgresql://blockchess:blockchess_password_change_me@localhost:5432/blockchess_db
```

**Note**: The indexer creates its own schema (`sui_indexer`) within the database, so it can coexist with your application tables. Ensure your PostgreSQL instance has sufficient resources for both the application and indexer workloads.

## Testing

### Local Testing

```bash
# Start local Sui network with all features
RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis --with-indexer --with-graphql

# Deploy contracts
sui client publish --gas-budget 100000000

# Run tests
sui move test
```

### Testnet Testing

1. Get testnet SUI from faucet
2. Deploy contracts to testnet
3. Update package IDs in `.env`
4. Test all functionality

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Sui Move Language](https://docs.sui.io/build/move)
- [Sui TypeScript SDK](https://github.com/MystenLabs/sui/tree/main/sdk/typescript)
- [Sui GraphQL](https://docs.sui.io/build/graphql)

