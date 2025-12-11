# RxJS Migration for Socket.IO Events

## Overview

The BlockChess front-end has been migrated from direct Socket.IO client usage to RxJS-based reactive event management. This provides better composability, automatic subscription management, and improved testability.

## Architecture

### Before (Direct Socket.IO)

```typescript
// Direct event listeners
const socket = io(url);
socket.on('transaction:result', handleResult);
socket.emit('transaction:create_game', data);
socket.off('transaction:result', handleResult);
```

### After (RxJS)

```typescript
// Reactive observables
const { emit, transactionResult$ } = useSocketRxJS();
transactionResult$.subscribe(handleResult);
emit('transaction:create_game', data);
// Auto-cleanup on component unmount
```

## Key Components

### 1. SocketService (`lib/socket-service.ts`)

Singleton service that wraps Socket.IO client and exposes all events as RxJS observables.

**Features**:
- Singleton pattern for connection management
- All events exposed as observables
- Automatic connection state management
- Helper methods for filtering events

**Usage**:
```typescript
import { getSocketService } from '@/lib/socket-service';

const service = getSocketService();
service.connect(playerAddress);
service.transactionResult$.subscribe(handleResult);
service.emit('transaction:create_game', data);
```

### 2. useSocketRxJS Hook (`hooks/use-socket-rxjs.ts`)

React hook that provides easy access to socket service and observables.

**Returns**:
- `socketService`: The socket service instance
- `emit`: Function to emit events
- `isConnected$`: Observable for connection state
- `transactionResult$`: Observable for transaction results
- `transactionQueued$`: Observable for queued transactions
- `transactionProcessing$`: Observable for processing transactions
- `mintTaskQueued$`: Observable for mint task queued events
- `mintError$`: Observable for mint errors
- `mintNow$`: Observable for mint-now events
- `error$`: Observable for general errors
- `isConnected()`: Function to check connection status

**Usage**:
```typescript
const { emit, transactionResult$, isConnected$ } = useSocketRxJS();

// Subscribe to connection state
isConnected$.subscribe((connected) => {
  console.log('Connected:', connected);
});

// Emit events
emit('transaction:create_game', transactionData);
```

### 3. useTransactionEventsRxJS Hook (`hooks/use-transaction-events-rxjs.ts`)

Centralized hook for handling transaction events with notifications.

**Usage**:
```typescript
// In a component
useTransactionEventsRxJS(); // Automatically handles notifications
```

## Event Handling Patterns

### Filtering Events

```typescript
import { filter, take } from 'rxjs/operators';

// Filter by transaction ID
transactionResult$
  .pipe(
    filter((result) => result.transactionId === transactionId),
    take(1) // Auto-unsubscribe after first emission
  )
  .subscribe((result) => {
    // Handle result
  });
```

### Filtering by Prefix

```typescript
// Filter by transaction ID prefix
transactionResult$
  .pipe(
    filter((result) => result.transactionId.startsWith('create_game')),
    take(1)
  )
  .subscribe((result) => {
    // Handle create_game results
  });
```

### Using Service Helper Methods

```typescript
const { socketService } = useSocketRxJS();

// Use helper method
socketService
  .filterTransactionResult(transactionId)
  .pipe(take(1))
  .subscribe((result) => {
    // Handle result
  });
```

## Benefits

1. **Reactive Programming**: Declarative event handling
2. **Composability**: Easy to combine and transform event streams
3. **Automatic Cleanup**: Subscriptions are managed automatically
4. **Better Testing**: Observables are easier to mock and test
5. **Type Safety**: Full TypeScript support
6. **Operator Support**: Use RxJS operators for complex event handling

## Common RxJS Operators

- `filter`: Filter events by condition
- `take`: Take first N emissions then unsubscribe
- `takeUntil`: Unsubscribe when another observable emits
- `map`: Transform event data
- `debounceTime`: Debounce events
- `switchMap`: Switch to new observable
- `share`: Share subscription among multiple subscribers

## Testing

### Mocking Observables

```typescript
import { of } from 'rxjs';

jest.mock('@/lib/socket-service', () => ({
  getSocketService: jest.fn(() => ({
    transactionResult$: of({ transactionId: 'test', status: 'success' }),
    emit: jest.fn(),
  })),
}));
```

### Testing Subscriptions

```typescript
const { result } = renderHook(() => useSocketRxJS());

// Subscribe and verify
result.current.transactionResult$.subscribe((data) => {
  expect(data).toBeDefined();
});
```

## Troubleshooting

### Subscription Not Firing

- Check if socket is connected: `isConnected$`
- Verify event name matches server
- Check if subscription is set up before event is emitted

### Memory Leaks

- Always unsubscribe in cleanup functions
- Use `take(1)` for one-time subscriptions
- Use `takeUntil(destroy$)` for component lifecycle

### Connection Issues

- Check `NEXT_PUBLIC_WS_SERVER_URL` environment variable
- Verify server is running
- Check connection$ observable for state

## Resources

- [RxJS Documentation](https://rxjs.dev/)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [Reactive Programming Guide](https://rxjs.dev/guide/overview)

