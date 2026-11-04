export interface CategoryProps {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  level: number;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Category {
  private readonly _id: string;
  private _name: string;
  private _slug: string;
  private _description?: string | null;
  private _imageUrl?: string | null;
  private _parentId?: string | null;
  private _level: number;
  private _isActive: boolean;
  private _displayOrder: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CategoryProps) {
    this._id = props.id;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description ?? null;
    this._imageUrl = props.imageUrl ?? null;
    this._parentId = props.parentId ?? null;
    this._level = props.level;
    this._isActive = props.isActive;
    this._displayOrder = props.displayOrder;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
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
  public get description(): string | null | undefined {
    return this._description;
  }
  public get imageUrl(): string | null | undefined {
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
}
