# ═══════════════════════════════════════════════════════════════════════════════
# TypeScript Migration — Common Error Fixes
# OTBnonAI Project
# ═══════════════════════════════════════════════════════════════════════════════

## 🎯 QUICK REFERENCE

| Error Code | Description | Quick Fix |
|------------|-------------|-----------|
| TS7006 | Parameter implicitly has 'any' type | Add type annotation |
| TS2322 | Type 'X' is not assignable to 'Y' | Fix type mismatch |
| TS2339 | Property does not exist on type | Add to interface or use optional chaining |
| TS2345 | Argument type mismatch | Cast or fix argument |
| TS2531 | Object is possibly 'null' | Add null check or ! |
| TS2307 | Cannot find module | Check import path |
| TS7031 | Binding element implicitly has 'any' | Type destructured props |
| TS2769 | No overload matches this call | Check function signature |

---

## 📋 ERROR FIXES BY CATEGORY

### 1. Component Props (Most Common)

**Error: TS7006 - Parameter 'props' implicitly has an 'any' type**

```tsx
// ❌ BEFORE
const BudgetCard = ({ title, value, status, onPress }) => {
  return <div onClick={onPress}>{title}: {value}</div>;
};

// ✅ AFTER - Method 1: Inline interface
const BudgetCard = ({ 
  title, 
  value, 
  status, 
  onPress 
}: {
  title: string;
  value: number;
  status: 'draft' | 'approved' | 'rejected';
  onPress: () => void;
}) => {
  return <div onClick={onPress}>{title}: {value}</div>;
};

// ✅ AFTER - Method 2: Separate interface (Recommended)
interface BudgetCardProps {
  title: string;
  value: number;
  status: 'draft' | 'approved' | 'rejected';
  onPress: () => void;
  // Optional props
  className?: string;
  disabled?: boolean;
}

const BudgetCard = ({ title, value, status, onPress, className, disabled }: BudgetCardProps) => {
  return <div onClick={onPress}>{title}: {value}</div>;
};

// ✅ AFTER - Method 3: React.FC (less recommended but valid)
const BudgetCard: React.FC<BudgetCardProps> = ({ title, value, status, onPress }) => {
  return <div onClick={onPress}>{title}: {value}</div>;
};
```

---

### 2. Event Handlers

**Error: TS7006 - Parameter 'e' implicitly has an 'any' type**

```tsx
// ❌ BEFORE
const handleClick = (e) => {
  e.preventDefault();
};

const handleChange = (e) => {
  setValue(e.target.value);
};

const handleSubmit = (e) => {
  e.preventDefault();
  // submit form
};

// ✅ AFTER
// Mouse events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

// Input/Change events
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setSelected(e.target.value);
};

const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setText(e.target.value);
};

// Form events
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

// Keyboard events
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    submit();
  }
};

// Focus events
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  setFocused(true);
};

// Drag events
const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
  e.dataTransfer.setData('text', 'data');
};
```

---

### 3. useState with Complex Types

**Error: TS2345 - Argument of type 'X' is not assignable**

```tsx
// ❌ BEFORE
const [budgets, setBudgets] = useState([]);
const [selectedBudget, setSelectedBudget] = useState(null);
const [filters, setFilters] = useState({});

// ✅ AFTER
// Define types first
interface Budget {
  id: string;
  name: string;
  totalBudget: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  brandId: string;
  fiscalYear: number;
  createdAt: string;
}

interface FilterState {
  fiscalYear?: number;
  brandId?: string;
  status?: string;
  search?: string;
}

// Use with explicit types
const [budgets, setBudgets] = useState<Budget[]>([]);
const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
const [filters, setFilters] = useState<FilterState>({});

// With initial value inference
const [count, setCount] = useState(0); // Inferred as number
const [name, setName] = useState(''); // Inferred as string
const [isOpen, setIsOpen] = useState(false); // Inferred as boolean
```

---

### 4. useRef Types

**Error: TS2531 - Object is possibly 'null'**

```tsx
// ❌ BEFORE
const inputRef = useRef();
const handleFocus = () => {
  inputRef.current.focus(); // Error: Object is possibly null
};

// ✅ AFTER - Method 1: Non-null assertion (use carefully)
const inputRef = useRef<HTMLInputElement>(null);
const handleFocus = () => {
  inputRef.current!.focus();
};

// ✅ AFTER - Method 2: Null check (safer)
const inputRef = useRef<HTMLInputElement>(null);
const handleFocus = () => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
};

// ✅ AFTER - Method 3: Optional chaining
const inputRef = useRef<HTMLInputElement>(null);
const handleFocus = () => {
  inputRef.current?.focus();
};

// Common ref types
const divRef = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);
const formRef = useRef<HTMLFormElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
```

---

### 5. API Response Types

**Error: TS2339 - Property 'data' does not exist on type**

```tsx
// ❌ BEFORE
const fetchBudgets = async () => {
  const response = await fetch('/api/budgets');
  const data = await response.json();
  setBudgets(data.items); // Error: Property 'items' does not exist
};

// ✅ AFTER
// Define API response types
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface ApiError {
  message: string;
  statusCode: number;
}

// Use with fetch
const fetchBudgets = async (): Promise<Budget[]> => {
  const response = await fetch('/api/budgets');
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }
  
  const data: PaginatedResponse<Budget> = await response.json();
  return data.data;
};

// With try-catch
const loadBudgets = async () => {
  try {
    const budgets = await fetchBudgets();
    setBudgets(budgets);
  } catch (error) {
    if (error instanceof Error) {
      setError(error.message);
    }
  }
};
```

---

### 6. Object Property Access

**Error: TS2339 - Property does not exist on type**

```tsx
// ❌ BEFORE
const user = { name: 'John', email: 'john@example.com' };
console.log(user.role); // Error: Property 'role' does not exist

// ✅ AFTER - Method 1: Extend interface
interface User {
  name: string;
  email: string;
  role?: string; // Optional
}

const user: User = { name: 'John', email: 'john@example.com' };
console.log(user.role); // OK, undefined

// ✅ AFTER - Method 2: Type assertion (use sparingly)
const user = { name: 'John', email: 'john@example.com' } as User & { role?: string };

// ✅ AFTER - Method 3: Index signature
interface FlexibleObject {
  [key: string]: unknown;
}

const obj: FlexibleObject = { name: 'John' };
console.log(obj.anything); // OK
```

---

### 7. Array Methods with Types

**Error: TS7006 - Parameter implicitly has 'any' type**

```tsx
// ❌ BEFORE
const filteredBudgets = budgets.filter(b => b.status === 'approved');
const budgetNames = budgets.map(b => b.name);
const totalBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0);

// ✅ AFTER (if budgets is typed, these will auto-infer)
// But for explicit typing:
const filteredBudgets = budgets.filter((b: Budget) => b.status === 'approved');
const budgetNames = budgets.map((b: Budget): string => b.name);
const totalBudget = budgets.reduce((sum: number, b: Budget) => sum + b.totalBudget, 0);

// With find (can return undefined)
const foundBudget = budgets.find((b: Budget) => b.id === selectedId);
// foundBudget is Budget | undefined

// Safe access
if (foundBudget) {
  console.log(foundBudget.name); // OK, foundBudget is Budget here
}

// Or with optional chaining
console.log(foundBudget?.name); // string | undefined
```

---

### 8. Children Props

**Error: TS2322 - Type 'Element' is not assignable**

```tsx
// ❌ BEFORE
const Layout = ({ children }) => {
  return <div className="layout">{children}</div>;
};

// ✅ AFTER - Method 1: React.ReactNode (most flexible)
interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return <div className="layout">{children}</div>;
};

// ✅ AFTER - Method 2: PropsWithChildren helper
import { PropsWithChildren } from 'react';

interface LayoutProps {
  className?: string;
}

const Layout = ({ children, className }: PropsWithChildren<LayoutProps>) => {
  return <div className={className}>{children}</div>;
};

// Types for children:
// React.ReactNode - anything renderable (string, number, element, array, null, undefined)
// React.ReactElement - only JSX elements
// JSX.Element - single JSX element
// string | number - only text
```

---

### 9. Context Types

**Error: TS2345 - Argument of type 'null' is not assignable**

```tsx
// ❌ BEFORE
const AuthContext = createContext(null);

// ✅ AFTER
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// With undefined default (requires null check when using)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for safe access
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Or with non-null assertion (if you're sure provider exists)
const AuthContext = createContext<AuthContextType>(null!);
```

---

### 10. Dynamic Object Keys

**Error: TS7053 - Element implicitly has 'any' type**

```tsx
// ❌ BEFORE
const obj = { a: 1, b: 2, c: 3 };
const key = 'a';
const value = obj[key]; // Error with strict mode

// ✅ AFTER - Method 1: Type the key
type ObjKey = 'a' | 'b' | 'c';
const key: ObjKey = 'a';
const value = obj[key]; // OK

// ✅ AFTER - Method 2: Index signature
interface NumberObject {
  [key: string]: number;
}
const obj: NumberObject = { a: 1, b: 2, c: 3 };
const value = obj[key]; // OK

// ✅ AFTER - Method 3: keyof
const obj = { a: 1, b: 2, c: 3 };
const key = 'a' as keyof typeof obj;
const value = obj[key]; // OK

// ✅ AFTER - Method 4: Record type
const obj: Record<string, number> = { a: 1, b: 2, c: 3 };
const value = obj[key]; // OK
```

---

## 🔧 UTILITY TYPES CHEAT SHEET

```typescript
// Partial - all properties optional
type PartialBudget = Partial<Budget>;
// { id?: string; name?: string; ... }

// Required - all properties required
type RequiredBudget = Required<Budget>;
// { id: string; name: string; ... }

// Pick - select specific properties
type BudgetSummary = Pick<Budget, 'id' | 'name' | 'status'>;
// { id: string; name: string; status: string; }

// Omit - exclude specific properties
type BudgetWithoutId = Omit<Budget, 'id'>;
// { name: string; totalBudget: number; ... }

// Record - object with specific key and value types
type BudgetMap = Record<string, Budget>;
// { [key: string]: Budget }

// Extract - extract types from union
type ApprovedStatus = Extract<Budget['status'], 'approved' | 'rejected'>;
// 'approved' | 'rejected'

// Exclude - exclude types from union
type NonApprovedStatus = Exclude<Budget['status'], 'approved'>;
// 'draft' | 'submitted' | 'rejected'

// NonNullable - remove null and undefined
type DefinitelyBudget = NonNullable<Budget | null | undefined>;
// Budget

// ReturnType - get function return type
type FetchBudgetsReturn = ReturnType<typeof fetchBudgets>;
// Promise<Budget[]>

// Parameters - get function parameters
type FetchBudgetsParams = Parameters<typeof fetchBudgets>;
// [page: number, limit: number]
```

---

## 📁 COMMON TYPE DEFINITIONS FILE

Create `src/types/index.ts`:

```typescript
// ═══════════════════════════════════════════════════════════════
// src/types/index.ts — Shared Type Definitions
// ═══════════════════════════════════════════════════════════════

// ─── API Response Types ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ─── Entity Types ───────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'buyer' | 'merchandiser' | 'manager' | 'finance';

export interface Budget {
  id: string;
  name: string;
  code: string;
  totalBudget: number;
  committedBudget: number;
  status: BudgetStatus;
  brandId: string;
  brand?: GroupBrand;
  fiscalYear: number;
  createdAt: string;
  updatedAt: string;
}

export type BudgetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface GroupBrand {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  type: 'REX' | 'TTP' | 'OUTLET';
}

export interface PlanningVersion {
  id: string;
  budgetId: string;
  version: PlanningVersionType;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PlanningVersionType = 'V0' | 'V1' | 'V2' | 'V3' | 'FINAL';

export interface Proposal {
  id: string;
  budgetId: string;
  planningVersionId: string;
  status: ProposalStatus;
  totalValue: number;
  totalQuantity: number;
  createdAt: string;
}

export type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// ─── Filter Types ───────────────────────────────────────────────

export interface BudgetFilters {
  fiscalYear?: number;
  brandId?: string;
  status?: BudgetStatus;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ─── Component Props Types ──────────────────────────────────────

export interface BaseCardProps {
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// ─── Event Handler Types ────────────────────────────────────────

export type InputChangeHandler = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeHandler = React.ChangeEvent<HTMLSelectElement>;
export type FormSubmitHandler = React.FormEvent<HTMLFormElement>;
export type ButtonClickHandler = React.MouseEvent<HTMLButtonElement>;
```

---

## ✅ MIGRATION CHECKLIST

```
Phase 1: Rename Files
[ ] Run migration script
[ ] Verify all .jsx → .tsx
[ ] Verify all .js → .ts
[ ] Commit renamed files

Phase 2: Create Type Definitions
[ ] Create src/types/index.ts
[ ] Define all entity types
[ ] Define API response types
[ ] Define component prop types

Phase 3: Fix Component Props (Highest volume)
[ ] Fix all functional component props
[ ] Add interfaces for each component
[ ] Export prop types for reuse

Phase 4: Fix Event Handlers
[ ] Type all onClick handlers
[ ] Type all onChange handlers
[ ] Type all onSubmit handlers

Phase 5: Fix Hooks
[ ] Type useState with generics
[ ] Type useRef with element types
[ ] Type useContext with context types

Phase 6: Fix API Calls
[ ] Type fetch responses
[ ] Type error handling
[ ] Add return types to async functions

Phase 7: Final Verification
[ ] Run: npx tsc --noEmit
[ ] Run: npm run build
[ ] Run: npm run lint
[ ] 0 errors remaining
```

---

## 🚀 QUICK COMMANDS

```bash
# Check current error count
npx tsc --noEmit 2>&1 | grep -c "error TS"

# List all unique error codes
npx tsc --noEmit 2>&1 | grep -oE "TS[0-9]+" | sort | uniq -c | sort -rn

# Fix specific error type across codebase
# Example: Find all TS7006 (implicit any)
npx tsc --noEmit 2>&1 | grep "TS7006"

# Auto-fix some issues with ESLint
npx eslint src --ext .ts,.tsx --fix

# Generate type from JSON (useful for API responses)
# npx json-to-ts < response.json
```
