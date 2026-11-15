export interface PlatformPolicyProps {
  id: string;
  category: string;
  policyCode: string;
  version: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  title: string;
  defaultValue: Record<string, any>;
  content: string;
  citationSource: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Domain Entity: PlatformPolicy
 * Kho quy chế chính sách có phiên bản phục vụ RAG FAQ và trích dẫn điều khoản (Kịch bản B)
 */
export class PlatformPolicy {
  private readonly _id: string;
  private readonly _category: string;
  private readonly _policyCode: string;
  private readonly _version: string;
  private readonly _effectiveFrom: Date;
  private readonly _effectiveTo?: Date;
  private readonly _title: string;
  private readonly _defaultValue: Record<string, any>;
  private readonly _content: string;
  private readonly _citationSource: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlatformPolicyProps) {
    this._id = props.id;
    this._category = props.category;
    this._policyCode = props.policyCode;
    this._version = props.version;
    this._effectiveFrom = props.effectiveFrom || new Date();
    this._effectiveTo = props.effectiveTo;
    this._title = props.title;
    this._defaultValue = props.defaultValue;
    this._content = props.content;
    this._citationSource = props.citationSource;
    this._isActive = props.isActive !== undefined ? props.isActive : true;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get category(): string {
    return this._category;
  }

  public get policyCode(): string {
    return this._policyCode;
  }

  public get version(): string {
    return this._version;
  }

  public get title(): string {
    return this._title;
  }

  public get defaultValue(): Record<string, any> {
    return this._defaultValue;
  }

  public get content(): string {
    return this._content;
  }

  public get citationSource(): string {
    return this._citationSource;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public toDto() {
    return {
      id: this._id,
      category: this._category,
      policyCode: this._policyCode,
      version: this._version,
      effectiveFrom: this._effectiveFrom,
      effectiveTo: this._effectiveTo,
      title: this._title,
      defaultValue: this._defaultValue,
      content: this._content,
      citationSource: this._citationSource,
      isActive: this._isActive,
    };
  }
}
