// ═══════════════════════════════════════════════════════════════
// OTBnonAI — Shared Type Definitions
// ═══════════════════════════════════════════════════════════════

// ─── API Response Types ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ─── User & Auth ────────────────────────────────────────────────

export type RoleName = 'buyer' | 'merchandiser' | 'merch_manager' | 'finance_director' | 'admin';

/** e.g. "budget:read", "planning:approve" */
export type Permission = string;

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role?: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use RoleName instead */
export type UserRole = RoleName;

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ─── Budget ─────────────────────────────────────────────────────
// Tables: budget, allocate_headers, budget_allocate

export type BudgetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

/**
 * Budget - Main budget entity
 * Table: budget
 */
export interface Budget {
  id: number;
  name: string;
  amount: number;
  description?: string;
  status: BudgetStatus;
  fiscalYear: number;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  creator?: User;
  allocateHeaders?: AllocateHeader[];
}

/**
 * AllocateHeader - Versioned allocation header per brand
 * Table: allocate_headers
 *
 * Brand is linked here, not on Budget.
 * One Budget can have multiple AllocateHeaders (different brands, versions).
 */
export interface AllocateHeader {
  id: number;
  budgetId: number;
  brandId: number;
  version: number;
  isFinalVersion: boolean;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  budget?: Budget;
  brand?: Brand;
  creator?: User;
  budgetAllocates?: BudgetAllocate[];
}

/**
 * BudgetAllocate - Store/Season allocation detail
 * Table: budget_allocate
 *
 * Replaces old BudgetDetail. Links to AllocateHeader, not directly to Budget.
 */
export interface BudgetAllocate {
  id: number;
  allocateHeaderId: number;
  storeId: number;
  seasonGroupId: number;
  seasonId: number;
  budgetAmount: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  allocateHeader?: AllocateHeader;
  store?: Store;
  seasonGroup?: SeasonGroup;
  season?: Season;
  tickets?: Ticket[];
}

/** @deprecated Use BudgetAllocate instead */
export type BudgetDetail = BudgetAllocate;

export interface BudgetFilters {
  fiscalYear?: number;
  brandId?: number;
  status?: BudgetStatus;
  seasonGroupId?: number;
  search?: string;
}

// ─── Planning ───────────────────────────────────────────────────
// Tables: planning_headers, collection_proposal, gender_proposal, category_proposal

/**
 * PlanningHeader - Main planning version header
 * Table: planning_headers
 *
 * No budgetId in DB — planning exists independently of budget.
 */
export interface PlanningHeader {
  id: number;
  version: number;
  isFinalVersion: boolean;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  creator?: User;
  planningCollections?: PlanningCollection[];
  planningGenders?: PlanningGender[];
  planningCategories?: PlanningCategory[];
}

/**
 * PlanningCollection - Collection-level planning with store breakdown
 * Table: collection_proposal
 *
 * 7 decimal fields + storeId
 */
export interface PlanningCollection {
  id: number;
  collectionId: number;
  storeId: number;
  planningHeaderId: number;
  // Decimal fields
  actualBuyPct: number;
  actualSalesPct: number;
  actualStPct: number;
  actualMoc: number;
  proposedBuyPct: number;
  otbProposedAmount: number;
  pctVarVsLast: number;
  // Audit
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  collection?: Collection;
  store?: Store;
  planningHeader?: PlanningHeader;
}

/**
 * PlanningGender - Gender-level planning with store breakdown
 * Table: gender_proposal
 *
 * 6 decimal fields + storeId (no actualMoc)
 */
export interface PlanningGender {
  id: number;
  genderId: number;
  storeId: number;
  planningHeaderId: number;
  // Decimal fields (no actualMoc)
  actualBuyPct: number;
  actualSalesPct: number;
  actualStPct: number;
  proposedBuyPct: number;
  otbProposedAmount: number;
  pctVarVsLast: number;
  // Audit
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  gender?: Gender;
  store?: Store;
  planningHeader?: PlanningHeader;
}

/**
 * PlanningCategory - Category-level planning (aggregate, no store)
 * Table: category_proposal
 *
 * 8 decimal fields. NO storeId — categories are aggregate.
 */
export interface PlanningCategory {
  id: number;
  subcategoryId: number;
  planningHeaderId: number;
  // Decimal fields
  actualBuyPct: number;
  actualSalesPct: number;
  actualStPct: number;
  proposedBuyPct: number;
  otbProposedAmount: number;
  varLastyearPct: number;
  otbActualAmount: number;
  otbActualBuyPct: number;
  // Audit
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  subcategory?: SubCategory;
  planningHeader?: PlanningHeader;
}

/** @deprecated Use PlanningHeader instead */
export type PlanningVersion = PlanningHeader;

/** @deprecated Use PlanningCollection, PlanningGender, or PlanningCategory instead */
export type PlanningVersionType = 'V0' | 'V1' | 'V2' | 'V3' | 'FINAL';

/** @deprecated Use PlanningCollection, PlanningGender, or PlanningCategory instead */
export interface PlanningDetail {
  id: number;
  planningVersionId: number;
  collectionId?: number;
  genderId?: number;
  categoryId?: number;
  percentage: number;
  amount: number;
}

// ─── Proposal ───────────────────────────────────────────────────
// Tables: proposals, proposal_products, product_allocations

export type ProposalStatus = 'DRAFT' | 'SUBMITTED' | 'LEVEL1_APPROVED' | 'APPROVED' | 'REJECTED';

/**
 * Proposal - SKU proposal / ticket header
 * Table: proposals
 */
export interface Proposal {
  id: string;
  ticketName: string;
  budgetId: string;
  planningVersionId?: string;
  status: ProposalStatus;
  totalSkuCount: number;
  totalOrderQty: number;
  totalValue: number;
  version: number;
  createdById: string;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  budget?: Budget;
  planningVersion?: PlanningVersion;
  createdBy?: User;
  products?: ProposalProduct[];
}

/**
 * ProposalProduct - Individual SKU line in a proposal
 * Table: proposal_products
 *
 * Fields are denormalized from SkuCatalog for snapshot integrity.
 */
export interface ProposalProduct {
  id: string;
  proposalId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  collection?: string;
  gender?: string;
  category?: string;
  subCategory?: string;
  theme?: string;
  color?: string;
  composition?: string;
  unitCost: number;
  srp: number;
  orderQty: number;
  totalValue: number;
  customerTarget?: string;
  imageUrl?: string;
  sortOrder: number;
  // Relations
  proposal?: Proposal;
  sku?: Product;
  allocations?: ProductAllocation[];
}

/**
 * ProductAllocation - Per-store quantity allocation for a proposal product
 * Table: product_allocations
 */
export interface ProductAllocation {
  id: string;
  proposalProductId: string;
  storeId: string;
  quantity: number;
  // Relations
  proposalProduct?: ProposalProduct;
  store?: Store;
}

// ─── Master Data ────────────────────────────────────────────────

export interface GroupBrand {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  code: string;
  name: string;
  groupBrandId: string;
  groupBrand?: GroupBrand;
  isActive: boolean;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  region?: string;
  location?: string;
  isActive: boolean;
}

export interface Collection {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SeasonGroup {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Season {
  id: string;
  name: string;
  seasonGroupId: string;
  seasonGroup?: SeasonGroup;
  isActive: boolean;
}

export interface Gender {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  genderId: string;
  gender?: Gender;
  isActive: boolean;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  isActive: boolean;
}

export interface SubcategorySize {
  id: string;
  name: string;
  subCategoryId: string;
  subCategory?: SubCategory;
}

export interface Product {
  id: string;
  skuCode: string;
  productName: string;
  subCategoryId: string;
  brandId?: string;
  theme?: string;
  color?: string;
  composition?: string;
  srp: number;
  imageUrl?: string;
  isActive: boolean;
}

/** @deprecated Use Product instead */
export type SkuCatalog = Product;

// ─── Approval & Tickets ─────────────────────────────────────────
// Tables: approval_statuses, approval_workflow, approval_workflow_level,
//         ticket, approval_request_log

export type ApprovalStatusName = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';

/**
 * ApprovalStatus - Status lookup table
 * Table: approval_statuses
 */
export interface ApprovalStatus {
  id: number;
  name: ApprovalStatusName;
  isActive: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
}

/**
 * ApprovalWorkflow - Workflow definition per brand group
 * Table: approval_workflow
 */
export interface ApprovalWorkflow {
  id: number;
  groupBrandId: number;
  workflowName: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  groupBrand?: GroupBrand;
  levels?: ApprovalWorkflowLevel[];
}

/**
 * ApprovalWorkflowLevel - N-level approval steps
 * Table: approval_workflow_level
 *
 * approverUserId is a SPECIFIC USER, not a role.
 * Supports unlimited levels (1, 2, 3, ... N).
 */
export interface ApprovalWorkflowLevel {
  id: number;
  approvalWorkflowId: number;
  levelOrder: number;
  levelName: string;
  approverUserId: number;
  isRequired: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  approvalWorkflow?: ApprovalWorkflow;
  approverUser?: User;
  ticketApprovalLogs?: TicketApprovalLog[];
}

/**
 * Ticket - Approval request for a budget allocation
 * Table: ticket
 *
 * Links to BudgetAllocate, NOT Budget.
 * One ticket per store+season allocation.
 */
export interface Ticket {
  id: number;
  budgetAllocateId: number;
  status: ApprovalStatusName;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  budgetAllocate?: BudgetAllocate;
  creator?: User;
  approvalLogs?: TicketApprovalLog[];
}

/**
 * TicketApprovalLog - Individual approval/rejection action
 * Table: approval_request_log
 */
export interface TicketApprovalLog {
  id: number;
  ticketId: number;
  approvalWorkflowLevelId: number;
  approverUserId: number;
  isApproved: boolean;
  comment?: string;
  approvedAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number;
  // Relations
  ticket?: Ticket;
  approvalWorkflowLevel?: ApprovalWorkflowLevel;
  approverUser?: User;
}

// ─── Deprecated Approval Aliases ────────────────────────────────

/** @deprecated Use ApprovalWorkflowLevel instead */
export interface ApprovalWorkflowStep {
  id: string;
  step: number;
  name: string;
  role: UserRole;
  isRequired: boolean;
}

/** @deprecated Use ApprovalStatusName instead */
export type TicketStatus = ApprovalStatusName;

/** @deprecated Use TicketApprovalLog instead */
export interface ApprovalHistoryItem {
  step: number;
  stepName: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  approverName?: string;
  comments?: string;
  timestamp: string;
}

/** @deprecated Use ApprovalWorkflow + ApprovalWorkflowLevel instead */
export interface Approval {
  id: string;
  entityType: 'budget' | 'planning' | 'proposal';
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  step: number;
  approverId?: string;
  approver?: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── UI & Component Types ───────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// ─── Event Handler Types ────────────────────────────────────────

export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type TextareaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;
export type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>;
export type DivClickEvent = React.MouseEvent<HTMLDivElement>;

// ─── Utility Types ──────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T> = () => Promise<T>;
