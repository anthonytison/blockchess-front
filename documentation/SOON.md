![Alt text](../app/public/brand.png "a title")

# Coming Soon

This document outlines upcoming features and improvements planned for BlockChess.

## Next Version

### Websocket Server with SUI Integration

**Status**: Planned

**Description**:
A dedicated WebSocket server that will handle real-time game communication and blockchain integration separately from the frontend application.

**Benefits**:
- Better scalability
- Improved performance
- Separation of concerns
- Easier maintenance

**Features**:
- Real-time game state synchronization
- Live move broadcasting
- Connection management
- Automatic reconnection handling

### SUI Sponsoring System

**Status**: Planned

**Description**:
Implement a gas sponsorship system so players don't need to pay for blockchain transactions themselves.

**Benefits**:
- Better user experience (no gas fees)
- Lower barrier to entry
- Sponsored by platform or sponsors
- Seamless gameplay

**Implementation**:
- Sponsor wallet for gas payments
- Transaction sponsorship API
- Gas budget management
- Sponsor selection system

## Future Features

### Online Versus with WebSocket

**Status**: Planned

**Description**:
Enhanced real-time multiplayer experience with WebSocket connections for instant move synchronization.

**Features**:
- Real-time move updates
- Live game state
- Connection status indicators
- Automatic reconnection
- Spectator mode

**Benefits**:
- Instant move updates
- Better multiplayer experience
- Reduced latency
- Real-time notifications

### Redis Queue System

**Status**: Planned

**Description**:
Migrate the mint queue system from database to Redis for better performance and scalability.

**Benefits**:
- Faster queue processing
- Better scalability
- Distributed queue support
- Improved reliability
- Advanced queue features

**Features**:
- Redis-backed queue
- Priority queues
- Delayed jobs
- Job retry mechanisms
- Queue monitoring

### Analytics & Insights

**Status**: Thinking of it

**Features**:
- **Game Analytics**: Detailed game statistics
- **Move Analysis**: Analyze your moves
- **Performance Tracking**: Track improvement over time
- **Opening Repertoire**: Track your opening choices
- **Endgame Statistics**: Analyze endgame performance


## Timeline

### Phase 1 (Current)
- ✅ Core game functionality
- ✅ Basic rewards system
- ✅ Solo and versus modes
- ✅ Database integration

### Phase 2 (Next)
- 🔄 WebSocket server
- 🔄 SUI sponsoring system
- 🔄 Enhanced queue system
- 🔄 Improved blockchain integration

## Stay Updated

- **GitHub**: Watch the repository for updates
- **Releases**: Check release notes for new features
- **Documentation**: Documentation is updated with each release