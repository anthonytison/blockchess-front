![Alt text](./app/public/brand.png "a title")

A decentralized chess game built on the Sui blockchain, combining on-chain game state management with off-chain database storage for optimal performance and user experience.

## About the Author

**Anthony Tison** - Lead Fullstack Engineer

- **LinkedIn**: [https://www.linkedin.com/in/anthonytison/](https://www.linkedin.com/in/anthonytison/)
- **GitHub**: [https://github.com/anthonytison](https://github.com/anthonytison)

I'm a passionate fullstack engineer with expertise in modern web technologies, blockchain development. BlockChess is my first try with the blockchain. I tried to combine traditional game mechanics with blockchain technology to create an engaging, decentralized gaming experience.

## Version 
**1.2**

### Version 1.2 Changes
- **Documentation Updates**: Added missing documentation files and improved organization
  - Added RxJS Migration guide
  - Updated deployment documentation
  - Removed GitHub Actions references
- **CI/CD Changes**: Removed GitHub Actions workflows in favor of manual deployment

### Version 1.1 Changes
- **WebSocket Integration**: Real-time communication with ws-server for transaction processing
- **Transaction Sponsoring**: All blockchain transactions now processed via ws-server (users don't pay gas)
- **Queue System Migration**: Queue processing moved from frontend to ws-server for better reliability
- **Enhanced Architecture**: Improved clean architecture compliance and separation of concerns
- **Badge Registry Tools**: Scripts for finding and managing badge registry on-chain

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes. 

## Game Concept

BlockChess is a hybrid chess game that leverages both on-chain and off-chain components:

### On-Chain Components (Sui Blockchain)
- **Game State**: Game creation, moves, and completion are recorded on the Sui blockchain
- **Rewards System**: Achievement badges are minted as NFTs on Sui when players reach milestones
- **Transparency**: All game outcomes and achievements are publicly verifiable on-chain
- **Ownership**: Players truly own their achievements as NFTs stored in their wallets

### Off-Chain Components (Database)
- **Game History**: Detailed move-by-move game history stored in PostgreSQL or SQLite
- **Player Statistics**: Win/loss records, game counts, and performance metrics
- **Real-time Gameplay**: Fast, responsive chess engine running off-chain for smooth user experience
- **Session Management**: Active game sessions and temporary state management

This hybrid approach ensures:
- **Fast Performance**: Chess moves are processed instantly without waiting for blockchain confirmation
- **Cost Efficiency**: Only critical game events (creation, completion, rewards) are stored on-chain
- **Rich Features**: Detailed analytics and game replay capabilities through database storage
- **Blockchain Benefits**: Immutable record of achievements and game outcomes

## Blockchain

BlockChess is built on the **Sui blockchain**, a high-performance Layer 1 blockchain designed for instant settlement and low transaction costs. Sui's object-centric model and Move programming language make it ideal for gaming applications.

For detailed information about the blockchain integration, see [BLOCKCHAIN.md](./documentation/BLOCKCHAIN.md).

## Architecture

BlockChess follows **Clean Architecture** principles, ensuring separation of concerns, testability, and maintainability:

```
app/src/
├── domain/          # Core business logic and entities
├── use-cases/       # Application-specific business rules
├── adapters/        # Infrastructure implementations (PostgreSQL, SQLite)
├── ports/           # Interfaces defining contracts
├── components/      # React UI components
├── hooks/           # React hooks for state management
└── lib/             # Shared utilities and services
```

### Key Principles

- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each module has one clear purpose
- **Interface Segregation**: Small, focused interfaces
- **Testability**: Business logic is independent of frameworks

The architecture supports multiple database backends (PostgreSQL and SQLite) through adapter pattern, making it easy to switch or support both simultaneously.

## Documentation

- **[INSTALL.md](./documentation/INSTALL.md)** - Complete installation and setup guide
- **[BLOCKCHAIN.md](./documentation/BLOCKCHAIN.md)** - Sui blockchain integration details
- **[QUEUE.md](./documentation/QUEUE.md)** - Mint queue system explanation
- **[GAMEPLAY.md](./documentation/GAMEPLAY.md)** - How to play, rules, and rewards
- **[SOON.md](./documentation/SOON.md)** - Upcoming features and roadmap
- **[TESTS.md](./documentation/TESTS.md)** - Testing documentation and how to run tests
- **[DEPLOYMENT.md](./documentation/DEPLOYMENT.md)** - Deployment guide
- **[EASTER_EGGS.md](./documentation/EASTER_EGGS.md)** - Hidden features and easter eggs
- **[RXJS_MIGRATION.md](./documentation/RXJS_MIGRATION.md)** - RxJS migration guide for Socket.IO events

## Quick Start

1. **Install Dependencies**
   ```bash
   # Backend (Sui Move)
   cd ../blockchess-sui
   sui move build

   # Frontend
   cd app
   pnpm install
   ```

2. **Set Up Database**
   - See [INSTALL.md](./documentation/INSTALL.md) for detailed database setup instructions

3. **Configure Environment**
   - Copy `.env.example` to `.env` in the `app` directory and fill in your configuration
   - See [INSTALL.md](./documentation/INSTALL.md) for required environment variables

4. **Run the Application**
   ```bash
   cd app
   # Development
   pnpm dev

   # Production
   pnpm build && pnpm start
   ```

For complete installation instructions, see [INSTALL.md](./documentation/INSTALL.md).

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Backend**: Sui Move smart contracts
- **Database**: PostgreSQL (production) / SQLite (development)
- **Blockchain**: Sui (localnet/testnet/mainnet)
- **Testing**: Jest, Playwright
- **Package Manager**: pnpm

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

<em>By the way, ☠️ Michael Jackson didn't come over to my house to use the bathroom.</em>