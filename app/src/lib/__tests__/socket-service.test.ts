/**
 * Tests for RxJS-based Socket.IO service
 * @jest-environment jsdom
 */

import { getSocketService, resetSocketService } from '../socket-service';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  };

  return {
    io: jest.fn(() => mockSocket),
  };
});

describe('SocketService', () => {
  beforeEach(() => {
    resetSocketService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetSocketService();
  });

  describe('getSocketService', () => {
    it('should return a singleton instance', () => {
      const service1 = getSocketService();
      const service2 = getSocketService();
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getSocketService();
      resetSocketService();
      const service2 = getSocketService();
      expect(service1).not.toBe(service2);
    });
  });

  describe('connect', () => {
    it('should create socket connection with correct URL', () => {
      const service = getSocketService();
      const playerAddress = '0x123';

      service.connect(playerAddress);

      expect(io).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_WS_SERVER_URL || 'http://localhost:3001',
        {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
        }
      );
    });

    it('should not create duplicate connections', () => {
      const service = getSocketService();
      const playerAddress = '0x123';

      service.connect(playerAddress);
      service.connect(playerAddress);

      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('emit', () => {
    it('should emit events when connected', () => {
      const service = getSocketService();
      const playerAddress = '0x123';
      const mockSocket = (io as jest.Mock).mock.results[0].value;
      mockSocket.connected = true;

      service.connect(playerAddress);
      service.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should not emit when not connected', () => {
      const service = getSocketService();
      const mockSocket = (io as jest.Mock).mock.results[0].value;
      mockSocket.connected = false;

      service.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('observables', () => {
    it('should provide transactionResult$ observable', () => {
      const service = getSocketService();
      expect(service.transactionResult$).toBeDefined();
    });

    it('should provide connection$ observable', () => {
      const service = getSocketService();
      expect(service.connection$).toBeDefined();
    });

    it('should filter transaction results by transaction ID', (done) => {
      const service = getSocketService();
      const transactionId = 'test-tx-123';
      const filtered$ = service.filterTransactionResult(transactionId);

      filtered$.subscribe((result) => {
        expect(result.transactionId).toBe(transactionId);
        done();
      });

      // Simulate event emission
      const mockSocket = (io as jest.Mock).mock.results[0].value;
      const handler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'transaction:result'
      )?.[1];

      if (handler) {
        handler({ transactionId, status: 'success' });
      }
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', () => {
      const service = getSocketService();
      const playerAddress = '0x123';
      const mockSocket = (io as jest.Mock).mock.results[0].value;

      service.connect(playerAddress);
      service.disconnect(playerAddress);

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-player-room', playerAddress);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});

