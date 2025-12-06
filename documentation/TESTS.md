![Alt text](../app/public/brand.png "a title")

# Testing Documentation

This document explains the testing strategy, test types, and how to run tests in BlockChess.

## Test Structure

BlockChess uses multiple testing frameworks for comprehensive coverage:

- **Jest**: Unit tests and integration tests
- **Playwright**: End-to-end (E2E) tests
- **Sui Move Test**: Smart contract tests

## Test Types

### Unit Tests

Test individual functions and components in isolation.

**Location**: `front/app/src/**/__tests__/**/*.test.ts`

**Examples**:
- Chess engine logic
- Domain entities
- Utility functions
- React hooks
- Use cases

**Run**:
```bash
cd front/app
pnpm test
```

### Integration Tests

Test interactions between components and modules.

**Location**: `front/app/src/**/__tests__/**/*.test.ts`

**Examples**:
- Repository implementations
- Database operations
- API routes
- Service integrations

**Run**:
```bash
cd front/app
pnpm test
```

### End-to-End Tests

Test complete user workflows in a real browser.

**Location**: `front/app/e2e/**/*.spec.ts`

**Test Files**:
- `accessibility.spec.ts`: Accessibility compliance
- `game-flow.spec.ts`: Complete game flow
- `w3c-compliance.spec.ts`: W3C standards compliance

**Run**:
```bash
cd front/app
pnpm test:e2e
```

### Smart Contract Tests

Test Sui Move smart contracts.

**Location**: `back/blockchess/sources/tests.move`

**Run**:
```bash
cd back/blockchess
sui move test
```

## Running Tests

### All Tests

```bash
cd front/app
pnpm test
```

### Watch Mode

Run tests in watch mode for development:

```bash
cd front/app
pnpm test:watch
```

### E2E Tests

Run end-to-end tests:

```bash
cd front/app
pnpm test:e2e
```

### CI Mode

Run tests in CI mode (with coverage):

```bash
cd front/app
pnpm test:ci
```

### Smart Contract Tests

```bash
cd back/blockchess
sui move test
```

## Test Configuration

### Jest Configuration

**File**: `front/app/jest.config.js`

**Features**:
- Next.js integration
- jsdom environment
- Coverage collection
- Test path patterns

### Playwright Configuration

**File**: `front/app/playwright.config.ts`

**Features**:
- Multiple browsers (Chrome, Firefox, Safari)
- Automatic server startup
- Trace on failure
- Retry logic

### Test Setup

**File**: `front/app/jest.setup.js`

**Features**:
- Test environment setup
- Mock configurations
- Global test utilities

## Test Coverage

### Coverage Reports

Generate coverage reports:

```bash
cd front/app
pnpm test:ci
```

Coverage reports are generated in `coverage/` directory.

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Test Examples

### Unit Test Example

```typescript
// front/app/src/domain/__tests__/player-entity.test.ts
import { PlayerEntity } from '../entities';

describe('PlayerEntity', () => {
  it('should create a player with valid data', () => {
    const player = new PlayerEntity({
      id: 'player-1',
      name: 'Test Player',
      suiAddress: '0x123',
    });
    
    expect(player.id).toBe('player-1');
    expect(player.name).toBe('Test Player');
  });
});
```

### Integration Test Example

```typescript
// front/app/src/adapters/__tests__/game-repository.test.ts
import { PostgresGameRepository } from '../postgres/game-repository';

describe('PostgresGameRepository', () => {
  it('should save and retrieve a game', async () => {
    const repository = new PostgresGameRepository();
    const game = await repository.save(mockGame);
    const retrieved = await repository.findById(game.id);
    
    expect(retrieved).toEqual(game);
  });
});
```

### E2E Test Example

```typescript
// front/app/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test('should complete a game flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=New Game');
  await page.selectOption('select[name="mode"]', 'solo');
  await page.click('text=Start Game');
  
  // Make a move
  await page.click('[data-square="e2"]');
  await page.click('[data-square="e4"]');
  
  // Wait for game to progress
  await expect(page.locator('.game-status')).toContainText('Your turn');
});
```

### Smart Contract Test Example

```move
// back/blockchess/sources/tests.move
#[test]
fun test_create_game() {
    let ctx = &mut tx_context::dummy();
    let clock = clock::create_for_testing(ctx);
    
    create_game(0, 0, &clock, ctx);
    
    // Verify game was created
    // ...
}
```

## Testing Best Practices

### Unit Tests

1. **Isolation**: Test one thing at a time
2. **Fast**: Keep tests fast (< 100ms each)
3. **Deterministic**: Tests should always produce same results
4. **Clear Names**: Use descriptive test names
5. **AAA Pattern**: Arrange, Act, Assert

### Integration Tests

1. **Real Dependencies**: Use real database/APIs
2. **Cleanup**: Clean up test data after tests
3. **Isolation**: Each test should be independent
4. **Fixtures**: Use test fixtures for common data

### E2E Tests

1. **User Flows**: Test complete user journeys
2. **Realistic**: Use realistic test data
3. **Stable**: Avoid flaky tests
4. **Fast**: Keep E2E tests reasonably fast
5. **Parallel**: Run tests in parallel when possible

## Mocking

### API Mocking

Mock external APIs in tests:

```typescript
jest.mock('@/lib/blockchain/client', () => ({
  getSuiClient: jest.fn(),
}));
```

### Database Mocking

Use in-memory database for tests:

```typescript
import { createDatabase } from '@/lib/database/test-utils';

beforeEach(async () => {
  db = await createDatabase();
});
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:

- Pull requests
- Pushes to main branch
- Scheduled runs

### Test Commands in CI

```yaml
- name: Run tests
  run: |
    cd front/app
    pnpm install
    pnpm test:ci
    pnpm test:e2e
```

## Debugging Tests

### Jest Debugging

```bash
# Run specific test
pnpm test -- game-repository.test.ts

# Run with verbose output
pnpm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging

```bash
# Run in headed mode
pnpm test:e2e -- --headed

# Run in debug mode
pnpm test:e2e -- --debug

# Run specific test
pnpm test:e2e -- game-flow.spec.ts
```

## Test Data

### Fixtures

Test fixtures are located in:
- `front/app/src/__tests__/fixtures/`
- `front/app/e2e/fixtures/`

### Seed Data

Database seed scripts:
- `front/app/scripts/test-database.js`

## Accessibility Testing

### Automated Accessibility Tests

```bash
cd front/app
pnpm test:e2e -- accessibility.spec.ts
```

### Manual Testing

- Use screen readers
- Test keyboard navigation
- Verify ARIA attributes
- Check color contrast

## Performance Testing

### Load Testing

Future: Add load testing for:
- API endpoints
- Database queries
- Blockchain interactions

### Performance Benchmarks

Track:
- Test execution time
- Database query performance
- API response times

## Test Maintenance

### Keeping Tests Updated

1. Update tests when code changes
2. Remove obsolete tests
3. Refactor tests for clarity
4. Add tests for new features

### Test Review

When reviewing PRs:
- Verify tests are included
- Check test coverage
- Ensure tests are meaningful
- Verify tests pass

## Resources

- **Jest Documentation**: https://jestjs.io/
- **Playwright Documentation**: https://playwright.dev/
- **Sui Move Testing**: https://docs.sui.io/build/move/testing
- **Testing Best Practices**: https://testingjavascript.com/

## Troubleshooting

### Tests Failing

1. Check error messages
2. Verify test data
3. Check database state
4. Verify environment variables

### Flaky Tests

1. Add proper waits
2. Use stable selectors
3. Avoid timing dependencies
4. Isolate test data

### Slow Tests

1. Optimize database queries
2. Use mocks where appropriate
3. Run tests in parallel
4. Reduce test data size

