# Changelog - BlockChess Frontend

## [1.1] - 2024

### Added
- **WebSocket Integration**: Real-time communication with ws-server for transaction processing
  - RxJS-based reactive event handling
  - Automatic reconnection on disconnect
  - Real-time transaction status updates
- **Transaction Sponsoring**: All transactions now processed via ws-server
  - Users no longer need to sign transactions or pay gas
  - Better user experience with background processing
  - Automatic error handling and retries
- **Queue Management**: Client-side queue processor for NFT minting
  - Sequential processing of mint requests
  - Persistent queue state
  - Automatic retry on failures
- **Badge Registry Management**: Tools for finding and managing badge registry
  - Script to find badge registry object ID
  - Support for multiple networks (localnet, testnet, mainnet)
- **GraphQL Support**: Optional GraphQL queries for better performance
  - Falls back to RPC when GraphQL unavailable
  - Faster event queries when indexer is available

### Changed
- **Transaction Flow**: Moved from client-side signing to server-side processing
  - Transactions sent to ws-server instead of direct blockchain interaction
  - Queue-based processing for reliability
  - Better error handling and user feedback
- **Database Configuration**: Support for both SQLite and PostgreSQL
  - SQLite for local development (default)
  - PostgreSQL for production
  - Automatic database adapter selection
- **Architecture**: Improved clean architecture compliance
  - Better separation of concerns
  - Ports and adapters pattern maintained
  - Use cases properly isolated

### Removed
- Client-side transaction signing (now handled by ws-server)
- Direct gas fee payment from users
- Manual transaction retry logic (now automatic)

### Configuration
- New environment variables:
  - `NEXT_PUBLIC_WS_SERVER_URL`: WebSocket server URL
  - `DATABASE_TYPE`: Database type (sqlite or postgres)
  - `SQLITE_DB_PATH`: Path to SQLite database file
  - Network-specific package IDs and badge registry IDs

### Documentation
- Updated blockchain integration documentation
- Added queue system documentation
- Updated installation instructions
- Added `.env.example` with all required variables
- Documented transaction sponsoring process
- Added badge registry management guide

### Bug Fixes
- Fixed race conditions in transaction processing
- Improved error handling for network issues
- Better handling of GraphQL fallback scenarios
- Fixed queue processing edge cases

### Performance
- Improved transaction query performance with GraphQL
- Better caching of blockchain data
- Optimized queue processing

### Notes
- **Breaking Change**: The frontend now requires a running ws-server
- All blockchain transactions must go through the ws-server
- The `NEXT_PUBLIC_WS_SERVER_URL` environment variable is required
- Database can be switched between SQLite and PostgreSQL via `DATABASE_TYPE`

---

## [1.0] - Initial Release

### Features
- Chess game interface with board visualization
- Game creation and management
- Move history and replay
- Player profiles and statistics
- Reward system with NFT badges
- Multi-language support (English, French)
- Dark mode support
- Responsive design

