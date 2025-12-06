import { renderHook, act } from '@testing-library/react';
import { useKonamiCode } from '../use-konami-code';

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

beforeEach(() => {
  window.addEventListener = mockAddEventListener;
  window.removeEventListener = mockRemoveEventListener;
  mockAddEventListener.mockClear();
  mockRemoveEventListener.mockClear();
});

describe('useKonamiCode', () => {
  it('should call onSuccess when Konami code is entered correctly', () => {
    const onSuccess = jest.fn();
    renderHook(() => useKonamiCode(onSuccess));

    // Get the event handler that was registered
    const eventHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'keydown'
    )?.[1];

    expect(eventHandler).toBeDefined();

    // Simulate Konami code sequence: ↑ ↑ ↓ ↓ ← → ← → B A
    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];

    act(() => {
      konamiSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should handle case-insensitive B and A keys', () => {
    const onSuccess = jest.fn();
    renderHook(() => useKonamiCode(onSuccess));

    const eventHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'keydown'
    )?.[1];

    // Simulate Konami code with lowercase 'b' and 'a'
    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'Keyb', // lowercase
      'Keya', // lowercase
    ];

    act(() => {
      konamiSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should not call onSuccess for incorrect sequence', () => {
    const onSuccess = jest.fn();
    renderHook(() => useKonamiCode(onSuccess));

    const eventHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'keydown'
    )?.[1];

    // Simulate incorrect sequence
    const wrongSequence = [
      'ArrowUp',
      'ArrowDown', // Wrong - should be ArrowUp
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];

    act(() => {
      wrongSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should reset sequence after successful match', () => {
    const onSuccess = jest.fn();
    renderHook(() => useKonamiCode(onSuccess));

    const eventHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'keydown'
    )?.[1];

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];

    // Enter Konami code twice
    act(() => {
      konamiSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);

    // Enter it again
    act(() => {
      konamiSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(2);
  });

  it('should only track the last N keys (where N is Konami code length)', () => {
    const onSuccess = jest.fn();
    renderHook(() => useKonamiCode(onSuccess));

    const eventHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'keydown'
    )?.[1];

    // Enter some random keys, then Konami code
    const randomKeys = ['KeyX', 'KeyY', 'KeyZ'];
    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];

    act(() => {
      randomKeys.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
      konamiSequence.forEach((key) => {
        const event = new KeyboardEvent('keydown', { code: key });
        eventHandler?.(event);
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should clean up event listener on unmount', () => {
    const onSuccess = jest.fn();
    const { unmount } = renderHook(() => useKonamiCode(onSuccess));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });
});

