export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";
export type DraftStatus =
  | "draft"
  | "md_ready"
  | "approved"
  | "generating"
  | "generated"
  | "revision_requested";
export type MarkdownStatus = "draft" | "approved" | "superseded";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type CutStatus = "queued" | "running" | "produced" | "failed" | "needs_revision" | "approved";
export type AssetKind =
  | "brand_logo"
  | "product_photo"
  | "generated_cut"
  | "generated_thumbnail";

export interface Notice {
  title: string;
  content: string;
  categories?: string[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfile {
  id: string;
  userId: string;
  brandName: string;
  logoAssetId: string | null;
  pointColor: string;
  subColor: string | null;
  defaultTone: string | null;
  defaultSalesChannel: string | null;
  requiredPhrases: string | null;
  forbiddenPhrases: string | null;
  shippingNotice: string | null;
  returnExchangeNotice: string | null;
  customNotices: Notice[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDraft {
  id: string;
  userId: string;
  brandProfileId: string;
  productName: string;
  category: string;
  salesChannel: string | null;
  targetCustomer: string | null;
  sellingPoints: string | null;
  facts: string | null;
  requiredPhrases: string | null;
  forbiddenPhrases: string | null;
  shippingNotice: string | null;
  returnExchangeNotice: string | null;
  customNotices: Notice[];
  cutCount: number;
  photoAssetIds: string[];
  thumbnailRequested: boolean;
  thumbnailAssetId: string | null;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalMarkdownVersion {
  id: string;
  productDraftId: string;
  version: number;
  content: string;
  status: MarkdownStatus;
  generatedFrom: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface ImageGenerationJob {
  id: string;
  productDraftId: string;
  approvalMarkdownVersionId: string;
  status: JobStatus;
  expectedCutCount: number;
  completedCutCount: number;
  provider: string;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GeneratedCut {
  id: string;
  imageGenerationJobId: string;
  cutNumber: number;
  title: string;
  imageAssetId: string | null;
  approvedCopySnapshot: {
    headline: string;
    subcopy: string;
    sourceMarkdownVersionId: string;
  };
  status: CutStatus;
  qa: {
    textReadable: boolean;
    koreanTextMatchesApprovedCopy: boolean;
    productMatchesReference: boolean;
    notes: string[];
  };
  revisionRequest: string | null;
}

export interface Asset {
  id: string;
  userId: string;
  kind: AssetKind;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface UserMemoryDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppDb {
  users: User[];
  brands: BrandProfile[];
  productDrafts: ProductDraft[];
  approvalMarkdownVersions: ApprovalMarkdownVersion[];
  imageGenerationJobs: ImageGenerationJob[];
  generatedCuts: GeneratedCut[];
  assets: Asset[];
  userMemoryDocuments: UserMemoryDocument[];
}

export type FieldImportance = "required" | "recommended" | "optional" | "confirmation";

export interface FieldMeta {
  name: string;
  label: string;
  required: boolean;
  importance: FieldImportance;
  source: "brand" | "product" | "system";
  helpText: string;
}

export interface MdWorkspaceFile {
  id: string;
  title: string;
  source: "db" | "file";
  path?: string;
  editable: boolean;
  updatedAt: string;
}
