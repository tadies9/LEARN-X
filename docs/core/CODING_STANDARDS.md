# LEARN-X Coding Standards & Guidelines

## Overview

This document defines the coding standards and best practices that MUST be followed by all developers and AI coding assistants (Claude, Cursor, etc.) working on the LEARN-X project. These standards ensure code quality, maintainability, and consistency across the entire codebase.

---

## 🚨 CRITICAL RULES (Non-Negotiable)

### 1. File Size Limits
- **HARD LIMIT**: No file should exceed 500 lines of code
- **SOFT LIMIT**: Aim for files under 300 lines
- **EXCEPTION**: Only with explicit permission and strong justification
- **ACTION**: Split large files into smaller, focused modules

### 2. Single Responsibility Principle
- Each file/module should have ONE clear purpose
- If you can't describe what a file does in one sentence, it's doing too much
- Split complex components into smaller sub-components

### 3. No Code Duplication
- If you write the same code twice, extract it into a reusable function
- Use shared utilities and hooks
- Create generic components instead of copying

---

## 📁 File Organization

### Frontend Structure
```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth group routes
│   ├── (dashboard)/       # Protected routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # Generic UI components (<100 lines each)
│   ├── forms/             # Form components
│   ├── layouts/           # Layout components
│   └── features/          # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── validations/       # Zod schemas
│   ├── api/              # API client functions
│   └── utils/            # Helper functions
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

### Backend Structure
```
src/
├── routes/               # Express routes (<100 lines per file)
├── controllers/          # Route handlers (<200 lines per file)
├── services/            # Business logic (<300 lines per file)
├── models/              # Data models
├── middleware/          # Express middleware
├── utils/               # Helper functions
├── validators/          # Request validation schemas
└── types/               # TypeScript types
```

---

## 💻 TypeScript Standards

### 1. Type Safety
```typescript
// ❌ BAD
const processData = (data: any) => {
  return data.value;
}

// ✅ GOOD
interface ProcessedData {
  value: string;
  timestamp: Date;
}

const processData = (data: ProcessedData): string => {
  return data.value;
}
```

### 2. Explicit Return Types
```typescript
// ❌ BAD
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ GOOD
const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 3. Interface vs Type
- Use `interface` for object shapes
- Use `type` for unions, primitives, and complex types
- Always export types that are used across files

---

## 🎨 React/Next.js Standards

### 1. Component Structure
```typescript
// ✅ GOOD - Clear, organized component
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/user';

interface ProfileCardProps {
  user: UserProfile;
  onEdit?: () => void;
}

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  // 1. Hooks
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // 2. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 3. Handlers
  const handleEdit = () => {
    setIsLoading(true);
    onEdit?.();
  };

  // 4. Render
  return (
    <div className="profile-card">
      {/* Component JSX */}
    </div>
  );
}
```

### 2. Component Files Rules
- One component per file
- Component file name matches component name
- Co-locate sub-components in the same file ONLY if < 50 lines total
- Extract complex logic into custom hooks

### 3. Hooks Rules
```typescript
// hooks/useUserData.ts
export function useUserData(userId: string) {
  // Hook implementation < 100 lines
  return { data, loading, error };
}
```

---

## 🎯 Function Standards

### 1. Function Length
- **Maximum**: 50 lines per function
- **Ideal**: 20-30 lines
- If longer, extract into smaller functions

### 2. Function Parameters
```typescript
// ❌ BAD - Too many parameters
function createUser(name: string, email: string, age: number, role: string, department: string) {}

// ✅ GOOD - Use object parameter
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  role: string;
  department: string;
}

function createUser(params: CreateUserParams) {}
```

### 3. Pure Functions
- Prefer pure functions without side effects
- Clearly mark functions with side effects
- Separate data fetching from data processing

---

## 📝 Naming Conventions

### 1. Files
```
// React Components
UserProfile.tsx         // PascalCase
UserProfileCard.tsx     

// Utilities/Hooks
useAuth.ts             // camelCase with 'use' prefix
formatDate.ts          // camelCase

// Constants
constants.ts           // lowercase
config.ts              

// Types
types.ts               // lowercase
user.types.ts          // dot notation for specificity
```

### 2. Variables and Functions
```typescript
// Constants
const MAX_RETRY_COUNT = 3;  // SCREAMING_SNAKE_CASE
const API_ENDPOINTS = {};   

// Variables
let userCount = 0;          // camelCase
const isLoading = true;     // boolean prefix: is, has, should

// Functions
function calculateTotal() {} // camelCase, verb prefix
function getUserById() {}    
function hasPermission() {}  
```

### 3. React Components
```typescript
// Components - PascalCase
function UserProfile() {}
function NavigationBar() {}

// Props interfaces - ComponentNameProps
interface UserProfileProps {}
interface NavigationBarProps {}
```

---

## 🔧 Code Organization

### 1. Import Order
```typescript
// 1. React/Next imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { z } from 'zod';
import { format } from 'date-fns';

// 3. Internal imports - absolute paths
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 4. Relative imports
import { localHelper } from './helpers';

// 5. Types
import type { User } from '@/types/user';
```

### 2. Export Patterns
```typescript
// ❌ BAD - Mixed exports
export default function Component() {}
export const helper = () => {};

// ✅ GOOD - Consistent exports
export function Component() {}
export function helper() {}

// OR use default for pages only
export default function Page() {}
```

---

## 🧪 Testing Standards

### 1. Test File Organization
```
// Co-located with source
components/
├── Button.tsx
└── Button.test.tsx

// OR in __tests__ folder
components/
├── Button.tsx
└── __tests__/
    └── Button.test.tsx
```

### 2. Test Structure
```typescript
describe('UserProfile', () => {
  // Group related tests
  describe('when user is authenticated', () => {
    it('should display user name', () => {
      // Arrange
      const user = { name: 'John Doe' };
      
      // Act
      const { getByText } = render(<UserProfile user={user} />);
      
      // Assert
      expect(getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

---

## 📊 Performance Standards

### 1. React Optimization
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Use useMemo for expensive calculations
const processedData = useMemo(
  () => expensiveCalculation(rawData),
  [rawData]
);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### 2. Bundle Size
- Lazy load routes and heavy components
- Use dynamic imports for large libraries
- Monitor bundle size with next-bundle-analyzer

---

## 🔐 Security Standards

### 1. Never Expose Secrets
```typescript
// ❌ BAD
const API_KEY = 'sk-1234567890';

// ✅ GOOD
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
```

### 2. Input Validation
- Always validate user input with Zod
- Sanitize data before storage
- Use parameterized queries

### 3. Authentication Checks
```typescript
// Always check auth on protected routes
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Protected logic
}
```

---

## 🚀 Git & Version Control

### 1. Commit Messages
```
feat: add user profile avatar upload
fix: resolve login redirect issue
refactor: split UserProfile component into smaller parts
docs: update API documentation
test: add unit tests for auth service
style: format code with prettier
chore: update dependencies
```

### 2. Branch Naming
```
feature/user-profile
fix/login-redirect
refactor/split-components
chore/update-deps
```

---

## 📋 Code Review Checklist

Before submitting code, ensure:

- [ ] No file exceeds 500 lines
- [ ] Functions are under 50 lines
- [ ] No duplicated code
- [ ] All TypeScript types are explicit
- [ ] Components follow the standard structure
- [ ] Imports are properly ordered
- [ ] No console.logs in production code
- [ ] All user inputs are validated
- [ ] Error handling is implemented
- [ ] Code is formatted with Prettier
- [ ] ESLint shows no errors
- [ ] Tests are written for new features
- [ ] Performance optimizations are applied where needed
- [ ] Security best practices are followed
- [ ] Documentation is updated if needed

---

## 🤖 AI Assistant Instructions

When an AI assistant (Claude, Cursor, etc.) is working on this codebase:

1. **ALWAYS** check file line count before adding code
2. **NEVER** create files over 300 lines without explicit permission
3. **ALWAYS** split large components into smaller ones
4. **ALWAYS** extract repeated code into utilities
5. **NEVER** use `any` type unless absolutely necessary
6. **ALWAYS** add proper TypeScript types
7. **ALWAYS** follow the import order convention
8. **NEVER** mix different concerns in one file
9. **ALWAYS** write pure functions when possible
10. **ALWAYS** handle errors appropriately

---

## 📚 Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)

---

## 🔄 Living Document

This document is regularly updated. Last update: 2025-01-09

Proposed changes should be discussed in team meetings before implementation.