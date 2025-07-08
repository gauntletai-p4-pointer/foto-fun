# Modern Feature-Based Architecture Guide

## Overview
A scalable, maintainable architecture pattern for modern applications using vertical slices and clean separation of concerns.

## Core Structure
```
project/
  apps/
    web/                 # Web application (React, Next.js, etc.)
      modules/           # Feature-based organization
      shared/            # Shared UI components, utilities
      
    mobile/              # Mobile application (React Native, Flutter, etc.)
      modules/           # Feature-based organization
      shared/            # Shared mobile components
      
    api/                 # Backend API (Node.js, Python, Go, etc.)
      modules/           # Business logic + data access
      infrastructure/    # External service integrations
      
  packages/              # Shared between apps
    types/               # Shared TypeScript types/interfaces
    utils/               # Pure utility functions
    constants/           # Shared constants
    
  infrastructure/        # Separate from application code
    database/
      migrations/        # Database schema changes
      seeds/             # Development/test data
    docker/              # Container configurations
    k8s/                 # Kubernetes manifests
```

## Key Architectural Principles

### 1. **Feature-Based Modules**
Each feature is a self-contained vertical slice:
```
modules/
  user-management/
    components/          # UI components
    screens/            # Page/Screen components
    hooks/              # Custom hooks (React)
    services/           # API communication
    store/              # State management
    types/              # Module-specific types
    utils/              # Module utilities
    __tests__/          # All test levels
    index.ts            # Public API (barrel export)
```

### 2. **Data Flow Architecture**
```
Frontend App → API Client → Backend API → Repository → Database
                                      ↓
                              Business Logic Layer
```
- Frontend never accesses database directly
- All data flows through API layer
- Business logic lives in backend

### 3. **Module Independence**
- Each module exposes only its public API via `index.ts`
- No circular dependencies between modules
- Modules communicate through:
  - Events (event bus/pubsub)
  - Well-defined contracts
  - Shared types package

### 4. **State Management**
- Each module owns its state
- No global state (except auth/navigation)
- State patterns:
  ```typescript
  // Per-module store
  modules/feature-x/store/
    - Local state for UI
    - Cached API responses
    - Optimistic updates
  ```

### 5. **API Layer Separation**
```typescript
// Frontend service (apps/web/modules/feature/services/)
export const featureApi = {
  getItems: () => apiClient.get('/items'),
  createItem: (data) => apiClient.post('/items', data),
  // Only API calls, no business logic
}

// Backend controller (apps/api/modules/feature/)
export const itemController = {
  create: async (req, res) => {
    // Validation
    // Business logic
    // Repository call
    // Response
  }
}
```

## Architecture Patterns

### Repository Pattern
```typescript
// Backend only - abstracts data access
interface IUserRepository {
  findById(id: string): Promise<User>
  create(data: CreateUserDto): Promise<User>
  update(id: string, data: UpdateUserDto): Promise<User>
}

// Implementation can be swapped (PostgreSQL, MongoDB, etc.)
class UserRepository implements IUserRepository {
  // Actual database queries here
}
```

### Event-Driven Communication
```typescript
// Module A publishes events
eventBus.publish('user.created', { userId, email })

// Module B subscribes without knowing about Module A
eventBus.subscribe('user.created', async (data) => {
  await this.sendWelcomeEmail(data.email)
})
```

### Dependency Injection
```typescript
// Services receive dependencies
class UserService {
  constructor(
    private repository: IUserRepository,
    private emailService: IEmailService
  ) {}
}

// Centralized DI container
container.register('userService', () => 
  new UserService(
    container.resolve('userRepository'),
    container.resolve('emailService')
  )
)
```

## Module Structure Example
```typescript
// modules/authentication/index.ts (Public API)
export { LoginForm, SignupForm } from './components'
export { useAuth, usePermissions } from './hooks'
export { authService } from './services'
export type { User, Session } from './types'

// Internal implementation stays private
// Other modules can only import from index.ts
```

## Testing Strategy
```
modules/feature/
  __tests__/
    unit/               # Logic, utilities
    integration/        # Service + API tests  
    components/         # UI component tests
    e2e/               # User flow tests
```

## Benefits
1. **Scalability** - Add features without touching existing code
2. **Team Independence** - Teams own entire features
3. **Testability** - Clear boundaries make testing easier
4. **Flexibility** - Can extract modules to microservices
5. **Maintainability** - Changes are localized to modules

## Migration Path
1. Start with one module
2. Extract shared code gradually
3. Add API layer abstraction
4. Move database logic to backend
5. Implement event communication
6. Remove cross-module imports

## Common Pitfalls to Avoid
- Shared business logic in `shared/` folder
- Direct database access from frontend
- Circular dependencies between modules
- Over-engineering simple features
- Modules that are too granular

## Decision Guidelines

### When to Create a New Module
- Distinct business capability
- Different team ownership
- Could be a separate app/service
- Minimal dependencies on other modules

### What Goes in Shared
- Design system components
- Pure utility functions
- Type definitions
- Constants
- NO business logic

### Module Communication
- **Prefer**: Events, API calls
- **Avoid**: Direct imports, shared state
- **Exception**: Shared types/interfaces