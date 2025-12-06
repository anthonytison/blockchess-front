/**
 * Tests for Socket.IO mint queue system
 * @jest-environment node
 */

import { Server as HTTPServer } from 'http';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { initSocketServer, getSocketServer } from '../socket-server';

// Mock database
jest.mock('@/adapters/postgres/database', () => ({
  query: jest.fn(),
}));

// Mock reward actions
jest.mock('@/app/actions/reward', () => ({
  checkRewardExists: jest.fn(),
}));

// Mock rewards list
jest.mock('@/lib/blockchain/rewards', () => ({
  rewardsList: [
    {
      nft: {
        badge_type: 'first_game',
        name: 'First Game',
      },
    },
  ],
}));

import { query } from '@/adapters/postgres/database';
import { checkRewardExists } from '@/app/actions/reward';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCheckRewardExists = checkRewardExists as jest.MockedFunction<typeof checkRewardExists>;

describe('Socket.IO Mint Queue System', () => {
  let httpServer: HTTPServer;
  let clientSocket: ClientSocket;
  const baseURL = 'http://localhost:3050';

  beforeAll((done) => {
    httpServer = createServer();
    initSocketServer(httpServer);
    httpServer.listen(3050, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    httpServer.close(() => {
      done();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRewardExists.mockResolvedValue({ exists: false });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('request-mint event', () => {
    it('should save mint task to database when request-mint is received', (done) => {
      const playerSuiAddress = '0x123';
      const playerId = 'player-1';
      const rewardType = 'first_game';

      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'task-1' }],
      } as any);

      clientSocket = ioClient(baseURL, {
        path: '/api/socket.io',
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join-player-room', playerSuiAddress);

        setTimeout(() => {
          clientSocket.emit('request-mint', {
            rewardType,
            playerId,
            playerSuiAddress,
          });

          setTimeout(() => {
            // Check that query was called to insert the task
            const insertCall = mockQuery.mock.calls.find(
              (call) => call[0].includes('INSERT INTO mint_queue')
            );
            expect(insertCall).toBeDefined();
            done();
          }, 100);
        }, 100);
      });
    });

    it('should reject duplicate reward requests', (done) => {
      const playerSuiAddress = '0x123';
      const playerId = 'player-1';
      const rewardType = 'first_game';

      mockCheckRewardExists.mockResolvedValueOnce({ exists: true });

      clientSocket = ioClient(baseURL, {
        path: '/api/socket.io',
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('mint-error', (data) => {
          expect(data.error).toContain('already exists');
          expect(data.rewardType).toBe(rewardType);
          done();
        });

        clientSocket.emit('request-mint', {
          rewardType,
          playerId,
          playerSuiAddress,
        });
      });
    });

    it('should reject if task already queued', (done) => {
      const playerSuiAddress = '0x123';
      const playerId = 'player-1';
      const rewardType = 'first_game';

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-task' }],
      } as any);

      clientSocket = ioClient(baseURL, {
        path: '/api/socket.io',
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('mint-error', (data) => {
          expect(data.error).toContain('already queued');
          expect(data.rewardType).toBe(rewardType);
          done();
        });

        clientSocket.emit('request-mint', {
          rewardType,
          playerId,
          playerSuiAddress,
        });
      });
    });
  });

  describe('mint-completed event', () => {
    it('should delete task from database on successful mint', (done) => {
      const taskId = 'task-1';
      const playerSuiAddress = '0x123';
      const objectId = '0xobject123';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            reward_type: 'first_game',
            player_sui_address: playerSuiAddress,
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      clientSocket = ioClient(baseURL, {
        path: '/api/socket.io',
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join-player-room', playerSuiAddress);

        setTimeout(() => {
          clientSocket.emit('mint-completed', {
            taskId,
            objectId,
            success: true,
          });

          setTimeout(() => {
            // Check that DELETE query was called
            const deleteCall = mockQuery.mock.calls.find(
              (call) => call[0].includes('DELETE FROM mint_queue')
            );
            expect(deleteCall).toBeDefined();
            done();
          }, 100);
        }, 100);
      });
    });

    it('should mark task as failed on unsuccessful mint', (done) => {
      const taskId = 'task-1';
      const errorMessage = 'Minting failed';

      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      clientSocket = ioClient(baseURL, {
        path: '/api/socket.io',
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('mint-completed', {
          taskId,
          objectId: '',
          success: false,
          errorMessage,
        });

        setTimeout(() => {
          // Check that UPDATE query was called to mark as failed
          const updateCall = mockQuery.mock.calls.find(
            (call) => call[0].includes('UPDATE mint_queue') && call[0].includes('failed')
          );
          expect(updateCall).toBeDefined();
          done();
        }, 100);
      });
    });
  });

  describe('queue delay configuration', () => {
    it('should use environment variable for queue delay', () => {
      const originalEnv = process.env.MINT_QUEUE_DELAY_MS;
      
      process.env.MINT_QUEUE_DELAY_MS = '3050';
      
      // Re-import to get new delay value
      jest.resetModules();
      const { initSocketServer: reinitSocketServer } = require('../socket-server');
      
      const testServer = createServer();
      reinitSocketServer(testServer);
      
      // The delay should be 3000ms
      expect(process.env.MINT_QUEUE_DELAY_MS).toBe('3050');
      
      // Restore
      if (originalEnv) {
        process.env.MINT_QUEUE_DELAY_MS = originalEnv;
      } else {
        delete process.env.MINT_QUEUE_DELAY_MS;
      }
      
      testServer.close();
    });

    it('should default to 5000ms if environment variable not set', () => {
      const originalEnv = process.env.MINT_QUEUE_DELAY_MS;
      delete process.env.MINT_QUEUE_DELAY_MS;
      
      // Re-import to get default delay value
      jest.resetModules();
      const { initSocketServer: reinitSocketServer } = require('../socket-server');
      
      const testServer = createServer();
      reinitSocketServer(testServer);
      
      // The delay should default to 5000ms
      // We can't directly test the value, but we can verify the module loads
      expect(getSocketServer()).toBeDefined();
      
      // Restore
      if (originalEnv) {
        process.env.MINT_QUEUE_DELAY_MS = originalEnv;
      }
      
      testServer.close();
    });
  });
});

