import { render, screen } from '@testing-library/react';
import { FontProvider, useFont } from '../font-provider';
import { useKonamiCode } from '@/hooks/use-konami-code';

// Mock the Konami code hook
jest.mock('@/hooks/use-konami-code');

const mockUseKonamiCode = useKonamiCode as jest.MockedFunction<typeof useKonamiCode>;

describe('FontProvider', () => {
  beforeEach(() => {
    // Clear any existing classes
    document.documentElement.className = '';
    mockUseKonamiCode.mockClear();
  });

  it('should start with regular font (pixel font not active)', () => {
    mockUseKonamiCode.mockImplementation(() => []);

    const TestComponent = () => {
      const { isPixelFont } = useFont();
      return <div>{isPixelFont ? 'pixel' : 'regular'}</div>;
    };

    render(
      <FontProvider>
        <TestComponent />
      </FontProvider>
    );

    expect(screen.getByText('regular')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(false);
  });

  it('should toggle to pixel font when Konami code is triggered', () => {
    let konamiCallback: (() => void) | undefined;

    mockUseKonamiCode.mockImplementation((callback) => {
      konamiCallback = callback;
      return [];
    });

    const TestComponent = () => {
      const { isPixelFont, togglePixelFont } = useFont();
      return (
        <div>
          <div data-testid="font-state">{isPixelFont ? 'pixel' : 'regular'}</div>
          <button onClick={togglePixelFont}>Toggle</button>
        </div>
      );
    };

    render(
      <FontProvider>
        <TestComponent />
      </FontProvider>
    );

    // Initially regular
    expect(screen.getByTestId('font-state')).toHaveTextContent('regular');
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(false);

    // Trigger Konami code callback
    if (konamiCallback) {
      konamiCallback();
    }

    // Should now be pixel
    expect(screen.getByTestId('font-state')).toHaveTextContent('pixel');
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(true);
  });

  it('should toggle back to regular font when Konami code is triggered again', () => {
    let konamiCallback: (() => void) | undefined;

    mockUseKonamiCode.mockImplementation((callback) => {
      konamiCallback = callback;
      return [];
    });

    const TestComponent = () => {
      const { isPixelFont } = useFont();
      return <div data-testid="font-state">{isPixelFont ? 'pixel' : 'regular'}</div>;
    };

    render(
      <FontProvider>
        <TestComponent />
      </FontProvider>
    );

    // First trigger - should switch to pixel
    if (konamiCallback) {
      konamiCallback();
    }
    expect(screen.getByTestId('font-state')).toHaveTextContent('pixel');
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(true);

    // Second trigger - should switch back to regular
    if (konamiCallback) {
      konamiCallback();
    }
    expect(screen.getByTestId('font-state')).toHaveTextContent('regular');
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(false);
  });

  it('should apply pixel-font-active class to html element when pixel font is active', () => {
    let konamiCallback: (() => void) | undefined;

    mockUseKonamiCode.mockImplementation((callback) => {
      konamiCallback = callback;
      return [];
    });

    render(
      <FontProvider>
        <div>Test</div>
      </FontProvider>
    );

    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(false);

    if (konamiCallback) {
      konamiCallback();
    }

    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(true);
  });

  it('should remove pixel-font-active class when switching back to regular font', () => {
    let konamiCallback: (() => void) | undefined;

    mockUseKonamiCode.mockImplementation((callback) => {
      konamiCallback = callback;
      return [];
    });

    render(
      <FontProvider>
        <div>Test</div>
      </FontProvider>
    );

    // Activate pixel font
    if (konamiCallback) {
      konamiCallback();
    }
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(true);

    // Deactivate (toggle back)
    if (konamiCallback) {
      konamiCallback();
    }
    expect(document.documentElement.classList.contains('pixel-font-active')).toBe(false);
  });

  it('should throw error when useFont is used outside FontProvider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useFont();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFont must be used within a FontProvider');

    consoleError.mockRestore();
  });
});

