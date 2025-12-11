import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { share, takeUntil } from 'rxjs/operators';
import { TransactionResult } from '@/types/transactions';

/**
 * RxJS-based Socket.IO service
 * Wraps Socket.IO client with RxJS observables for reactive event management
 */
class SocketService {
  private socket: Socket | null = null;
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  // Event observables
  public readonly connection$: Observable<boolean>;
  public readonly transactionResult$: Observable<TransactionResult>;
  public readonly transactionQueued$: Observable<{ transactionId: string; status: string }>;
  public readonly transactionProcessing$: Observable<{ transactionId: string; status: string }>;
  public readonly mintTaskQueued$: Observable<{ taskId: string; rewardType: string; playerId?: string; playerSuiAddress?: string }>;
  public readonly mintError$: Observable<{ error: string; rewardType: string }>;
  public readonly mintNow$: Observable<{ taskId: string; rewardType: string; playerId: string; playerSuiAddress: string }>;
  public readonly error$: Observable<{ error: string; transactionId?: string }>;

  constructor() {
    this.connection$ = this.connectionSubject.asObservable();

    // Create observables from socket events
    // These will be populated when socket is connected
    this.transactionResult$ = this.createEventObservable<TransactionResult>('transaction:result');
    this.transactionQueued$ = this.createEventObservable<{ transactionId: string; status: string }>('transaction:queued');
    this.transactionProcessing$ = this.createEventObservable<{ transactionId: string; status: string }>('transaction:processing');
    this.mintTaskQueued$ = this.createEventObservable<{ taskId: string; rewardType: string }>('mint-task-queued');
    this.mintError$ = this.createEventObservable<{ error: string; rewardType: string }>('mint-error');
    this.mintNow$ = this.createEventObservable<{ taskId: string; rewardType: string; playerId: string; playerSuiAddress: string }>('mint-now');
    this.error$ = this.createEventObservable<{ error: string; transactionId?: string }>('error');
  }

  /**
   * Create an observable from a socket event
   * This creates a hot observable that will emit events when socket is connected
   */
  private createEventObservable<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => {
        subscriber.next(data);
      };

      // Attach handler when socket exists and is connected
      const attachHandler = () => {
        if (this.socket && this.socket.connected) {
          this.socket.on(eventName, handler);
        }
      };

      // If socket already exists and is connected, attach immediately
      if (this.socket && this.socket.connected) {
        attachHandler();
      }

      // Watch for connection changes and attach handler
      const connectionSubscription = this.connection$.subscribe((connected) => {
        if (connected) {
          attachHandler();
        } else if (this.socket) {
          // Remove handler when disconnected
          this.socket.off(eventName, handler);
        }
      });

      return () => {
        connectionSubscription.unsubscribe();
        if (this.socket) {
          this.socket.off(eventName, handler);
        }
      };
    }).pipe(
      takeUntil(this.destroy$),
      share()
    );
  }

  /**
   * Connect to Socket.IO server
   */
  connect(playerAddress: string): void {
    if (this.socket?.connected) {
      return;
    }

    const url = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'http://localhost:3001';
    
    this.socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    // Handle connection events
    this.socket.on('connect', () => {
      this.connectionSubject.next(true);
      // Join player room
      this.socket?.emit('join-player-room', playerAddress);
    });

    this.socket.on('disconnect', () => {
      this.connectionSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionSubject.next(false);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(playerAddress?: string): void {
    if (this.socket) {
      if (playerAddress) {
        this.socket.emit('leave-player-room', playerAddress);
      }
      this.socket.disconnect();
      this.socket = null;
      this.connectionSubject.next(false);
    }
  }

  /**
   * Emit an event to the server
   */
  emit(eventName: string, data: any): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit(eventName, data);
  }

  /**
   * Get the underlying socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Destroy the service and clean up
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Filter transaction results by transaction ID
   */
  filterTransactionResult(transactionId: string): Observable<TransactionResult> {
    return this.transactionResult$.pipe(
      filter((result) => result.transactionId === transactionId)
    );
  }

  /**
   * Filter transaction results by transaction ID prefix
   */
  filterTransactionResultByPrefix(prefix: string): Observable<TransactionResult> {
    return this.transactionResult$.pipe(
      filter((result) => result.transactionId.startsWith(prefix))
    );
  }
}

// Singleton instance
let socketServiceInstance: SocketService | null = null;

/**
 * Get the singleton SocketService instance
 */
export function getSocketService(): SocketService {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketService();
  }
  return socketServiceInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetSocketService(): void {
  if (socketServiceInstance) {
    socketServiceInstance.destroy();
    socketServiceInstance = null;
  }
}

