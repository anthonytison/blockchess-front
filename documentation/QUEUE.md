![Alt text](../app/public/brand.png "a title")

# Queue System

BlockChess implements a sophisticated queue system for managing NFT minting operations. This document explains why we use a queue system and how it works.

## Why a Queue System?

### Problem Statement

Without a queue system, NFT minting would face several challenges:

1. **Blockchain Limitations**:
   - Transactions take time to confirm
   - Network congestion can cause delays
   - Gas costs vary with network load
   - Rate limits on RPC endpoints

2. **User Experience**:
   - Users shouldn't wait for blockchain confirmations during gameplay
   - Multiple rewards earned simultaneously need coordination
   - Failed transactions need retry logic
   - Users may close browser before mint completes

3. **Technical Challenges**:
   - Concurrent mint requests need sequencing
   - Error recovery and retry mechanisms
   - State persistence across page reloads
   - Cost optimization through batching

### Solution: Queue System

The queue system addresses these challenges by:

- **Asynchronous Processing**: Mint operations don't block gameplay
- **Sequential Execution**: Prevents conflicts and manages gas costs
- **Error Recovery**: Automatic retries with exponential backoff
- **State Persistence**: Queue survives page reloads
- **User Notifications**: Real-time updates on mint status

## Architecture

### Components

1. **Client-Side Queue** (`MintQueueProcessor`):
   - Manages local queue in browser
   - Processes tasks sequentially
   - Handles user wallet interactions
   - Persists queue in localStorage

2. **Server-Side Queue** (`mint_queue` table):
   - Database-backed queue for reliability
   - Tracks task status (pending, processing, completed, failed)
   - Coordinates with Socket.IO for real-time updates
   - Handles server-side processing if needed

3. **Socket.IO Integration**:
   - Real-time communication between client and server
   - Notifies users of queue status
   - Coordinates mint operations
   - Handles disconnection recovery

### Queue Flow

```
User Earns Reward
    ↓
Check if Already Minted
    ↓
Enqueue Task (Client + Server)
    ↓
Queue Processor Picks Up Task
    ↓
Create Transaction
    ↓
User Signs Transaction
    ↓
Execute on Blockchain
    ↓
Wait for Confirmation
    ↓
Update Database
    ↓
Notify User
    ↓
Remove from Queue
```

## Implementation Details

### Client-Side Queue

**Location**: `front/app/src/lib/mint-queue.ts`

**Features**:
- LocalStorage persistence
- Sequential processing
- Retry logic
- Duplicate prevention

**Usage**:
```typescript
const mintQueue = new MintQueue();
mintQueue.initialize(mintNftFunction);
mintQueue.enqueue('first_game', player);
```

### Server-Side Queue

**Location**: `front/app/src/app/actions/mint-queue.ts`

**Database Table**: `mint_queue`

**Schema**:
```sql
CREATE TABLE mint_queue (
    id TEXT PRIMARY KEY,
    reward_type TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_sui_address TEXT NOT NULL,
    status TEXT NOT NULL,  -- pending, processing, completed, failed
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP
);
```

**Status Flow**:
- `pending`: Task queued, waiting for processing
- `processing`: Currently being processed
- `completed`: Successfully minted
- `failed`: Minting failed (after retries)

### Socket.IO Events

**Client → Server**:
- `mint-completed`: Notify server of successful mint
- `mint-failed`: Notify server of failed mint

**Server → Client**:
- `mint-task-queued`: New task added to queue
- `mint-now`: Process this task now
- `mint-status`: Update on mint status

## Processing Logic

### Sequential Processing

Tasks are processed one at a time per player:

1. **Get Next Task**: Fetch oldest pending task for player
2. **Mark Processing**: Update status to 'processing'
3. **Emit Event**: Notify client to process task
4. **Wait for Completion**: Wait for client response
5. **Update Status**: Mark as completed or failed
6. **Process Next**: Continue with next task

### Retry Logic

Failed transactions are retried:

```typescript
const maxRetries = 3;
const delayBetweenMints = 1500; // ms

// Exponential backoff
delay = delay * (1.5 ^ retryCount);
```

### Duplicate Prevention

Before enqueueing, the system checks:

1. **Reward Already Exists**: Check if NFT already minted
2. **Task Already Queued**: Check for pending/processing tasks
3. **Player Validation**: Verify player has Sui address

## Error Handling

### Transaction Failures

When a transaction fails:

1. **Capture Error**: Log error details
2. **Update Status**: Mark task as failed
3. **Notify User**: Show error message
4. **Retry Logic**: Automatic retry if retries remaining
5. **Manual Retry**: User can manually retry failed tasks

### Network Issues

Handles network problems:

- **Connection Loss**: Queue persists, resumes on reconnect
- **Timeout**: Retry with exponential backoff
- **RPC Errors**: Fallback to alternative endpoints

### User Disconnection

If user disconnects:

- Queue persists in database
- Tasks remain in 'pending' or 'processing'
- User can resume on reconnection
- Server can process tasks if configured

## Benefits

### For Users

- **Non-Blocking**: Continue playing while mints process
- **Reliable**: Queue survives page reloads
- **Transparent**: Real-time status updates
- **Automatic**: No manual intervention needed

### For Developers

- **Maintainable**: Clear separation of concerns
- **Testable**: Queue logic is isolated
- **Scalable**: Can add server-side processing
- **Debuggable**: Clear status tracking

### For System

- **Efficient**: Prevents duplicate mints
- **Cost-Effective**: Manages gas costs
- **Resilient**: Handles failures gracefully
- **Observable**: Full audit trail

## Configuration

### Environment Variables

```env
# Queue storage key
NEXT_PUBLIC_STORAGE_QUEUE=mint-queue

# Processing delays
MINT_QUEUE_DELAY=1500  # ms between mints
MINT_QUEUE_MAX_RETRIES=3
```

### Tuning Parameters

- **Delay Between Mints**: Adjust based on network speed
- **Max Retries**: Balance between reliability and user experience
- **Batch Size**: Future: process multiple tasks together
- **Timeout**: How long to wait for transaction confirmation

## Monitoring

### Queue Status

Check queue status:

```sql
-- Pending tasks
SELECT COUNT(*) FROM mint_queue WHERE status = 'pending';

-- Processing tasks
SELECT COUNT(*) FROM mint_queue WHERE status = 'processing';

-- Failed tasks
SELECT COUNT(*) FROM mint_queue WHERE status = 'failed';
```

### Metrics

Track:
- Average processing time
- Success rate
- Retry count
- Queue length

## Future Improvements

1. **Redis Queue**: Move to Redis for better scalability
2. **Batch Processing**: Process multiple mints in one transaction
3. **Priority Queue**: Prioritize certain reward types
4. **Server-Side Processing**: Process mints server-side with sponsored transactions
5. **Analytics**: Detailed queue metrics and dashboards

## Troubleshooting

### Queue Not Processing

1. Check browser console for errors
2. Verify wallet is connected
3. Check network connection
4. Verify queue has tasks: `localStorage.getItem('mint-queue')`

### Stuck Tasks

1. Check database for tasks in 'processing' status
2. Manually update status if needed
3. Clear localStorage queue if corrupted
4. Restart application

### Duplicate Mints

1. Check duplicate prevention logic
2. Verify reward existence check
3. Review transaction history
4. Check for race conditions

## Related Documentation

- [BLOCKCHAIN.md](./BLOCKCHAIN.md) - Blockchain integration details
- [GAMEPLAY.md](./GAMEPLAY.md) - How rewards are earned
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment considerations

