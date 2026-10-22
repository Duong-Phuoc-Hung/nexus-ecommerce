export interface CategoryProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  level: number;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
  children?: Category[];
}

/**
 * Domain Entity: Category
 * Đại diện cho danh mục phân cấp hàng hóa trong Catalog Bounded Context (SRS 3.3).
 * Hỗ trợ phân cấp đa tầng (Level 1: Gốc, Level 2: Nhóm con, Level 3: Loại chi tiết).
 */
export class Category {
  private readonly _id: string;
  private _name: string;
  private _slug: string;
  private _description?: string;
  private _imageUrl?: string;
  private _parentId?: string | null;
  private _level: number;
  private _isActive: boolean;
  private _displayOrder: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _children: Category[];

  constructor(props: CategoryProps) {
    this._id = props.id;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this._parentId = props.parentId ?? null;
    this._level = props.level;
    this._isActive = props.isActive;
    this._displayOrder = props.displayOrder;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._children = props.children ?? [];
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get slug(): string {
    return this._slug;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get imageUrl(): string | undefined {
    return this._imageUrl;
  }

  public get parentId(): string | null | undefined {
    return this._parentId;
  }

  public get level(): number {
    return this._level;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get displayOrder(): number {
    return this._displayOrder;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get children(): Category[] {
    return this._children;
  }

  public setChildren(children: Category[]): void {
    this._children = children;
  }

  public addChild(child: Category): void {
    this._children.push(child);
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      description: this._description,
      imageUrl: this._imageUrl,
      parentId: this._parentId,
      level: this._level,
      isActive: this._isActive,
      displayOrder: this._displayOrder,
      children: this._children.map((child) => child.toJSON()),
    };
  }
}
