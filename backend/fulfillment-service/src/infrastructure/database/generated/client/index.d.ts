
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Warehouse
 * 
 */
export type Warehouse = $Result.DefaultSelection<Prisma.$WarehousePayload>
/**
 * Model SkuInventory
 * 
 */
export type SkuInventory = $Result.DefaultSelection<Prisma.$SkuInventoryPayload>
/**
 * Model InventoryLedger
 * 
 */
export type InventoryLedger = $Result.DefaultSelection<Prisma.$InventoryLedgerPayload>
/**
 * Model Shipment
 * 
 */
export type Shipment = $Result.DefaultSelection<Prisma.$ShipmentPayload>
/**
 * Model Carrier
 * 
 */
export type Carrier = $Result.DefaultSelection<Prisma.$CarrierPayload>
/**
 * Model SupportCase
 * 
 */
export type SupportCase = $Result.DefaultSelection<Prisma.$SupportCasePayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Warehouses
 * const warehouses = await prisma.warehouse.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Warehouses
   * const warehouses = await prisma.warehouse.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.warehouse`: Exposes CRUD operations for the **Warehouse** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Warehouses
    * const warehouses = await prisma.warehouse.findMany()
    * ```
    */
  get warehouse(): Prisma.WarehouseDelegate<ExtArgs>;

  /**
   * `prisma.skuInventory`: Exposes CRUD operations for the **SkuInventory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SkuInventories
    * const skuInventories = await prisma.skuInventory.findMany()
    * ```
    */
  get skuInventory(): Prisma.SkuInventoryDelegate<ExtArgs>;

  /**
   * `prisma.inventoryLedger`: Exposes CRUD operations for the **InventoryLedger** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InventoryLedgers
    * const inventoryLedgers = await prisma.inventoryLedger.findMany()
    * ```
    */
  get inventoryLedger(): Prisma.InventoryLedgerDelegate<ExtArgs>;

  /**
   * `prisma.shipment`: Exposes CRUD operations for the **Shipment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Shipments
    * const shipments = await prisma.shipment.findMany()
    * ```
    */
  get shipment(): Prisma.ShipmentDelegate<ExtArgs>;

  /**
   * `prisma.carrier`: Exposes CRUD operations for the **Carrier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Carriers
    * const carriers = await prisma.carrier.findMany()
    * ```
    */
  get carrier(): Prisma.CarrierDelegate<ExtArgs>;

  /**
   * `prisma.supportCase`: Exposes CRUD operations for the **SupportCase** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SupportCases
    * const supportCases = await prisma.supportCase.findMany()
    * ```
    */
  get supportCase(): Prisma.SupportCaseDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Warehouse: 'Warehouse',
    SkuInventory: 'SkuInventory',
    InventoryLedger: 'InventoryLedger',
    Shipment: 'Shipment',
    Carrier: 'Carrier',
    SupportCase: 'SupportCase'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "warehouse" | "skuInventory" | "inventoryLedger" | "shipment" | "carrier" | "supportCase"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Warehouse: {
        payload: Prisma.$WarehousePayload<ExtArgs>
        fields: Prisma.WarehouseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WarehouseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WarehouseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          findFirst: {
            args: Prisma.WarehouseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WarehouseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          findMany: {
            args: Prisma.WarehouseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>[]
          }
          create: {
            args: Prisma.WarehouseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          createMany: {
            args: Prisma.WarehouseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WarehouseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>[]
          }
          delete: {
            args: Prisma.WarehouseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          update: {
            args: Prisma.WarehouseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          deleteMany: {
            args: Prisma.WarehouseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WarehouseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.WarehouseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WarehousePayload>
          }
          aggregate: {
            args: Prisma.WarehouseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWarehouse>
          }
          groupBy: {
            args: Prisma.WarehouseGroupByArgs<ExtArgs>
            result: $Utils.Optional<WarehouseGroupByOutputType>[]
          }
          count: {
            args: Prisma.WarehouseCountArgs<ExtArgs>
            result: $Utils.Optional<WarehouseCountAggregateOutputType> | number
          }
        }
      }
      SkuInventory: {
        payload: Prisma.$SkuInventoryPayload<ExtArgs>
        fields: Prisma.SkuInventoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SkuInventoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SkuInventoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          findFirst: {
            args: Prisma.SkuInventoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SkuInventoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          findMany: {
            args: Prisma.SkuInventoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>[]
          }
          create: {
            args: Prisma.SkuInventoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          createMany: {
            args: Prisma.SkuInventoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SkuInventoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>[]
          }
          delete: {
            args: Prisma.SkuInventoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          update: {
            args: Prisma.SkuInventoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          deleteMany: {
            args: Prisma.SkuInventoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SkuInventoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SkuInventoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkuInventoryPayload>
          }
          aggregate: {
            args: Prisma.SkuInventoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSkuInventory>
          }
          groupBy: {
            args: Prisma.SkuInventoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<SkuInventoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.SkuInventoryCountArgs<ExtArgs>
            result: $Utils.Optional<SkuInventoryCountAggregateOutputType> | number
          }
        }
      }
      InventoryLedger: {
        payload: Prisma.$InventoryLedgerPayload<ExtArgs>
        fields: Prisma.InventoryLedgerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InventoryLedgerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InventoryLedgerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          findFirst: {
            args: Prisma.InventoryLedgerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InventoryLedgerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          findMany: {
            args: Prisma.InventoryLedgerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>[]
          }
          create: {
            args: Prisma.InventoryLedgerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          createMany: {
            args: Prisma.InventoryLedgerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InventoryLedgerCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>[]
          }
          delete: {
            args: Prisma.InventoryLedgerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          update: {
            args: Prisma.InventoryLedgerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          deleteMany: {
            args: Prisma.InventoryLedgerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InventoryLedgerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.InventoryLedgerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InventoryLedgerPayload>
          }
          aggregate: {
            args: Prisma.InventoryLedgerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInventoryLedger>
          }
          groupBy: {
            args: Prisma.InventoryLedgerGroupByArgs<ExtArgs>
            result: $Utils.Optional<InventoryLedgerGroupByOutputType>[]
          }
          count: {
            args: Prisma.InventoryLedgerCountArgs<ExtArgs>
            result: $Utils.Optional<InventoryLedgerCountAggregateOutputType> | number
          }
        }
      }
      Shipment: {
        payload: Prisma.$ShipmentPayload<ExtArgs>
        fields: Prisma.ShipmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ShipmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ShipmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          findFirst: {
            args: Prisma.ShipmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ShipmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          findMany: {
            args: Prisma.ShipmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>[]
          }
          create: {
            args: Prisma.ShipmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          createMany: {
            args: Prisma.ShipmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ShipmentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>[]
          }
          delete: {
            args: Prisma.ShipmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          update: {
            args: Prisma.ShipmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          deleteMany: {
            args: Prisma.ShipmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ShipmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ShipmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipmentPayload>
          }
          aggregate: {
            args: Prisma.ShipmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShipment>
          }
          groupBy: {
            args: Prisma.ShipmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShipmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.ShipmentCountArgs<ExtArgs>
            result: $Utils.Optional<ShipmentCountAggregateOutputType> | number
          }
        }
      }
      Carrier: {
        payload: Prisma.$CarrierPayload<ExtArgs>
        fields: Prisma.CarrierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CarrierFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CarrierFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          findFirst: {
            args: Prisma.CarrierFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CarrierFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          findMany: {
            args: Prisma.CarrierFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>[]
          }
          create: {
            args: Prisma.CarrierCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          createMany: {
            args: Prisma.CarrierCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CarrierCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>[]
          }
          delete: {
            args: Prisma.CarrierDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          update: {
            args: Prisma.CarrierUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          deleteMany: {
            args: Prisma.CarrierDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CarrierUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CarrierUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CarrierPayload>
          }
          aggregate: {
            args: Prisma.CarrierAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCarrier>
          }
          groupBy: {
            args: Prisma.CarrierGroupByArgs<ExtArgs>
            result: $Utils.Optional<CarrierGroupByOutputType>[]
          }
          count: {
            args: Prisma.CarrierCountArgs<ExtArgs>
            result: $Utils.Optional<CarrierCountAggregateOutputType> | number
          }
        }
      }
      SupportCase: {
        payload: Prisma.$SupportCasePayload<ExtArgs>
        fields: Prisma.SupportCaseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SupportCaseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SupportCaseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          findFirst: {
            args: Prisma.SupportCaseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SupportCaseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          findMany: {
            args: Prisma.SupportCaseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>[]
          }
          create: {
            args: Prisma.SupportCaseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          createMany: {
            args: Prisma.SupportCaseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SupportCaseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>[]
          }
          delete: {
            args: Prisma.SupportCaseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          update: {
            args: Prisma.SupportCaseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          deleteMany: {
            args: Prisma.SupportCaseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SupportCaseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SupportCaseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SupportCasePayload>
          }
          aggregate: {
            args: Prisma.SupportCaseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSupportCase>
          }
          groupBy: {
            args: Prisma.SupportCaseGroupByArgs<ExtArgs>
            result: $Utils.Optional<SupportCaseGroupByOutputType>[]
          }
          count: {
            args: Prisma.SupportCaseCountArgs<ExtArgs>
            result: $Utils.Optional<SupportCaseCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type WarehouseCountOutputType
   */

  export type WarehouseCountOutputType = {
    inventories: number
    shipments: number
  }

  export type WarehouseCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inventories?: boolean | WarehouseCountOutputTypeCountInventoriesArgs
    shipments?: boolean | WarehouseCountOutputTypeCountShipmentsArgs
  }

  // Custom InputTypes
  /**
   * WarehouseCountOutputType without action
   */
  export type WarehouseCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WarehouseCountOutputType
     */
    select?: WarehouseCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * WarehouseCountOutputType without action
   */
  export type WarehouseCountOutputTypeCountInventoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SkuInventoryWhereInput
  }

  /**
   * WarehouseCountOutputType without action
   */
  export type WarehouseCountOutputTypeCountShipmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShipmentWhereInput
  }


  /**
   * Count Type SkuInventoryCountOutputType
   */

  export type SkuInventoryCountOutputType = {
    ledgers: number
  }

  export type SkuInventoryCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ledgers?: boolean | SkuInventoryCountOutputTypeCountLedgersArgs
  }

  // Custom InputTypes
  /**
   * SkuInventoryCountOutputType without action
   */
  export type SkuInventoryCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventoryCountOutputType
     */
    select?: SkuInventoryCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SkuInventoryCountOutputType without action
   */
  export type SkuInventoryCountOutputTypeCountLedgersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InventoryLedgerWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Warehouse
   */

  export type AggregateWarehouse = {
    _count: WarehouseCountAggregateOutputType | null
    _avg: WarehouseAvgAggregateOutputType | null
    _sum: WarehouseSumAggregateOutputType | null
    _min: WarehouseMinAggregateOutputType | null
    _max: WarehouseMaxAggregateOutputType | null
  }

  export type WarehouseAvgAggregateOutputType = {
    id: number | null
  }

  export type WarehouseSumAggregateOutputType = {
    id: bigint | null
  }

  export type WarehouseMinAggregateOutputType = {
    id: bigint | null
    code: string | null
    name: string | null
    address: string | null
    city: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WarehouseMaxAggregateOutputType = {
    id: bigint | null
    code: string | null
    name: string | null
    address: string | null
    city: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WarehouseCountAggregateOutputType = {
    id: number
    code: number
    name: number
    address: number
    city: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WarehouseAvgAggregateInputType = {
    id?: true
  }

  export type WarehouseSumAggregateInputType = {
    id?: true
  }

  export type WarehouseMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    address?: true
    city?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WarehouseMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    address?: true
    city?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WarehouseCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    address?: true
    city?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WarehouseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Warehouse to aggregate.
     */
    where?: WarehouseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Warehouses to fetch.
     */
    orderBy?: WarehouseOrderByWithRelationInput | WarehouseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WarehouseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Warehouses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Warehouses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Warehouses
    **/
    _count?: true | WarehouseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WarehouseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WarehouseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WarehouseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WarehouseMaxAggregateInputType
  }

  export type GetWarehouseAggregateType<T extends WarehouseAggregateArgs> = {
        [P in keyof T & keyof AggregateWarehouse]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWarehouse[P]>
      : GetScalarType<T[P], AggregateWarehouse[P]>
  }




  export type WarehouseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WarehouseWhereInput
    orderBy?: WarehouseOrderByWithAggregationInput | WarehouseOrderByWithAggregationInput[]
    by: WarehouseScalarFieldEnum[] | WarehouseScalarFieldEnum
    having?: WarehouseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WarehouseCountAggregateInputType | true
    _avg?: WarehouseAvgAggregateInputType
    _sum?: WarehouseSumAggregateInputType
    _min?: WarehouseMinAggregateInputType
    _max?: WarehouseMaxAggregateInputType
  }

  export type WarehouseGroupByOutputType = {
    id: bigint
    code: string
    name: string
    address: string
    city: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: WarehouseCountAggregateOutputType | null
    _avg: WarehouseAvgAggregateOutputType | null
    _sum: WarehouseSumAggregateOutputType | null
    _min: WarehouseMinAggregateOutputType | null
    _max: WarehouseMaxAggregateOutputType | null
  }

  type GetWarehouseGroupByPayload<T extends WarehouseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WarehouseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WarehouseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WarehouseGroupByOutputType[P]>
            : GetScalarType<T[P], WarehouseGroupByOutputType[P]>
        }
      >
    >


  export type WarehouseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    address?: boolean
    city?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inventories?: boolean | Warehouse$inventoriesArgs<ExtArgs>
    shipments?: boolean | Warehouse$shipmentsArgs<ExtArgs>
    _count?: boolean | WarehouseCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["warehouse"]>

  export type WarehouseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    address?: boolean
    city?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["warehouse"]>

  export type WarehouseSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    address?: boolean
    city?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type WarehouseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inventories?: boolean | Warehouse$inventoriesArgs<ExtArgs>
    shipments?: boolean | Warehouse$shipmentsArgs<ExtArgs>
    _count?: boolean | WarehouseCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type WarehouseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $WarehousePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Warehouse"
    objects: {
      inventories: Prisma.$SkuInventoryPayload<ExtArgs>[]
      shipments: Prisma.$ShipmentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      code: string
      name: string
      address: string
      city: string
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["warehouse"]>
    composites: {}
  }

  type WarehouseGetPayload<S extends boolean | null | undefined | WarehouseDefaultArgs> = $Result.GetResult<Prisma.$WarehousePayload, S>

  type WarehouseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<WarehouseFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: WarehouseCountAggregateInputType | true
    }

  export interface WarehouseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Warehouse'], meta: { name: 'Warehouse' } }
    /**
     * Find zero or one Warehouse that matches the filter.
     * @param {WarehouseFindUniqueArgs} args - Arguments to find a Warehouse
     * @example
     * // Get one Warehouse
     * const warehouse = await prisma.warehouse.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WarehouseFindUniqueArgs>(args: SelectSubset<T, WarehouseFindUniqueArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Warehouse that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {WarehouseFindUniqueOrThrowArgs} args - Arguments to find a Warehouse
     * @example
     * // Get one Warehouse
     * const warehouse = await prisma.warehouse.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WarehouseFindUniqueOrThrowArgs>(args: SelectSubset<T, WarehouseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Warehouse that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseFindFirstArgs} args - Arguments to find a Warehouse
     * @example
     * // Get one Warehouse
     * const warehouse = await prisma.warehouse.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WarehouseFindFirstArgs>(args?: SelectSubset<T, WarehouseFindFirstArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Warehouse that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseFindFirstOrThrowArgs} args - Arguments to find a Warehouse
     * @example
     * // Get one Warehouse
     * const warehouse = await prisma.warehouse.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WarehouseFindFirstOrThrowArgs>(args?: SelectSubset<T, WarehouseFindFirstOrThrowArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Warehouses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Warehouses
     * const warehouses = await prisma.warehouse.findMany()
     * 
     * // Get first 10 Warehouses
     * const warehouses = await prisma.warehouse.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const warehouseWithIdOnly = await prisma.warehouse.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WarehouseFindManyArgs>(args?: SelectSubset<T, WarehouseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Warehouse.
     * @param {WarehouseCreateArgs} args - Arguments to create a Warehouse.
     * @example
     * // Create one Warehouse
     * const Warehouse = await prisma.warehouse.create({
     *   data: {
     *     // ... data to create a Warehouse
     *   }
     * })
     * 
     */
    create<T extends WarehouseCreateArgs>(args: SelectSubset<T, WarehouseCreateArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Warehouses.
     * @param {WarehouseCreateManyArgs} args - Arguments to create many Warehouses.
     * @example
     * // Create many Warehouses
     * const warehouse = await prisma.warehouse.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WarehouseCreateManyArgs>(args?: SelectSubset<T, WarehouseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Warehouses and returns the data saved in the database.
     * @param {WarehouseCreateManyAndReturnArgs} args - Arguments to create many Warehouses.
     * @example
     * // Create many Warehouses
     * const warehouse = await prisma.warehouse.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Warehouses and only return the `id`
     * const warehouseWithIdOnly = await prisma.warehouse.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WarehouseCreateManyAndReturnArgs>(args?: SelectSubset<T, WarehouseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Warehouse.
     * @param {WarehouseDeleteArgs} args - Arguments to delete one Warehouse.
     * @example
     * // Delete one Warehouse
     * const Warehouse = await prisma.warehouse.delete({
     *   where: {
     *     // ... filter to delete one Warehouse
     *   }
     * })
     * 
     */
    delete<T extends WarehouseDeleteArgs>(args: SelectSubset<T, WarehouseDeleteArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Warehouse.
     * @param {WarehouseUpdateArgs} args - Arguments to update one Warehouse.
     * @example
     * // Update one Warehouse
     * const warehouse = await prisma.warehouse.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WarehouseUpdateArgs>(args: SelectSubset<T, WarehouseUpdateArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Warehouses.
     * @param {WarehouseDeleteManyArgs} args - Arguments to filter Warehouses to delete.
     * @example
     * // Delete a few Warehouses
     * const { count } = await prisma.warehouse.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WarehouseDeleteManyArgs>(args?: SelectSubset<T, WarehouseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Warehouses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Warehouses
     * const warehouse = await prisma.warehouse.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WarehouseUpdateManyArgs>(args: SelectSubset<T, WarehouseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Warehouse.
     * @param {WarehouseUpsertArgs} args - Arguments to update or create a Warehouse.
     * @example
     * // Update or create a Warehouse
     * const warehouse = await prisma.warehouse.upsert({
     *   create: {
     *     // ... data to create a Warehouse
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Warehouse we want to update
     *   }
     * })
     */
    upsert<T extends WarehouseUpsertArgs>(args: SelectSubset<T, WarehouseUpsertArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Warehouses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseCountArgs} args - Arguments to filter Warehouses to count.
     * @example
     * // Count the number of Warehouses
     * const count = await prisma.warehouse.count({
     *   where: {
     *     // ... the filter for the Warehouses we want to count
     *   }
     * })
    **/
    count<T extends WarehouseCountArgs>(
      args?: Subset<T, WarehouseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WarehouseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Warehouse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WarehouseAggregateArgs>(args: Subset<T, WarehouseAggregateArgs>): Prisma.PrismaPromise<GetWarehouseAggregateType<T>>

    /**
     * Group by Warehouse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WarehouseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WarehouseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WarehouseGroupByArgs['orderBy'] }
        : { orderBy?: WarehouseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WarehouseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWarehouseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Warehouse model
   */
  readonly fields: WarehouseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Warehouse.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WarehouseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    inventories<T extends Warehouse$inventoriesArgs<ExtArgs> = {}>(args?: Subset<T, Warehouse$inventoriesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findMany"> | Null>
    shipments<T extends Warehouse$shipmentsArgs<ExtArgs> = {}>(args?: Subset<T, Warehouse$shipmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Warehouse model
   */ 
  interface WarehouseFieldRefs {
    readonly id: FieldRef<"Warehouse", 'BigInt'>
    readonly code: FieldRef<"Warehouse", 'String'>
    readonly name: FieldRef<"Warehouse", 'String'>
    readonly address: FieldRef<"Warehouse", 'String'>
    readonly city: FieldRef<"Warehouse", 'String'>
    readonly isActive: FieldRef<"Warehouse", 'Boolean'>
    readonly createdAt: FieldRef<"Warehouse", 'DateTime'>
    readonly updatedAt: FieldRef<"Warehouse", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Warehouse findUnique
   */
  export type WarehouseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter, which Warehouse to fetch.
     */
    where: WarehouseWhereUniqueInput
  }

  /**
   * Warehouse findUniqueOrThrow
   */
  export type WarehouseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter, which Warehouse to fetch.
     */
    where: WarehouseWhereUniqueInput
  }

  /**
   * Warehouse findFirst
   */
  export type WarehouseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter, which Warehouse to fetch.
     */
    where?: WarehouseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Warehouses to fetch.
     */
    orderBy?: WarehouseOrderByWithRelationInput | WarehouseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Warehouses.
     */
    cursor?: WarehouseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Warehouses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Warehouses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Warehouses.
     */
    distinct?: WarehouseScalarFieldEnum | WarehouseScalarFieldEnum[]
  }

  /**
   * Warehouse findFirstOrThrow
   */
  export type WarehouseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter, which Warehouse to fetch.
     */
    where?: WarehouseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Warehouses to fetch.
     */
    orderBy?: WarehouseOrderByWithRelationInput | WarehouseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Warehouses.
     */
    cursor?: WarehouseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Warehouses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Warehouses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Warehouses.
     */
    distinct?: WarehouseScalarFieldEnum | WarehouseScalarFieldEnum[]
  }

  /**
   * Warehouse findMany
   */
  export type WarehouseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter, which Warehouses to fetch.
     */
    where?: WarehouseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Warehouses to fetch.
     */
    orderBy?: WarehouseOrderByWithRelationInput | WarehouseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Warehouses.
     */
    cursor?: WarehouseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Warehouses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Warehouses.
     */
    skip?: number
    distinct?: WarehouseScalarFieldEnum | WarehouseScalarFieldEnum[]
  }

  /**
   * Warehouse create
   */
  export type WarehouseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * The data needed to create a Warehouse.
     */
    data: XOR<WarehouseCreateInput, WarehouseUncheckedCreateInput>
  }

  /**
   * Warehouse createMany
   */
  export type WarehouseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Warehouses.
     */
    data: WarehouseCreateManyInput | WarehouseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Warehouse createManyAndReturn
   */
  export type WarehouseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Warehouses.
     */
    data: WarehouseCreateManyInput | WarehouseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Warehouse update
   */
  export type WarehouseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * The data needed to update a Warehouse.
     */
    data: XOR<WarehouseUpdateInput, WarehouseUncheckedUpdateInput>
    /**
     * Choose, which Warehouse to update.
     */
    where: WarehouseWhereUniqueInput
  }

  /**
   * Warehouse updateMany
   */
  export type WarehouseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Warehouses.
     */
    data: XOR<WarehouseUpdateManyMutationInput, WarehouseUncheckedUpdateManyInput>
    /**
     * Filter which Warehouses to update
     */
    where?: WarehouseWhereInput
  }

  /**
   * Warehouse upsert
   */
  export type WarehouseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * The filter to search for the Warehouse to update in case it exists.
     */
    where: WarehouseWhereUniqueInput
    /**
     * In case the Warehouse found by the `where` argument doesn't exist, create a new Warehouse with this data.
     */
    create: XOR<WarehouseCreateInput, WarehouseUncheckedCreateInput>
    /**
     * In case the Warehouse was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WarehouseUpdateInput, WarehouseUncheckedUpdateInput>
  }

  /**
   * Warehouse delete
   */
  export type WarehouseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    /**
     * Filter which Warehouse to delete.
     */
    where: WarehouseWhereUniqueInput
  }

  /**
   * Warehouse deleteMany
   */
  export type WarehouseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Warehouses to delete
     */
    where?: WarehouseWhereInput
  }

  /**
   * Warehouse.inventories
   */
  export type Warehouse$inventoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    where?: SkuInventoryWhereInput
    orderBy?: SkuInventoryOrderByWithRelationInput | SkuInventoryOrderByWithRelationInput[]
    cursor?: SkuInventoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SkuInventoryScalarFieldEnum | SkuInventoryScalarFieldEnum[]
  }

  /**
   * Warehouse.shipments
   */
  export type Warehouse$shipmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    where?: ShipmentWhereInput
    orderBy?: ShipmentOrderByWithRelationInput | ShipmentOrderByWithRelationInput[]
    cursor?: ShipmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ShipmentScalarFieldEnum | ShipmentScalarFieldEnum[]
  }

  /**
   * Warehouse without action
   */
  export type WarehouseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
  }


  /**
   * Model SkuInventory
   */

  export type AggregateSkuInventory = {
    _count: SkuInventoryCountAggregateOutputType | null
    _avg: SkuInventoryAvgAggregateOutputType | null
    _sum: SkuInventorySumAggregateOutputType | null
    _min: SkuInventoryMinAggregateOutputType | null
    _max: SkuInventoryMaxAggregateOutputType | null
  }

  export type SkuInventoryAvgAggregateOutputType = {
    id: number | null
    warehouseId: number | null
    productId: number | null
    totalQuantity: number | null
    availableQuantity: number | null
    reservedQuantity: number | null
    unavailableQuantity: number | null
  }

  export type SkuInventorySumAggregateOutputType = {
    id: bigint | null
    warehouseId: bigint | null
    productId: bigint | null
    totalQuantity: number | null
    availableQuantity: number | null
    reservedQuantity: number | null
    unavailableQuantity: number | null
  }

  export type SkuInventoryMinAggregateOutputType = {
    id: bigint | null
    warehouseId: bigint | null
    productId: bigint | null
    skuCode: string | null
    totalQuantity: number | null
    availableQuantity: number | null
    reservedQuantity: number | null
    unavailableQuantity: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SkuInventoryMaxAggregateOutputType = {
    id: bigint | null
    warehouseId: bigint | null
    productId: bigint | null
    skuCode: string | null
    totalQuantity: number | null
    availableQuantity: number | null
    reservedQuantity: number | null
    unavailableQuantity: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SkuInventoryCountAggregateOutputType = {
    id: number
    warehouseId: number
    productId: number
    skuCode: number
    totalQuantity: number
    availableQuantity: number
    reservedQuantity: number
    unavailableQuantity: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SkuInventoryAvgAggregateInputType = {
    id?: true
    warehouseId?: true
    productId?: true
    totalQuantity?: true
    availableQuantity?: true
    reservedQuantity?: true
    unavailableQuantity?: true
  }

  export type SkuInventorySumAggregateInputType = {
    id?: true
    warehouseId?: true
    productId?: true
    totalQuantity?: true
    availableQuantity?: true
    reservedQuantity?: true
    unavailableQuantity?: true
  }

  export type SkuInventoryMinAggregateInputType = {
    id?: true
    warehouseId?: true
    productId?: true
    skuCode?: true
    totalQuantity?: true
    availableQuantity?: true
    reservedQuantity?: true
    unavailableQuantity?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SkuInventoryMaxAggregateInputType = {
    id?: true
    warehouseId?: true
    productId?: true
    skuCode?: true
    totalQuantity?: true
    availableQuantity?: true
    reservedQuantity?: true
    unavailableQuantity?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SkuInventoryCountAggregateInputType = {
    id?: true
    warehouseId?: true
    productId?: true
    skuCode?: true
    totalQuantity?: true
    availableQuantity?: true
    reservedQuantity?: true
    unavailableQuantity?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SkuInventoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SkuInventory to aggregate.
     */
    where?: SkuInventoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkuInventories to fetch.
     */
    orderBy?: SkuInventoryOrderByWithRelationInput | SkuInventoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SkuInventoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkuInventories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkuInventories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SkuInventories
    **/
    _count?: true | SkuInventoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SkuInventoryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SkuInventorySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SkuInventoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SkuInventoryMaxAggregateInputType
  }

  export type GetSkuInventoryAggregateType<T extends SkuInventoryAggregateArgs> = {
        [P in keyof T & keyof AggregateSkuInventory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSkuInventory[P]>
      : GetScalarType<T[P], AggregateSkuInventory[P]>
  }




  export type SkuInventoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SkuInventoryWhereInput
    orderBy?: SkuInventoryOrderByWithAggregationInput | SkuInventoryOrderByWithAggregationInput[]
    by: SkuInventoryScalarFieldEnum[] | SkuInventoryScalarFieldEnum
    having?: SkuInventoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SkuInventoryCountAggregateInputType | true
    _avg?: SkuInventoryAvgAggregateInputType
    _sum?: SkuInventorySumAggregateInputType
    _min?: SkuInventoryMinAggregateInputType
    _max?: SkuInventoryMaxAggregateInputType
  }

  export type SkuInventoryGroupByOutputType = {
    id: bigint
    warehouseId: bigint
    productId: bigint
    skuCode: string
    totalQuantity: number
    availableQuantity: number
    reservedQuantity: number
    unavailableQuantity: number
    createdAt: Date
    updatedAt: Date
    _count: SkuInventoryCountAggregateOutputType | null
    _avg: SkuInventoryAvgAggregateOutputType | null
    _sum: SkuInventorySumAggregateOutputType | null
    _min: SkuInventoryMinAggregateOutputType | null
    _max: SkuInventoryMaxAggregateOutputType | null
  }

  type GetSkuInventoryGroupByPayload<T extends SkuInventoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SkuInventoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SkuInventoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SkuInventoryGroupByOutputType[P]>
            : GetScalarType<T[P], SkuInventoryGroupByOutputType[P]>
        }
      >
    >


  export type SkuInventorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    warehouseId?: boolean
    productId?: boolean
    skuCode?: boolean
    totalQuantity?: boolean
    availableQuantity?: boolean
    reservedQuantity?: boolean
    unavailableQuantity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    warehouse?: boolean | WarehouseDefaultArgs<ExtArgs>
    ledgers?: boolean | SkuInventory$ledgersArgs<ExtArgs>
    _count?: boolean | SkuInventoryCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["skuInventory"]>

  export type SkuInventorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    warehouseId?: boolean
    productId?: boolean
    skuCode?: boolean
    totalQuantity?: boolean
    availableQuantity?: boolean
    reservedQuantity?: boolean
    unavailableQuantity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    warehouse?: boolean | WarehouseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["skuInventory"]>

  export type SkuInventorySelectScalar = {
    id?: boolean
    warehouseId?: boolean
    productId?: boolean
    skuCode?: boolean
    totalQuantity?: boolean
    availableQuantity?: boolean
    reservedQuantity?: boolean
    unavailableQuantity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SkuInventoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    warehouse?: boolean | WarehouseDefaultArgs<ExtArgs>
    ledgers?: boolean | SkuInventory$ledgersArgs<ExtArgs>
    _count?: boolean | SkuInventoryCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SkuInventoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    warehouse?: boolean | WarehouseDefaultArgs<ExtArgs>
  }

  export type $SkuInventoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SkuInventory"
    objects: {
      warehouse: Prisma.$WarehousePayload<ExtArgs>
      ledgers: Prisma.$InventoryLedgerPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      warehouseId: bigint
      productId: bigint
      skuCode: string
      totalQuantity: number
      availableQuantity: number
      reservedQuantity: number
      unavailableQuantity: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["skuInventory"]>
    composites: {}
  }

  type SkuInventoryGetPayload<S extends boolean | null | undefined | SkuInventoryDefaultArgs> = $Result.GetResult<Prisma.$SkuInventoryPayload, S>

  type SkuInventoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SkuInventoryFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SkuInventoryCountAggregateInputType | true
    }

  export interface SkuInventoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SkuInventory'], meta: { name: 'SkuInventory' } }
    /**
     * Find zero or one SkuInventory that matches the filter.
     * @param {SkuInventoryFindUniqueArgs} args - Arguments to find a SkuInventory
     * @example
     * // Get one SkuInventory
     * const skuInventory = await prisma.skuInventory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SkuInventoryFindUniqueArgs>(args: SelectSubset<T, SkuInventoryFindUniqueArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SkuInventory that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SkuInventoryFindUniqueOrThrowArgs} args - Arguments to find a SkuInventory
     * @example
     * // Get one SkuInventory
     * const skuInventory = await prisma.skuInventory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SkuInventoryFindUniqueOrThrowArgs>(args: SelectSubset<T, SkuInventoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SkuInventory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryFindFirstArgs} args - Arguments to find a SkuInventory
     * @example
     * // Get one SkuInventory
     * const skuInventory = await prisma.skuInventory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SkuInventoryFindFirstArgs>(args?: SelectSubset<T, SkuInventoryFindFirstArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SkuInventory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryFindFirstOrThrowArgs} args - Arguments to find a SkuInventory
     * @example
     * // Get one SkuInventory
     * const skuInventory = await prisma.skuInventory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SkuInventoryFindFirstOrThrowArgs>(args?: SelectSubset<T, SkuInventoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SkuInventories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SkuInventories
     * const skuInventories = await prisma.skuInventory.findMany()
     * 
     * // Get first 10 SkuInventories
     * const skuInventories = await prisma.skuInventory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const skuInventoryWithIdOnly = await prisma.skuInventory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SkuInventoryFindManyArgs>(args?: SelectSubset<T, SkuInventoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SkuInventory.
     * @param {SkuInventoryCreateArgs} args - Arguments to create a SkuInventory.
     * @example
     * // Create one SkuInventory
     * const SkuInventory = await prisma.skuInventory.create({
     *   data: {
     *     // ... data to create a SkuInventory
     *   }
     * })
     * 
     */
    create<T extends SkuInventoryCreateArgs>(args: SelectSubset<T, SkuInventoryCreateArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SkuInventories.
     * @param {SkuInventoryCreateManyArgs} args - Arguments to create many SkuInventories.
     * @example
     * // Create many SkuInventories
     * const skuInventory = await prisma.skuInventory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SkuInventoryCreateManyArgs>(args?: SelectSubset<T, SkuInventoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SkuInventories and returns the data saved in the database.
     * @param {SkuInventoryCreateManyAndReturnArgs} args - Arguments to create many SkuInventories.
     * @example
     * // Create many SkuInventories
     * const skuInventory = await prisma.skuInventory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SkuInventories and only return the `id`
     * const skuInventoryWithIdOnly = await prisma.skuInventory.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SkuInventoryCreateManyAndReturnArgs>(args?: SelectSubset<T, SkuInventoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SkuInventory.
     * @param {SkuInventoryDeleteArgs} args - Arguments to delete one SkuInventory.
     * @example
     * // Delete one SkuInventory
     * const SkuInventory = await prisma.skuInventory.delete({
     *   where: {
     *     // ... filter to delete one SkuInventory
     *   }
     * })
     * 
     */
    delete<T extends SkuInventoryDeleteArgs>(args: SelectSubset<T, SkuInventoryDeleteArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SkuInventory.
     * @param {SkuInventoryUpdateArgs} args - Arguments to update one SkuInventory.
     * @example
     * // Update one SkuInventory
     * const skuInventory = await prisma.skuInventory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SkuInventoryUpdateArgs>(args: SelectSubset<T, SkuInventoryUpdateArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SkuInventories.
     * @param {SkuInventoryDeleteManyArgs} args - Arguments to filter SkuInventories to delete.
     * @example
     * // Delete a few SkuInventories
     * const { count } = await prisma.skuInventory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SkuInventoryDeleteManyArgs>(args?: SelectSubset<T, SkuInventoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SkuInventories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SkuInventories
     * const skuInventory = await prisma.skuInventory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SkuInventoryUpdateManyArgs>(args: SelectSubset<T, SkuInventoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SkuInventory.
     * @param {SkuInventoryUpsertArgs} args - Arguments to update or create a SkuInventory.
     * @example
     * // Update or create a SkuInventory
     * const skuInventory = await prisma.skuInventory.upsert({
     *   create: {
     *     // ... data to create a SkuInventory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SkuInventory we want to update
     *   }
     * })
     */
    upsert<T extends SkuInventoryUpsertArgs>(args: SelectSubset<T, SkuInventoryUpsertArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SkuInventories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryCountArgs} args - Arguments to filter SkuInventories to count.
     * @example
     * // Count the number of SkuInventories
     * const count = await prisma.skuInventory.count({
     *   where: {
     *     // ... the filter for the SkuInventories we want to count
     *   }
     * })
    **/
    count<T extends SkuInventoryCountArgs>(
      args?: Subset<T, SkuInventoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SkuInventoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SkuInventory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SkuInventoryAggregateArgs>(args: Subset<T, SkuInventoryAggregateArgs>): Prisma.PrismaPromise<GetSkuInventoryAggregateType<T>>

    /**
     * Group by SkuInventory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkuInventoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SkuInventoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SkuInventoryGroupByArgs['orderBy'] }
        : { orderBy?: SkuInventoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SkuInventoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSkuInventoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SkuInventory model
   */
  readonly fields: SkuInventoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SkuInventory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SkuInventoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    warehouse<T extends WarehouseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WarehouseDefaultArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    ledgers<T extends SkuInventory$ledgersArgs<ExtArgs> = {}>(args?: Subset<T, SkuInventory$ledgersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SkuInventory model
   */ 
  interface SkuInventoryFieldRefs {
    readonly id: FieldRef<"SkuInventory", 'BigInt'>
    readonly warehouseId: FieldRef<"SkuInventory", 'BigInt'>
    readonly productId: FieldRef<"SkuInventory", 'BigInt'>
    readonly skuCode: FieldRef<"SkuInventory", 'String'>
    readonly totalQuantity: FieldRef<"SkuInventory", 'Int'>
    readonly availableQuantity: FieldRef<"SkuInventory", 'Int'>
    readonly reservedQuantity: FieldRef<"SkuInventory", 'Int'>
    readonly unavailableQuantity: FieldRef<"SkuInventory", 'Int'>
    readonly createdAt: FieldRef<"SkuInventory", 'DateTime'>
    readonly updatedAt: FieldRef<"SkuInventory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SkuInventory findUnique
   */
  export type SkuInventoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter, which SkuInventory to fetch.
     */
    where: SkuInventoryWhereUniqueInput
  }

  /**
   * SkuInventory findUniqueOrThrow
   */
  export type SkuInventoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter, which SkuInventory to fetch.
     */
    where: SkuInventoryWhereUniqueInput
  }

  /**
   * SkuInventory findFirst
   */
  export type SkuInventoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter, which SkuInventory to fetch.
     */
    where?: SkuInventoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkuInventories to fetch.
     */
    orderBy?: SkuInventoryOrderByWithRelationInput | SkuInventoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SkuInventories.
     */
    cursor?: SkuInventoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkuInventories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkuInventories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SkuInventories.
     */
    distinct?: SkuInventoryScalarFieldEnum | SkuInventoryScalarFieldEnum[]
  }

  /**
   * SkuInventory findFirstOrThrow
   */
  export type SkuInventoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter, which SkuInventory to fetch.
     */
    where?: SkuInventoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkuInventories to fetch.
     */
    orderBy?: SkuInventoryOrderByWithRelationInput | SkuInventoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SkuInventories.
     */
    cursor?: SkuInventoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkuInventories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkuInventories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SkuInventories.
     */
    distinct?: SkuInventoryScalarFieldEnum | SkuInventoryScalarFieldEnum[]
  }

  /**
   * SkuInventory findMany
   */
  export type SkuInventoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter, which SkuInventories to fetch.
     */
    where?: SkuInventoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkuInventories to fetch.
     */
    orderBy?: SkuInventoryOrderByWithRelationInput | SkuInventoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SkuInventories.
     */
    cursor?: SkuInventoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkuInventories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkuInventories.
     */
    skip?: number
    distinct?: SkuInventoryScalarFieldEnum | SkuInventoryScalarFieldEnum[]
  }

  /**
   * SkuInventory create
   */
  export type SkuInventoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * The data needed to create a SkuInventory.
     */
    data: XOR<SkuInventoryCreateInput, SkuInventoryUncheckedCreateInput>
  }

  /**
   * SkuInventory createMany
   */
  export type SkuInventoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SkuInventories.
     */
    data: SkuInventoryCreateManyInput | SkuInventoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SkuInventory createManyAndReturn
   */
  export type SkuInventoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SkuInventories.
     */
    data: SkuInventoryCreateManyInput | SkuInventoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SkuInventory update
   */
  export type SkuInventoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * The data needed to update a SkuInventory.
     */
    data: XOR<SkuInventoryUpdateInput, SkuInventoryUncheckedUpdateInput>
    /**
     * Choose, which SkuInventory to update.
     */
    where: SkuInventoryWhereUniqueInput
  }

  /**
   * SkuInventory updateMany
   */
  export type SkuInventoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SkuInventories.
     */
    data: XOR<SkuInventoryUpdateManyMutationInput, SkuInventoryUncheckedUpdateManyInput>
    /**
     * Filter which SkuInventories to update
     */
    where?: SkuInventoryWhereInput
  }

  /**
   * SkuInventory upsert
   */
  export type SkuInventoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * The filter to search for the SkuInventory to update in case it exists.
     */
    where: SkuInventoryWhereUniqueInput
    /**
     * In case the SkuInventory found by the `where` argument doesn't exist, create a new SkuInventory with this data.
     */
    create: XOR<SkuInventoryCreateInput, SkuInventoryUncheckedCreateInput>
    /**
     * In case the SkuInventory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SkuInventoryUpdateInput, SkuInventoryUncheckedUpdateInput>
  }

  /**
   * SkuInventory delete
   */
  export type SkuInventoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
    /**
     * Filter which SkuInventory to delete.
     */
    where: SkuInventoryWhereUniqueInput
  }

  /**
   * SkuInventory deleteMany
   */
  export type SkuInventoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SkuInventories to delete
     */
    where?: SkuInventoryWhereInput
  }

  /**
   * SkuInventory.ledgers
   */
  export type SkuInventory$ledgersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    where?: InventoryLedgerWhereInput
    orderBy?: InventoryLedgerOrderByWithRelationInput | InventoryLedgerOrderByWithRelationInput[]
    cursor?: InventoryLedgerWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InventoryLedgerScalarFieldEnum | InventoryLedgerScalarFieldEnum[]
  }

  /**
   * SkuInventory without action
   */
  export type SkuInventoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkuInventory
     */
    select?: SkuInventorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SkuInventoryInclude<ExtArgs> | null
  }


  /**
   * Model InventoryLedger
   */

  export type AggregateInventoryLedger = {
    _count: InventoryLedgerCountAggregateOutputType | null
    _avg: InventoryLedgerAvgAggregateOutputType | null
    _sum: InventoryLedgerSumAggregateOutputType | null
    _min: InventoryLedgerMinAggregateOutputType | null
    _max: InventoryLedgerMaxAggregateOutputType | null
  }

  export type InventoryLedgerAvgAggregateOutputType = {
    id: number | null
    inventoryId: number | null
    quantityDelta: number | null
  }

  export type InventoryLedgerSumAggregateOutputType = {
    id: bigint | null
    inventoryId: bigint | null
    quantityDelta: number | null
  }

  export type InventoryLedgerMinAggregateOutputType = {
    id: bigint | null
    inventoryId: bigint | null
    transactionType: string | null
    quantityDelta: number | null
    referenceId: string | null
    reason: string | null
    createdAt: Date | null
  }

  export type InventoryLedgerMaxAggregateOutputType = {
    id: bigint | null
    inventoryId: bigint | null
    transactionType: string | null
    quantityDelta: number | null
    referenceId: string | null
    reason: string | null
    createdAt: Date | null
  }

  export type InventoryLedgerCountAggregateOutputType = {
    id: number
    inventoryId: number
    transactionType: number
    quantityDelta: number
    referenceId: number
    reason: number
    createdAt: number
    _all: number
  }


  export type InventoryLedgerAvgAggregateInputType = {
    id?: true
    inventoryId?: true
    quantityDelta?: true
  }

  export type InventoryLedgerSumAggregateInputType = {
    id?: true
    inventoryId?: true
    quantityDelta?: true
  }

  export type InventoryLedgerMinAggregateInputType = {
    id?: true
    inventoryId?: true
    transactionType?: true
    quantityDelta?: true
    referenceId?: true
    reason?: true
    createdAt?: true
  }

  export type InventoryLedgerMaxAggregateInputType = {
    id?: true
    inventoryId?: true
    transactionType?: true
    quantityDelta?: true
    referenceId?: true
    reason?: true
    createdAt?: true
  }

  export type InventoryLedgerCountAggregateInputType = {
    id?: true
    inventoryId?: true
    transactionType?: true
    quantityDelta?: true
    referenceId?: true
    reason?: true
    createdAt?: true
    _all?: true
  }

  export type InventoryLedgerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InventoryLedger to aggregate.
     */
    where?: InventoryLedgerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InventoryLedgers to fetch.
     */
    orderBy?: InventoryLedgerOrderByWithRelationInput | InventoryLedgerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InventoryLedgerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InventoryLedgers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InventoryLedgers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InventoryLedgers
    **/
    _count?: true | InventoryLedgerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InventoryLedgerAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InventoryLedgerSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InventoryLedgerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InventoryLedgerMaxAggregateInputType
  }

  export type GetInventoryLedgerAggregateType<T extends InventoryLedgerAggregateArgs> = {
        [P in keyof T & keyof AggregateInventoryLedger]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInventoryLedger[P]>
      : GetScalarType<T[P], AggregateInventoryLedger[P]>
  }




  export type InventoryLedgerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InventoryLedgerWhereInput
    orderBy?: InventoryLedgerOrderByWithAggregationInput | InventoryLedgerOrderByWithAggregationInput[]
    by: InventoryLedgerScalarFieldEnum[] | InventoryLedgerScalarFieldEnum
    having?: InventoryLedgerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InventoryLedgerCountAggregateInputType | true
    _avg?: InventoryLedgerAvgAggregateInputType
    _sum?: InventoryLedgerSumAggregateInputType
    _min?: InventoryLedgerMinAggregateInputType
    _max?: InventoryLedgerMaxAggregateInputType
  }

  export type InventoryLedgerGroupByOutputType = {
    id: bigint
    inventoryId: bigint
    transactionType: string
    quantityDelta: number
    referenceId: string | null
    reason: string | null
    createdAt: Date
    _count: InventoryLedgerCountAggregateOutputType | null
    _avg: InventoryLedgerAvgAggregateOutputType | null
    _sum: InventoryLedgerSumAggregateOutputType | null
    _min: InventoryLedgerMinAggregateOutputType | null
    _max: InventoryLedgerMaxAggregateOutputType | null
  }

  type GetInventoryLedgerGroupByPayload<T extends InventoryLedgerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InventoryLedgerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InventoryLedgerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InventoryLedgerGroupByOutputType[P]>
            : GetScalarType<T[P], InventoryLedgerGroupByOutputType[P]>
        }
      >
    >


  export type InventoryLedgerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inventoryId?: boolean
    transactionType?: boolean
    quantityDelta?: boolean
    referenceId?: boolean
    reason?: boolean
    createdAt?: boolean
    inventory?: boolean | SkuInventoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["inventoryLedger"]>

  export type InventoryLedgerSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inventoryId?: boolean
    transactionType?: boolean
    quantityDelta?: boolean
    referenceId?: boolean
    reason?: boolean
    createdAt?: boolean
    inventory?: boolean | SkuInventoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["inventoryLedger"]>

  export type InventoryLedgerSelectScalar = {
    id?: boolean
    inventoryId?: boolean
    transactionType?: boolean
    quantityDelta?: boolean
    referenceId?: boolean
    reason?: boolean
    createdAt?: boolean
  }

  export type InventoryLedgerInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inventory?: boolean | SkuInventoryDefaultArgs<ExtArgs>
  }
  export type InventoryLedgerIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inventory?: boolean | SkuInventoryDefaultArgs<ExtArgs>
  }

  export type $InventoryLedgerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InventoryLedger"
    objects: {
      inventory: Prisma.$SkuInventoryPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      inventoryId: bigint
      transactionType: string
      quantityDelta: number
      referenceId: string | null
      reason: string | null
      createdAt: Date
    }, ExtArgs["result"]["inventoryLedger"]>
    composites: {}
  }

  type InventoryLedgerGetPayload<S extends boolean | null | undefined | InventoryLedgerDefaultArgs> = $Result.GetResult<Prisma.$InventoryLedgerPayload, S>

  type InventoryLedgerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<InventoryLedgerFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: InventoryLedgerCountAggregateInputType | true
    }

  export interface InventoryLedgerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InventoryLedger'], meta: { name: 'InventoryLedger' } }
    /**
     * Find zero or one InventoryLedger that matches the filter.
     * @param {InventoryLedgerFindUniqueArgs} args - Arguments to find a InventoryLedger
     * @example
     * // Get one InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InventoryLedgerFindUniqueArgs>(args: SelectSubset<T, InventoryLedgerFindUniqueArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one InventoryLedger that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {InventoryLedgerFindUniqueOrThrowArgs} args - Arguments to find a InventoryLedger
     * @example
     * // Get one InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InventoryLedgerFindUniqueOrThrowArgs>(args: SelectSubset<T, InventoryLedgerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first InventoryLedger that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerFindFirstArgs} args - Arguments to find a InventoryLedger
     * @example
     * // Get one InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InventoryLedgerFindFirstArgs>(args?: SelectSubset<T, InventoryLedgerFindFirstArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first InventoryLedger that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerFindFirstOrThrowArgs} args - Arguments to find a InventoryLedger
     * @example
     * // Get one InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InventoryLedgerFindFirstOrThrowArgs>(args?: SelectSubset<T, InventoryLedgerFindFirstOrThrowArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more InventoryLedgers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InventoryLedgers
     * const inventoryLedgers = await prisma.inventoryLedger.findMany()
     * 
     * // Get first 10 InventoryLedgers
     * const inventoryLedgers = await prisma.inventoryLedger.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const inventoryLedgerWithIdOnly = await prisma.inventoryLedger.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InventoryLedgerFindManyArgs>(args?: SelectSubset<T, InventoryLedgerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a InventoryLedger.
     * @param {InventoryLedgerCreateArgs} args - Arguments to create a InventoryLedger.
     * @example
     * // Create one InventoryLedger
     * const InventoryLedger = await prisma.inventoryLedger.create({
     *   data: {
     *     // ... data to create a InventoryLedger
     *   }
     * })
     * 
     */
    create<T extends InventoryLedgerCreateArgs>(args: SelectSubset<T, InventoryLedgerCreateArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many InventoryLedgers.
     * @param {InventoryLedgerCreateManyArgs} args - Arguments to create many InventoryLedgers.
     * @example
     * // Create many InventoryLedgers
     * const inventoryLedger = await prisma.inventoryLedger.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InventoryLedgerCreateManyArgs>(args?: SelectSubset<T, InventoryLedgerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InventoryLedgers and returns the data saved in the database.
     * @param {InventoryLedgerCreateManyAndReturnArgs} args - Arguments to create many InventoryLedgers.
     * @example
     * // Create many InventoryLedgers
     * const inventoryLedger = await prisma.inventoryLedger.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InventoryLedgers and only return the `id`
     * const inventoryLedgerWithIdOnly = await prisma.inventoryLedger.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InventoryLedgerCreateManyAndReturnArgs>(args?: SelectSubset<T, InventoryLedgerCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a InventoryLedger.
     * @param {InventoryLedgerDeleteArgs} args - Arguments to delete one InventoryLedger.
     * @example
     * // Delete one InventoryLedger
     * const InventoryLedger = await prisma.inventoryLedger.delete({
     *   where: {
     *     // ... filter to delete one InventoryLedger
     *   }
     * })
     * 
     */
    delete<T extends InventoryLedgerDeleteArgs>(args: SelectSubset<T, InventoryLedgerDeleteArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one InventoryLedger.
     * @param {InventoryLedgerUpdateArgs} args - Arguments to update one InventoryLedger.
     * @example
     * // Update one InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InventoryLedgerUpdateArgs>(args: SelectSubset<T, InventoryLedgerUpdateArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more InventoryLedgers.
     * @param {InventoryLedgerDeleteManyArgs} args - Arguments to filter InventoryLedgers to delete.
     * @example
     * // Delete a few InventoryLedgers
     * const { count } = await prisma.inventoryLedger.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InventoryLedgerDeleteManyArgs>(args?: SelectSubset<T, InventoryLedgerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InventoryLedgers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InventoryLedgers
     * const inventoryLedger = await prisma.inventoryLedger.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InventoryLedgerUpdateManyArgs>(args: SelectSubset<T, InventoryLedgerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one InventoryLedger.
     * @param {InventoryLedgerUpsertArgs} args - Arguments to update or create a InventoryLedger.
     * @example
     * // Update or create a InventoryLedger
     * const inventoryLedger = await prisma.inventoryLedger.upsert({
     *   create: {
     *     // ... data to create a InventoryLedger
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InventoryLedger we want to update
     *   }
     * })
     */
    upsert<T extends InventoryLedgerUpsertArgs>(args: SelectSubset<T, InventoryLedgerUpsertArgs<ExtArgs>>): Prisma__InventoryLedgerClient<$Result.GetResult<Prisma.$InventoryLedgerPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of InventoryLedgers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerCountArgs} args - Arguments to filter InventoryLedgers to count.
     * @example
     * // Count the number of InventoryLedgers
     * const count = await prisma.inventoryLedger.count({
     *   where: {
     *     // ... the filter for the InventoryLedgers we want to count
     *   }
     * })
    **/
    count<T extends InventoryLedgerCountArgs>(
      args?: Subset<T, InventoryLedgerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InventoryLedgerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InventoryLedger.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InventoryLedgerAggregateArgs>(args: Subset<T, InventoryLedgerAggregateArgs>): Prisma.PrismaPromise<GetInventoryLedgerAggregateType<T>>

    /**
     * Group by InventoryLedger.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventoryLedgerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InventoryLedgerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InventoryLedgerGroupByArgs['orderBy'] }
        : { orderBy?: InventoryLedgerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InventoryLedgerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInventoryLedgerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InventoryLedger model
   */
  readonly fields: InventoryLedgerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InventoryLedger.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InventoryLedgerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    inventory<T extends SkuInventoryDefaultArgs<ExtArgs> = {}>(args?: Subset<T, SkuInventoryDefaultArgs<ExtArgs>>): Prisma__SkuInventoryClient<$Result.GetResult<Prisma.$SkuInventoryPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the InventoryLedger model
   */ 
  interface InventoryLedgerFieldRefs {
    readonly id: FieldRef<"InventoryLedger", 'BigInt'>
    readonly inventoryId: FieldRef<"InventoryLedger", 'BigInt'>
    readonly transactionType: FieldRef<"InventoryLedger", 'String'>
    readonly quantityDelta: FieldRef<"InventoryLedger", 'Int'>
    readonly referenceId: FieldRef<"InventoryLedger", 'String'>
    readonly reason: FieldRef<"InventoryLedger", 'String'>
    readonly createdAt: FieldRef<"InventoryLedger", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * InventoryLedger findUnique
   */
  export type InventoryLedgerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter, which InventoryLedger to fetch.
     */
    where: InventoryLedgerWhereUniqueInput
  }

  /**
   * InventoryLedger findUniqueOrThrow
   */
  export type InventoryLedgerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter, which InventoryLedger to fetch.
     */
    where: InventoryLedgerWhereUniqueInput
  }

  /**
   * InventoryLedger findFirst
   */
  export type InventoryLedgerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter, which InventoryLedger to fetch.
     */
    where?: InventoryLedgerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InventoryLedgers to fetch.
     */
    orderBy?: InventoryLedgerOrderByWithRelationInput | InventoryLedgerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InventoryLedgers.
     */
    cursor?: InventoryLedgerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InventoryLedgers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InventoryLedgers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InventoryLedgers.
     */
    distinct?: InventoryLedgerScalarFieldEnum | InventoryLedgerScalarFieldEnum[]
  }

  /**
   * InventoryLedger findFirstOrThrow
   */
  export type InventoryLedgerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter, which InventoryLedger to fetch.
     */
    where?: InventoryLedgerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InventoryLedgers to fetch.
     */
    orderBy?: InventoryLedgerOrderByWithRelationInput | InventoryLedgerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InventoryLedgers.
     */
    cursor?: InventoryLedgerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InventoryLedgers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InventoryLedgers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InventoryLedgers.
     */
    distinct?: InventoryLedgerScalarFieldEnum | InventoryLedgerScalarFieldEnum[]
  }

  /**
   * InventoryLedger findMany
   */
  export type InventoryLedgerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter, which InventoryLedgers to fetch.
     */
    where?: InventoryLedgerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InventoryLedgers to fetch.
     */
    orderBy?: InventoryLedgerOrderByWithRelationInput | InventoryLedgerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InventoryLedgers.
     */
    cursor?: InventoryLedgerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InventoryLedgers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InventoryLedgers.
     */
    skip?: number
    distinct?: InventoryLedgerScalarFieldEnum | InventoryLedgerScalarFieldEnum[]
  }

  /**
   * InventoryLedger create
   */
  export type InventoryLedgerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * The data needed to create a InventoryLedger.
     */
    data: XOR<InventoryLedgerCreateInput, InventoryLedgerUncheckedCreateInput>
  }

  /**
   * InventoryLedger createMany
   */
  export type InventoryLedgerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InventoryLedgers.
     */
    data: InventoryLedgerCreateManyInput | InventoryLedgerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InventoryLedger createManyAndReturn
   */
  export type InventoryLedgerCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many InventoryLedgers.
     */
    data: InventoryLedgerCreateManyInput | InventoryLedgerCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InventoryLedger update
   */
  export type InventoryLedgerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * The data needed to update a InventoryLedger.
     */
    data: XOR<InventoryLedgerUpdateInput, InventoryLedgerUncheckedUpdateInput>
    /**
     * Choose, which InventoryLedger to update.
     */
    where: InventoryLedgerWhereUniqueInput
  }

  /**
   * InventoryLedger updateMany
   */
  export type InventoryLedgerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InventoryLedgers.
     */
    data: XOR<InventoryLedgerUpdateManyMutationInput, InventoryLedgerUncheckedUpdateManyInput>
    /**
     * Filter which InventoryLedgers to update
     */
    where?: InventoryLedgerWhereInput
  }

  /**
   * InventoryLedger upsert
   */
  export type InventoryLedgerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * The filter to search for the InventoryLedger to update in case it exists.
     */
    where: InventoryLedgerWhereUniqueInput
    /**
     * In case the InventoryLedger found by the `where` argument doesn't exist, create a new InventoryLedger with this data.
     */
    create: XOR<InventoryLedgerCreateInput, InventoryLedgerUncheckedCreateInput>
    /**
     * In case the InventoryLedger was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InventoryLedgerUpdateInput, InventoryLedgerUncheckedUpdateInput>
  }

  /**
   * InventoryLedger delete
   */
  export type InventoryLedgerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
    /**
     * Filter which InventoryLedger to delete.
     */
    where: InventoryLedgerWhereUniqueInput
  }

  /**
   * InventoryLedger deleteMany
   */
  export type InventoryLedgerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InventoryLedgers to delete
     */
    where?: InventoryLedgerWhereInput
  }

  /**
   * InventoryLedger without action
   */
  export type InventoryLedgerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InventoryLedger
     */
    select?: InventoryLedgerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InventoryLedgerInclude<ExtArgs> | null
  }


  /**
   * Model Shipment
   */

  export type AggregateShipment = {
    _count: ShipmentCountAggregateOutputType | null
    _avg: ShipmentAvgAggregateOutputType | null
    _sum: ShipmentSumAggregateOutputType | null
    _min: ShipmentMinAggregateOutputType | null
    _max: ShipmentMaxAggregateOutputType | null
  }

  export type ShipmentAvgAggregateOutputType = {
    warehouseId: number | null
    shippingFee: Decimal | null
  }

  export type ShipmentSumAggregateOutputType = {
    warehouseId: bigint | null
    shippingFee: Decimal | null
  }

  export type ShipmentMinAggregateOutputType = {
    id: string | null
    orderId: string | null
    warehouseId: bigint | null
    carrierCode: string | null
    trackingCode: string | null
    shippingFee: Decimal | null
    status: string | null
    receiverName: string | null
    receiverPhone: string | null
    shippingAddress: string | null
    shippedAt: Date | null
    deliveredAt: Date | null
    city: string | null
    currentLocation: string | null
    estimatedDeliveryDate: Date | null
    actualDeliveryDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShipmentMaxAggregateOutputType = {
    id: string | null
    orderId: string | null
    warehouseId: bigint | null
    carrierCode: string | null
    trackingCode: string | null
    shippingFee: Decimal | null
    status: string | null
    receiverName: string | null
    receiverPhone: string | null
    shippingAddress: string | null
    shippedAt: Date | null
    deliveredAt: Date | null
    city: string | null
    currentLocation: string | null
    estimatedDeliveryDate: Date | null
    actualDeliveryDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShipmentCountAggregateOutputType = {
    id: number
    orderId: number
    warehouseId: number
    carrierCode: number
    trackingCode: number
    shippingFee: number
    status: number
    receiverName: number
    receiverPhone: number
    shippingAddress: number
    shippedAt: number
    deliveredAt: number
    city: number
    currentLocation: number
    estimatedDeliveryDate: number
    actualDeliveryDate: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ShipmentAvgAggregateInputType = {
    warehouseId?: true
    shippingFee?: true
  }

  export type ShipmentSumAggregateInputType = {
    warehouseId?: true
    shippingFee?: true
  }

  export type ShipmentMinAggregateInputType = {
    id?: true
    orderId?: true
    warehouseId?: true
    carrierCode?: true
    trackingCode?: true
    shippingFee?: true
    status?: true
    receiverName?: true
    receiverPhone?: true
    shippingAddress?: true
    shippedAt?: true
    deliveredAt?: true
    city?: true
    currentLocation?: true
    estimatedDeliveryDate?: true
    actualDeliveryDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShipmentMaxAggregateInputType = {
    id?: true
    orderId?: true
    warehouseId?: true
    carrierCode?: true
    trackingCode?: true
    shippingFee?: true
    status?: true
    receiverName?: true
    receiverPhone?: true
    shippingAddress?: true
    shippedAt?: true
    deliveredAt?: true
    city?: true
    currentLocation?: true
    estimatedDeliveryDate?: true
    actualDeliveryDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShipmentCountAggregateInputType = {
    id?: true
    orderId?: true
    warehouseId?: true
    carrierCode?: true
    trackingCode?: true
    shippingFee?: true
    status?: true
    receiverName?: true
    receiverPhone?: true
    shippingAddress?: true
    shippedAt?: true
    deliveredAt?: true
    city?: true
    currentLocation?: true
    estimatedDeliveryDate?: true
    actualDeliveryDate?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ShipmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Shipment to aggregate.
     */
    where?: ShipmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Shipments to fetch.
     */
    orderBy?: ShipmentOrderByWithRelationInput | ShipmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ShipmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Shipments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Shipments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Shipments
    **/
    _count?: true | ShipmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ShipmentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ShipmentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShipmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShipmentMaxAggregateInputType
  }

  export type GetShipmentAggregateType<T extends ShipmentAggregateArgs> = {
        [P in keyof T & keyof AggregateShipment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShipment[P]>
      : GetScalarType<T[P], AggregateShipment[P]>
  }




  export type ShipmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShipmentWhereInput
    orderBy?: ShipmentOrderByWithAggregationInput | ShipmentOrderByWithAggregationInput[]
    by: ShipmentScalarFieldEnum[] | ShipmentScalarFieldEnum
    having?: ShipmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShipmentCountAggregateInputType | true
    _avg?: ShipmentAvgAggregateInputType
    _sum?: ShipmentSumAggregateInputType
    _min?: ShipmentMinAggregateInputType
    _max?: ShipmentMaxAggregateInputType
  }

  export type ShipmentGroupByOutputType = {
    id: string
    orderId: string
    warehouseId: bigint | null
    carrierCode: string
    trackingCode: string | null
    shippingFee: Decimal
    status: string
    receiverName: string | null
    receiverPhone: string | null
    shippingAddress: string
    shippedAt: Date | null
    deliveredAt: Date | null
    city: string | null
    currentLocation: string | null
    estimatedDeliveryDate: Date | null
    actualDeliveryDate: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ShipmentCountAggregateOutputType | null
    _avg: ShipmentAvgAggregateOutputType | null
    _sum: ShipmentSumAggregateOutputType | null
    _min: ShipmentMinAggregateOutputType | null
    _max: ShipmentMaxAggregateOutputType | null
  }

  type GetShipmentGroupByPayload<T extends ShipmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShipmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShipmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShipmentGroupByOutputType[P]>
            : GetScalarType<T[P], ShipmentGroupByOutputType[P]>
        }
      >
    >


  export type ShipmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderId?: boolean
    warehouseId?: boolean
    carrierCode?: boolean
    trackingCode?: boolean
    shippingFee?: boolean
    status?: boolean
    receiverName?: boolean
    receiverPhone?: boolean
    shippingAddress?: boolean
    shippedAt?: boolean
    deliveredAt?: boolean
    city?: boolean
    currentLocation?: boolean
    estimatedDeliveryDate?: boolean
    actualDeliveryDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    warehouse?: boolean | Shipment$warehouseArgs<ExtArgs>
  }, ExtArgs["result"]["shipment"]>

  export type ShipmentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderId?: boolean
    warehouseId?: boolean
    carrierCode?: boolean
    trackingCode?: boolean
    shippingFee?: boolean
    status?: boolean
    receiverName?: boolean
    receiverPhone?: boolean
    shippingAddress?: boolean
    shippedAt?: boolean
    deliveredAt?: boolean
    city?: boolean
    currentLocation?: boolean
    estimatedDeliveryDate?: boolean
    actualDeliveryDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    warehouse?: boolean | Shipment$warehouseArgs<ExtArgs>
  }, ExtArgs["result"]["shipment"]>

  export type ShipmentSelectScalar = {
    id?: boolean
    orderId?: boolean
    warehouseId?: boolean
    carrierCode?: boolean
    trackingCode?: boolean
    shippingFee?: boolean
    status?: boolean
    receiverName?: boolean
    receiverPhone?: boolean
    shippingAddress?: boolean
    shippedAt?: boolean
    deliveredAt?: boolean
    city?: boolean
    currentLocation?: boolean
    estimatedDeliveryDate?: boolean
    actualDeliveryDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ShipmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    warehouse?: boolean | Shipment$warehouseArgs<ExtArgs>
  }
  export type ShipmentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    warehouse?: boolean | Shipment$warehouseArgs<ExtArgs>
  }

  export type $ShipmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Shipment"
    objects: {
      warehouse: Prisma.$WarehousePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      orderId: string
      warehouseId: bigint | null
      carrierCode: string
      trackingCode: string | null
      shippingFee: Prisma.Decimal
      status: string
      receiverName: string | null
      receiverPhone: string | null
      shippingAddress: string
      shippedAt: Date | null
      deliveredAt: Date | null
      city: string | null
      currentLocation: string | null
      estimatedDeliveryDate: Date | null
      actualDeliveryDate: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["shipment"]>
    composites: {}
  }

  type ShipmentGetPayload<S extends boolean | null | undefined | ShipmentDefaultArgs> = $Result.GetResult<Prisma.$ShipmentPayload, S>

  type ShipmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ShipmentFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ShipmentCountAggregateInputType | true
    }

  export interface ShipmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Shipment'], meta: { name: 'Shipment' } }
    /**
     * Find zero or one Shipment that matches the filter.
     * @param {ShipmentFindUniqueArgs} args - Arguments to find a Shipment
     * @example
     * // Get one Shipment
     * const shipment = await prisma.shipment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ShipmentFindUniqueArgs>(args: SelectSubset<T, ShipmentFindUniqueArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Shipment that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ShipmentFindUniqueOrThrowArgs} args - Arguments to find a Shipment
     * @example
     * // Get one Shipment
     * const shipment = await prisma.shipment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ShipmentFindUniqueOrThrowArgs>(args: SelectSubset<T, ShipmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Shipment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentFindFirstArgs} args - Arguments to find a Shipment
     * @example
     * // Get one Shipment
     * const shipment = await prisma.shipment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ShipmentFindFirstArgs>(args?: SelectSubset<T, ShipmentFindFirstArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Shipment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentFindFirstOrThrowArgs} args - Arguments to find a Shipment
     * @example
     * // Get one Shipment
     * const shipment = await prisma.shipment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ShipmentFindFirstOrThrowArgs>(args?: SelectSubset<T, ShipmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Shipments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Shipments
     * const shipments = await prisma.shipment.findMany()
     * 
     * // Get first 10 Shipments
     * const shipments = await prisma.shipment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const shipmentWithIdOnly = await prisma.shipment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ShipmentFindManyArgs>(args?: SelectSubset<T, ShipmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Shipment.
     * @param {ShipmentCreateArgs} args - Arguments to create a Shipment.
     * @example
     * // Create one Shipment
     * const Shipment = await prisma.shipment.create({
     *   data: {
     *     // ... data to create a Shipment
     *   }
     * })
     * 
     */
    create<T extends ShipmentCreateArgs>(args: SelectSubset<T, ShipmentCreateArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Shipments.
     * @param {ShipmentCreateManyArgs} args - Arguments to create many Shipments.
     * @example
     * // Create many Shipments
     * const shipment = await prisma.shipment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ShipmentCreateManyArgs>(args?: SelectSubset<T, ShipmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Shipments and returns the data saved in the database.
     * @param {ShipmentCreateManyAndReturnArgs} args - Arguments to create many Shipments.
     * @example
     * // Create many Shipments
     * const shipment = await prisma.shipment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Shipments and only return the `id`
     * const shipmentWithIdOnly = await prisma.shipment.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ShipmentCreateManyAndReturnArgs>(args?: SelectSubset<T, ShipmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Shipment.
     * @param {ShipmentDeleteArgs} args - Arguments to delete one Shipment.
     * @example
     * // Delete one Shipment
     * const Shipment = await prisma.shipment.delete({
     *   where: {
     *     // ... filter to delete one Shipment
     *   }
     * })
     * 
     */
    delete<T extends ShipmentDeleteArgs>(args: SelectSubset<T, ShipmentDeleteArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Shipment.
     * @param {ShipmentUpdateArgs} args - Arguments to update one Shipment.
     * @example
     * // Update one Shipment
     * const shipment = await prisma.shipment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ShipmentUpdateArgs>(args: SelectSubset<T, ShipmentUpdateArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Shipments.
     * @param {ShipmentDeleteManyArgs} args - Arguments to filter Shipments to delete.
     * @example
     * // Delete a few Shipments
     * const { count } = await prisma.shipment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ShipmentDeleteManyArgs>(args?: SelectSubset<T, ShipmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Shipments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Shipments
     * const shipment = await prisma.shipment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ShipmentUpdateManyArgs>(args: SelectSubset<T, ShipmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Shipment.
     * @param {ShipmentUpsertArgs} args - Arguments to update or create a Shipment.
     * @example
     * // Update or create a Shipment
     * const shipment = await prisma.shipment.upsert({
     *   create: {
     *     // ... data to create a Shipment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Shipment we want to update
     *   }
     * })
     */
    upsert<T extends ShipmentUpsertArgs>(args: SelectSubset<T, ShipmentUpsertArgs<ExtArgs>>): Prisma__ShipmentClient<$Result.GetResult<Prisma.$ShipmentPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Shipments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentCountArgs} args - Arguments to filter Shipments to count.
     * @example
     * // Count the number of Shipments
     * const count = await prisma.shipment.count({
     *   where: {
     *     // ... the filter for the Shipments we want to count
     *   }
     * })
    **/
    count<T extends ShipmentCountArgs>(
      args?: Subset<T, ShipmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShipmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Shipment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShipmentAggregateArgs>(args: Subset<T, ShipmentAggregateArgs>): Prisma.PrismaPromise<GetShipmentAggregateType<T>>

    /**
     * Group by Shipment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipmentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ShipmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ShipmentGroupByArgs['orderBy'] }
        : { orderBy?: ShipmentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ShipmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShipmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Shipment model
   */
  readonly fields: ShipmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Shipment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ShipmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    warehouse<T extends Shipment$warehouseArgs<ExtArgs> = {}>(args?: Subset<T, Shipment$warehouseArgs<ExtArgs>>): Prisma__WarehouseClient<$Result.GetResult<Prisma.$WarehousePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Shipment model
   */ 
  interface ShipmentFieldRefs {
    readonly id: FieldRef<"Shipment", 'String'>
    readonly orderId: FieldRef<"Shipment", 'String'>
    readonly warehouseId: FieldRef<"Shipment", 'BigInt'>
    readonly carrierCode: FieldRef<"Shipment", 'String'>
    readonly trackingCode: FieldRef<"Shipment", 'String'>
    readonly shippingFee: FieldRef<"Shipment", 'Decimal'>
    readonly status: FieldRef<"Shipment", 'String'>
    readonly receiverName: FieldRef<"Shipment", 'String'>
    readonly receiverPhone: FieldRef<"Shipment", 'String'>
    readonly shippingAddress: FieldRef<"Shipment", 'String'>
    readonly shippedAt: FieldRef<"Shipment", 'DateTime'>
    readonly deliveredAt: FieldRef<"Shipment", 'DateTime'>
    readonly city: FieldRef<"Shipment", 'String'>
    readonly currentLocation: FieldRef<"Shipment", 'String'>
    readonly estimatedDeliveryDate: FieldRef<"Shipment", 'DateTime'>
    readonly actualDeliveryDate: FieldRef<"Shipment", 'DateTime'>
    readonly createdAt: FieldRef<"Shipment", 'DateTime'>
    readonly updatedAt: FieldRef<"Shipment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Shipment findUnique
   */
  export type ShipmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter, which Shipment to fetch.
     */
    where: ShipmentWhereUniqueInput
  }

  /**
   * Shipment findUniqueOrThrow
   */
  export type ShipmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter, which Shipment to fetch.
     */
    where: ShipmentWhereUniqueInput
  }

  /**
   * Shipment findFirst
   */
  export type ShipmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter, which Shipment to fetch.
     */
    where?: ShipmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Shipments to fetch.
     */
    orderBy?: ShipmentOrderByWithRelationInput | ShipmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Shipments.
     */
    cursor?: ShipmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Shipments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Shipments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Shipments.
     */
    distinct?: ShipmentScalarFieldEnum | ShipmentScalarFieldEnum[]
  }

  /**
   * Shipment findFirstOrThrow
   */
  export type ShipmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter, which Shipment to fetch.
     */
    where?: ShipmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Shipments to fetch.
     */
    orderBy?: ShipmentOrderByWithRelationInput | ShipmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Shipments.
     */
    cursor?: ShipmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Shipments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Shipments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Shipments.
     */
    distinct?: ShipmentScalarFieldEnum | ShipmentScalarFieldEnum[]
  }

  /**
   * Shipment findMany
   */
  export type ShipmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter, which Shipments to fetch.
     */
    where?: ShipmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Shipments to fetch.
     */
    orderBy?: ShipmentOrderByWithRelationInput | ShipmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Shipments.
     */
    cursor?: ShipmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Shipments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Shipments.
     */
    skip?: number
    distinct?: ShipmentScalarFieldEnum | ShipmentScalarFieldEnum[]
  }

  /**
   * Shipment create
   */
  export type ShipmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * The data needed to create a Shipment.
     */
    data: XOR<ShipmentCreateInput, ShipmentUncheckedCreateInput>
  }

  /**
   * Shipment createMany
   */
  export type ShipmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Shipments.
     */
    data: ShipmentCreateManyInput | ShipmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Shipment createManyAndReturn
   */
  export type ShipmentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Shipments.
     */
    data: ShipmentCreateManyInput | ShipmentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Shipment update
   */
  export type ShipmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * The data needed to update a Shipment.
     */
    data: XOR<ShipmentUpdateInput, ShipmentUncheckedUpdateInput>
    /**
     * Choose, which Shipment to update.
     */
    where: ShipmentWhereUniqueInput
  }

  /**
   * Shipment updateMany
   */
  export type ShipmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Shipments.
     */
    data: XOR<ShipmentUpdateManyMutationInput, ShipmentUncheckedUpdateManyInput>
    /**
     * Filter which Shipments to update
     */
    where?: ShipmentWhereInput
  }

  /**
   * Shipment upsert
   */
  export type ShipmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * The filter to search for the Shipment to update in case it exists.
     */
    where: ShipmentWhereUniqueInput
    /**
     * In case the Shipment found by the `where` argument doesn't exist, create a new Shipment with this data.
     */
    create: XOR<ShipmentCreateInput, ShipmentUncheckedCreateInput>
    /**
     * In case the Shipment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ShipmentUpdateInput, ShipmentUncheckedUpdateInput>
  }

  /**
   * Shipment delete
   */
  export type ShipmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
    /**
     * Filter which Shipment to delete.
     */
    where: ShipmentWhereUniqueInput
  }

  /**
   * Shipment deleteMany
   */
  export type ShipmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Shipments to delete
     */
    where?: ShipmentWhereInput
  }

  /**
   * Shipment.warehouse
   */
  export type Shipment$warehouseArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Warehouse
     */
    select?: WarehouseSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WarehouseInclude<ExtArgs> | null
    where?: WarehouseWhereInput
  }

  /**
   * Shipment without action
   */
  export type ShipmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Shipment
     */
    select?: ShipmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipmentInclude<ExtArgs> | null
  }


  /**
   * Model Carrier
   */

  export type AggregateCarrier = {
    _count: CarrierCountAggregateOutputType | null
    _avg: CarrierAvgAggregateOutputType | null
    _sum: CarrierSumAggregateOutputType | null
    _min: CarrierMinAggregateOutputType | null
    _max: CarrierMaxAggregateOutputType | null
  }

  export type CarrierAvgAggregateOutputType = {
    id: number | null
  }

  export type CarrierSumAggregateOutputType = {
    id: bigint | null
  }

  export type CarrierMinAggregateOutputType = {
    id: bigint | null
    carrierCode: string | null
    carrierName: string | null
    isActive: boolean | null
    apiEndpoint: string | null
    createdAt: Date | null
  }

  export type CarrierMaxAggregateOutputType = {
    id: bigint | null
    carrierCode: string | null
    carrierName: string | null
    isActive: boolean | null
    apiEndpoint: string | null
    createdAt: Date | null
  }

  export type CarrierCountAggregateOutputType = {
    id: number
    carrierCode: number
    carrierName: number
    isActive: number
    apiEndpoint: number
    createdAt: number
    _all: number
  }


  export type CarrierAvgAggregateInputType = {
    id?: true
  }

  export type CarrierSumAggregateInputType = {
    id?: true
  }

  export type CarrierMinAggregateInputType = {
    id?: true
    carrierCode?: true
    carrierName?: true
    isActive?: true
    apiEndpoint?: true
    createdAt?: true
  }

  export type CarrierMaxAggregateInputType = {
    id?: true
    carrierCode?: true
    carrierName?: true
    isActive?: true
    apiEndpoint?: true
    createdAt?: true
  }

  export type CarrierCountAggregateInputType = {
    id?: true
    carrierCode?: true
    carrierName?: true
    isActive?: true
    apiEndpoint?: true
    createdAt?: true
    _all?: true
  }

  export type CarrierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Carrier to aggregate.
     */
    where?: CarrierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Carriers to fetch.
     */
    orderBy?: CarrierOrderByWithRelationInput | CarrierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CarrierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Carriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Carriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Carriers
    **/
    _count?: true | CarrierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CarrierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CarrierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CarrierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CarrierMaxAggregateInputType
  }

  export type GetCarrierAggregateType<T extends CarrierAggregateArgs> = {
        [P in keyof T & keyof AggregateCarrier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCarrier[P]>
      : GetScalarType<T[P], AggregateCarrier[P]>
  }




  export type CarrierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CarrierWhereInput
    orderBy?: CarrierOrderByWithAggregationInput | CarrierOrderByWithAggregationInput[]
    by: CarrierScalarFieldEnum[] | CarrierScalarFieldEnum
    having?: CarrierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CarrierCountAggregateInputType | true
    _avg?: CarrierAvgAggregateInputType
    _sum?: CarrierSumAggregateInputType
    _min?: CarrierMinAggregateInputType
    _max?: CarrierMaxAggregateInputType
  }

  export type CarrierGroupByOutputType = {
    id: bigint
    carrierCode: string
    carrierName: string
    isActive: boolean
    apiEndpoint: string | null
    createdAt: Date
    _count: CarrierCountAggregateOutputType | null
    _avg: CarrierAvgAggregateOutputType | null
    _sum: CarrierSumAggregateOutputType | null
    _min: CarrierMinAggregateOutputType | null
    _max: CarrierMaxAggregateOutputType | null
  }

  type GetCarrierGroupByPayload<T extends CarrierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CarrierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CarrierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CarrierGroupByOutputType[P]>
            : GetScalarType<T[P], CarrierGroupByOutputType[P]>
        }
      >
    >


  export type CarrierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    carrierCode?: boolean
    carrierName?: boolean
    isActive?: boolean
    apiEndpoint?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["carrier"]>

  export type CarrierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    carrierCode?: boolean
    carrierName?: boolean
    isActive?: boolean
    apiEndpoint?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["carrier"]>

  export type CarrierSelectScalar = {
    id?: boolean
    carrierCode?: boolean
    carrierName?: boolean
    isActive?: boolean
    apiEndpoint?: boolean
    createdAt?: boolean
  }


  export type $CarrierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Carrier"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      carrierCode: string
      carrierName: string
      isActive: boolean
      apiEndpoint: string | null
      createdAt: Date
    }, ExtArgs["result"]["carrier"]>
    composites: {}
  }

  type CarrierGetPayload<S extends boolean | null | undefined | CarrierDefaultArgs> = $Result.GetResult<Prisma.$CarrierPayload, S>

  type CarrierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CarrierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CarrierCountAggregateInputType | true
    }

  export interface CarrierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Carrier'], meta: { name: 'Carrier' } }
    /**
     * Find zero or one Carrier that matches the filter.
     * @param {CarrierFindUniqueArgs} args - Arguments to find a Carrier
     * @example
     * // Get one Carrier
     * const carrier = await prisma.carrier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CarrierFindUniqueArgs>(args: SelectSubset<T, CarrierFindUniqueArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Carrier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CarrierFindUniqueOrThrowArgs} args - Arguments to find a Carrier
     * @example
     * // Get one Carrier
     * const carrier = await prisma.carrier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CarrierFindUniqueOrThrowArgs>(args: SelectSubset<T, CarrierFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Carrier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierFindFirstArgs} args - Arguments to find a Carrier
     * @example
     * // Get one Carrier
     * const carrier = await prisma.carrier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CarrierFindFirstArgs>(args?: SelectSubset<T, CarrierFindFirstArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Carrier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierFindFirstOrThrowArgs} args - Arguments to find a Carrier
     * @example
     * // Get one Carrier
     * const carrier = await prisma.carrier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CarrierFindFirstOrThrowArgs>(args?: SelectSubset<T, CarrierFindFirstOrThrowArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Carriers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Carriers
     * const carriers = await prisma.carrier.findMany()
     * 
     * // Get first 10 Carriers
     * const carriers = await prisma.carrier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const carrierWithIdOnly = await prisma.carrier.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CarrierFindManyArgs>(args?: SelectSubset<T, CarrierFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Carrier.
     * @param {CarrierCreateArgs} args - Arguments to create a Carrier.
     * @example
     * // Create one Carrier
     * const Carrier = await prisma.carrier.create({
     *   data: {
     *     // ... data to create a Carrier
     *   }
     * })
     * 
     */
    create<T extends CarrierCreateArgs>(args: SelectSubset<T, CarrierCreateArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Carriers.
     * @param {CarrierCreateManyArgs} args - Arguments to create many Carriers.
     * @example
     * // Create many Carriers
     * const carrier = await prisma.carrier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CarrierCreateManyArgs>(args?: SelectSubset<T, CarrierCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Carriers and returns the data saved in the database.
     * @param {CarrierCreateManyAndReturnArgs} args - Arguments to create many Carriers.
     * @example
     * // Create many Carriers
     * const carrier = await prisma.carrier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Carriers and only return the `id`
     * const carrierWithIdOnly = await prisma.carrier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CarrierCreateManyAndReturnArgs>(args?: SelectSubset<T, CarrierCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Carrier.
     * @param {CarrierDeleteArgs} args - Arguments to delete one Carrier.
     * @example
     * // Delete one Carrier
     * const Carrier = await prisma.carrier.delete({
     *   where: {
     *     // ... filter to delete one Carrier
     *   }
     * })
     * 
     */
    delete<T extends CarrierDeleteArgs>(args: SelectSubset<T, CarrierDeleteArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Carrier.
     * @param {CarrierUpdateArgs} args - Arguments to update one Carrier.
     * @example
     * // Update one Carrier
     * const carrier = await prisma.carrier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CarrierUpdateArgs>(args: SelectSubset<T, CarrierUpdateArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Carriers.
     * @param {CarrierDeleteManyArgs} args - Arguments to filter Carriers to delete.
     * @example
     * // Delete a few Carriers
     * const { count } = await prisma.carrier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CarrierDeleteManyArgs>(args?: SelectSubset<T, CarrierDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Carriers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Carriers
     * const carrier = await prisma.carrier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CarrierUpdateManyArgs>(args: SelectSubset<T, CarrierUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Carrier.
     * @param {CarrierUpsertArgs} args - Arguments to update or create a Carrier.
     * @example
     * // Update or create a Carrier
     * const carrier = await prisma.carrier.upsert({
     *   create: {
     *     // ... data to create a Carrier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Carrier we want to update
     *   }
     * })
     */
    upsert<T extends CarrierUpsertArgs>(args: SelectSubset<T, CarrierUpsertArgs<ExtArgs>>): Prisma__CarrierClient<$Result.GetResult<Prisma.$CarrierPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Carriers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierCountArgs} args - Arguments to filter Carriers to count.
     * @example
     * // Count the number of Carriers
     * const count = await prisma.carrier.count({
     *   where: {
     *     // ... the filter for the Carriers we want to count
     *   }
     * })
    **/
    count<T extends CarrierCountArgs>(
      args?: Subset<T, CarrierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CarrierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Carrier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CarrierAggregateArgs>(args: Subset<T, CarrierAggregateArgs>): Prisma.PrismaPromise<GetCarrierAggregateType<T>>

    /**
     * Group by Carrier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CarrierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CarrierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CarrierGroupByArgs['orderBy'] }
        : { orderBy?: CarrierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CarrierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCarrierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Carrier model
   */
  readonly fields: CarrierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Carrier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CarrierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Carrier model
   */ 
  interface CarrierFieldRefs {
    readonly id: FieldRef<"Carrier", 'BigInt'>
    readonly carrierCode: FieldRef<"Carrier", 'String'>
    readonly carrierName: FieldRef<"Carrier", 'String'>
    readonly isActive: FieldRef<"Carrier", 'Boolean'>
    readonly apiEndpoint: FieldRef<"Carrier", 'String'>
    readonly createdAt: FieldRef<"Carrier", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Carrier findUnique
   */
  export type CarrierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter, which Carrier to fetch.
     */
    where: CarrierWhereUniqueInput
  }

  /**
   * Carrier findUniqueOrThrow
   */
  export type CarrierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter, which Carrier to fetch.
     */
    where: CarrierWhereUniqueInput
  }

  /**
   * Carrier findFirst
   */
  export type CarrierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter, which Carrier to fetch.
     */
    where?: CarrierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Carriers to fetch.
     */
    orderBy?: CarrierOrderByWithRelationInput | CarrierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Carriers.
     */
    cursor?: CarrierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Carriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Carriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Carriers.
     */
    distinct?: CarrierScalarFieldEnum | CarrierScalarFieldEnum[]
  }

  /**
   * Carrier findFirstOrThrow
   */
  export type CarrierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter, which Carrier to fetch.
     */
    where?: CarrierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Carriers to fetch.
     */
    orderBy?: CarrierOrderByWithRelationInput | CarrierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Carriers.
     */
    cursor?: CarrierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Carriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Carriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Carriers.
     */
    distinct?: CarrierScalarFieldEnum | CarrierScalarFieldEnum[]
  }

  /**
   * Carrier findMany
   */
  export type CarrierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter, which Carriers to fetch.
     */
    where?: CarrierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Carriers to fetch.
     */
    orderBy?: CarrierOrderByWithRelationInput | CarrierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Carriers.
     */
    cursor?: CarrierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Carriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Carriers.
     */
    skip?: number
    distinct?: CarrierScalarFieldEnum | CarrierScalarFieldEnum[]
  }

  /**
   * Carrier create
   */
  export type CarrierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * The data needed to create a Carrier.
     */
    data: XOR<CarrierCreateInput, CarrierUncheckedCreateInput>
  }

  /**
   * Carrier createMany
   */
  export type CarrierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Carriers.
     */
    data: CarrierCreateManyInput | CarrierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Carrier createManyAndReturn
   */
  export type CarrierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Carriers.
     */
    data: CarrierCreateManyInput | CarrierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Carrier update
   */
  export type CarrierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * The data needed to update a Carrier.
     */
    data: XOR<CarrierUpdateInput, CarrierUncheckedUpdateInput>
    /**
     * Choose, which Carrier to update.
     */
    where: CarrierWhereUniqueInput
  }

  /**
   * Carrier updateMany
   */
  export type CarrierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Carriers.
     */
    data: XOR<CarrierUpdateManyMutationInput, CarrierUncheckedUpdateManyInput>
    /**
     * Filter which Carriers to update
     */
    where?: CarrierWhereInput
  }

  /**
   * Carrier upsert
   */
  export type CarrierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * The filter to search for the Carrier to update in case it exists.
     */
    where: CarrierWhereUniqueInput
    /**
     * In case the Carrier found by the `where` argument doesn't exist, create a new Carrier with this data.
     */
    create: XOR<CarrierCreateInput, CarrierUncheckedCreateInput>
    /**
     * In case the Carrier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CarrierUpdateInput, CarrierUncheckedUpdateInput>
  }

  /**
   * Carrier delete
   */
  export type CarrierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
    /**
     * Filter which Carrier to delete.
     */
    where: CarrierWhereUniqueInput
  }

  /**
   * Carrier deleteMany
   */
  export type CarrierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Carriers to delete
     */
    where?: CarrierWhereInput
  }

  /**
   * Carrier without action
   */
  export type CarrierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Carrier
     */
    select?: CarrierSelect<ExtArgs> | null
  }


  /**
   * Model SupportCase
   */

  export type AggregateSupportCase = {
    _count: SupportCaseCountAggregateOutputType | null
    _min: SupportCaseMinAggregateOutputType | null
    _max: SupportCaseMaxAggregateOutputType | null
  }

  export type SupportCaseMinAggregateOutputType = {
    id: string | null
    type: string | null
    orderId: string | null
    orderCode: string | null
    userId: string | null
    customer: string | null
    reason: string | null
    priority: string | null
    status: string | null
    resolutionNote: string | null
    resolvedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SupportCaseMaxAggregateOutputType = {
    id: string | null
    type: string | null
    orderId: string | null
    orderCode: string | null
    userId: string | null
    customer: string | null
    reason: string | null
    priority: string | null
    status: string | null
    resolutionNote: string | null
    resolvedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SupportCaseCountAggregateOutputType = {
    id: number
    type: number
    orderId: number
    orderCode: number
    userId: number
    customer: number
    reason: number
    priority: number
    status: number
    resolutionNote: number
    resolvedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SupportCaseMinAggregateInputType = {
    id?: true
    type?: true
    orderId?: true
    orderCode?: true
    userId?: true
    customer?: true
    reason?: true
    priority?: true
    status?: true
    resolutionNote?: true
    resolvedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SupportCaseMaxAggregateInputType = {
    id?: true
    type?: true
    orderId?: true
    orderCode?: true
    userId?: true
    customer?: true
    reason?: true
    priority?: true
    status?: true
    resolutionNote?: true
    resolvedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SupportCaseCountAggregateInputType = {
    id?: true
    type?: true
    orderId?: true
    orderCode?: true
    userId?: true
    customer?: true
    reason?: true
    priority?: true
    status?: true
    resolutionNote?: true
    resolvedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SupportCaseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SupportCase to aggregate.
     */
    where?: SupportCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SupportCases to fetch.
     */
    orderBy?: SupportCaseOrderByWithRelationInput | SupportCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SupportCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SupportCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SupportCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SupportCases
    **/
    _count?: true | SupportCaseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SupportCaseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SupportCaseMaxAggregateInputType
  }

  export type GetSupportCaseAggregateType<T extends SupportCaseAggregateArgs> = {
        [P in keyof T & keyof AggregateSupportCase]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSupportCase[P]>
      : GetScalarType<T[P], AggregateSupportCase[P]>
  }




  export type SupportCaseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SupportCaseWhereInput
    orderBy?: SupportCaseOrderByWithAggregationInput | SupportCaseOrderByWithAggregationInput[]
    by: SupportCaseScalarFieldEnum[] | SupportCaseScalarFieldEnum
    having?: SupportCaseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SupportCaseCountAggregateInputType | true
    _min?: SupportCaseMinAggregateInputType
    _max?: SupportCaseMaxAggregateInputType
  }

  export type SupportCaseGroupByOutputType = {
    id: string
    type: string
    orderId: string
    orderCode: string
    userId: string
    customer: string
    reason: string
    priority: string
    status: string
    resolutionNote: string | null
    resolvedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: SupportCaseCountAggregateOutputType | null
    _min: SupportCaseMinAggregateOutputType | null
    _max: SupportCaseMaxAggregateOutputType | null
  }

  type GetSupportCaseGroupByPayload<T extends SupportCaseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SupportCaseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SupportCaseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SupportCaseGroupByOutputType[P]>
            : GetScalarType<T[P], SupportCaseGroupByOutputType[P]>
        }
      >
    >


  export type SupportCaseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    orderId?: boolean
    orderCode?: boolean
    userId?: boolean
    customer?: boolean
    reason?: boolean
    priority?: boolean
    status?: boolean
    resolutionNote?: boolean
    resolvedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["supportCase"]>

  export type SupportCaseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    orderId?: boolean
    orderCode?: boolean
    userId?: boolean
    customer?: boolean
    reason?: boolean
    priority?: boolean
    status?: boolean
    resolutionNote?: boolean
    resolvedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["supportCase"]>

  export type SupportCaseSelectScalar = {
    id?: boolean
    type?: boolean
    orderId?: boolean
    orderCode?: boolean
    userId?: boolean
    customer?: boolean
    reason?: boolean
    priority?: boolean
    status?: boolean
    resolutionNote?: boolean
    resolvedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $SupportCasePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SupportCase"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      type: string
      orderId: string
      orderCode: string
      userId: string
      customer: string
      reason: string
      priority: string
      status: string
      resolutionNote: string | null
      resolvedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["supportCase"]>
    composites: {}
  }

  type SupportCaseGetPayload<S extends boolean | null | undefined | SupportCaseDefaultArgs> = $Result.GetResult<Prisma.$SupportCasePayload, S>

  type SupportCaseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SupportCaseFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SupportCaseCountAggregateInputType | true
    }

  export interface SupportCaseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SupportCase'], meta: { name: 'SupportCase' } }
    /**
     * Find zero or one SupportCase that matches the filter.
     * @param {SupportCaseFindUniqueArgs} args - Arguments to find a SupportCase
     * @example
     * // Get one SupportCase
     * const supportCase = await prisma.supportCase.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SupportCaseFindUniqueArgs>(args: SelectSubset<T, SupportCaseFindUniqueArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SupportCase that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SupportCaseFindUniqueOrThrowArgs} args - Arguments to find a SupportCase
     * @example
     * // Get one SupportCase
     * const supportCase = await prisma.supportCase.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SupportCaseFindUniqueOrThrowArgs>(args: SelectSubset<T, SupportCaseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SupportCase that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseFindFirstArgs} args - Arguments to find a SupportCase
     * @example
     * // Get one SupportCase
     * const supportCase = await prisma.supportCase.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SupportCaseFindFirstArgs>(args?: SelectSubset<T, SupportCaseFindFirstArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SupportCase that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseFindFirstOrThrowArgs} args - Arguments to find a SupportCase
     * @example
     * // Get one SupportCase
     * const supportCase = await prisma.supportCase.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SupportCaseFindFirstOrThrowArgs>(args?: SelectSubset<T, SupportCaseFindFirstOrThrowArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SupportCases that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SupportCases
     * const supportCases = await prisma.supportCase.findMany()
     * 
     * // Get first 10 SupportCases
     * const supportCases = await prisma.supportCase.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const supportCaseWithIdOnly = await prisma.supportCase.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SupportCaseFindManyArgs>(args?: SelectSubset<T, SupportCaseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SupportCase.
     * @param {SupportCaseCreateArgs} args - Arguments to create a SupportCase.
     * @example
     * // Create one SupportCase
     * const SupportCase = await prisma.supportCase.create({
     *   data: {
     *     // ... data to create a SupportCase
     *   }
     * })
     * 
     */
    create<T extends SupportCaseCreateArgs>(args: SelectSubset<T, SupportCaseCreateArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SupportCases.
     * @param {SupportCaseCreateManyArgs} args - Arguments to create many SupportCases.
     * @example
     * // Create many SupportCases
     * const supportCase = await prisma.supportCase.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SupportCaseCreateManyArgs>(args?: SelectSubset<T, SupportCaseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SupportCases and returns the data saved in the database.
     * @param {SupportCaseCreateManyAndReturnArgs} args - Arguments to create many SupportCases.
     * @example
     * // Create many SupportCases
     * const supportCase = await prisma.supportCase.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SupportCases and only return the `id`
     * const supportCaseWithIdOnly = await prisma.supportCase.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SupportCaseCreateManyAndReturnArgs>(args?: SelectSubset<T, SupportCaseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SupportCase.
     * @param {SupportCaseDeleteArgs} args - Arguments to delete one SupportCase.
     * @example
     * // Delete one SupportCase
     * const SupportCase = await prisma.supportCase.delete({
     *   where: {
     *     // ... filter to delete one SupportCase
     *   }
     * })
     * 
     */
    delete<T extends SupportCaseDeleteArgs>(args: SelectSubset<T, SupportCaseDeleteArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SupportCase.
     * @param {SupportCaseUpdateArgs} args - Arguments to update one SupportCase.
     * @example
     * // Update one SupportCase
     * const supportCase = await prisma.supportCase.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SupportCaseUpdateArgs>(args: SelectSubset<T, SupportCaseUpdateArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SupportCases.
     * @param {SupportCaseDeleteManyArgs} args - Arguments to filter SupportCases to delete.
     * @example
     * // Delete a few SupportCases
     * const { count } = await prisma.supportCase.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SupportCaseDeleteManyArgs>(args?: SelectSubset<T, SupportCaseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SupportCases.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SupportCases
     * const supportCase = await prisma.supportCase.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SupportCaseUpdateManyArgs>(args: SelectSubset<T, SupportCaseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SupportCase.
     * @param {SupportCaseUpsertArgs} args - Arguments to update or create a SupportCase.
     * @example
     * // Update or create a SupportCase
     * const supportCase = await prisma.supportCase.upsert({
     *   create: {
     *     // ... data to create a SupportCase
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SupportCase we want to update
     *   }
     * })
     */
    upsert<T extends SupportCaseUpsertArgs>(args: SelectSubset<T, SupportCaseUpsertArgs<ExtArgs>>): Prisma__SupportCaseClient<$Result.GetResult<Prisma.$SupportCasePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SupportCases.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseCountArgs} args - Arguments to filter SupportCases to count.
     * @example
     * // Count the number of SupportCases
     * const count = await prisma.supportCase.count({
     *   where: {
     *     // ... the filter for the SupportCases we want to count
     *   }
     * })
    **/
    count<T extends SupportCaseCountArgs>(
      args?: Subset<T, SupportCaseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SupportCaseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SupportCase.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SupportCaseAggregateArgs>(args: Subset<T, SupportCaseAggregateArgs>): Prisma.PrismaPromise<GetSupportCaseAggregateType<T>>

    /**
     * Group by SupportCase.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SupportCaseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SupportCaseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SupportCaseGroupByArgs['orderBy'] }
        : { orderBy?: SupportCaseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SupportCaseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSupportCaseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SupportCase model
   */
  readonly fields: SupportCaseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SupportCase.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SupportCaseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SupportCase model
   */ 
  interface SupportCaseFieldRefs {
    readonly id: FieldRef<"SupportCase", 'String'>
    readonly type: FieldRef<"SupportCase", 'String'>
    readonly orderId: FieldRef<"SupportCase", 'String'>
    readonly orderCode: FieldRef<"SupportCase", 'String'>
    readonly userId: FieldRef<"SupportCase", 'String'>
    readonly customer: FieldRef<"SupportCase", 'String'>
    readonly reason: FieldRef<"SupportCase", 'String'>
    readonly priority: FieldRef<"SupportCase", 'String'>
    readonly status: FieldRef<"SupportCase", 'String'>
    readonly resolutionNote: FieldRef<"SupportCase", 'String'>
    readonly resolvedBy: FieldRef<"SupportCase", 'String'>
    readonly createdAt: FieldRef<"SupportCase", 'DateTime'>
    readonly updatedAt: FieldRef<"SupportCase", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SupportCase findUnique
   */
  export type SupportCaseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter, which SupportCase to fetch.
     */
    where: SupportCaseWhereUniqueInput
  }

  /**
   * SupportCase findUniqueOrThrow
   */
  export type SupportCaseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter, which SupportCase to fetch.
     */
    where: SupportCaseWhereUniqueInput
  }

  /**
   * SupportCase findFirst
   */
  export type SupportCaseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter, which SupportCase to fetch.
     */
    where?: SupportCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SupportCases to fetch.
     */
    orderBy?: SupportCaseOrderByWithRelationInput | SupportCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SupportCases.
     */
    cursor?: SupportCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SupportCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SupportCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SupportCases.
     */
    distinct?: SupportCaseScalarFieldEnum | SupportCaseScalarFieldEnum[]
  }

  /**
   * SupportCase findFirstOrThrow
   */
  export type SupportCaseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter, which SupportCase to fetch.
     */
    where?: SupportCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SupportCases to fetch.
     */
    orderBy?: SupportCaseOrderByWithRelationInput | SupportCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SupportCases.
     */
    cursor?: SupportCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SupportCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SupportCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SupportCases.
     */
    distinct?: SupportCaseScalarFieldEnum | SupportCaseScalarFieldEnum[]
  }

  /**
   * SupportCase findMany
   */
  export type SupportCaseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter, which SupportCases to fetch.
     */
    where?: SupportCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SupportCases to fetch.
     */
    orderBy?: SupportCaseOrderByWithRelationInput | SupportCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SupportCases.
     */
    cursor?: SupportCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SupportCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SupportCases.
     */
    skip?: number
    distinct?: SupportCaseScalarFieldEnum | SupportCaseScalarFieldEnum[]
  }

  /**
   * SupportCase create
   */
  export type SupportCaseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * The data needed to create a SupportCase.
     */
    data: XOR<SupportCaseCreateInput, SupportCaseUncheckedCreateInput>
  }

  /**
   * SupportCase createMany
   */
  export type SupportCaseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SupportCases.
     */
    data: SupportCaseCreateManyInput | SupportCaseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SupportCase createManyAndReturn
   */
  export type SupportCaseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SupportCases.
     */
    data: SupportCaseCreateManyInput | SupportCaseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SupportCase update
   */
  export type SupportCaseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * The data needed to update a SupportCase.
     */
    data: XOR<SupportCaseUpdateInput, SupportCaseUncheckedUpdateInput>
    /**
     * Choose, which SupportCase to update.
     */
    where: SupportCaseWhereUniqueInput
  }

  /**
   * SupportCase updateMany
   */
  export type SupportCaseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SupportCases.
     */
    data: XOR<SupportCaseUpdateManyMutationInput, SupportCaseUncheckedUpdateManyInput>
    /**
     * Filter which SupportCases to update
     */
    where?: SupportCaseWhereInput
  }

  /**
   * SupportCase upsert
   */
  export type SupportCaseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * The filter to search for the SupportCase to update in case it exists.
     */
    where: SupportCaseWhereUniqueInput
    /**
     * In case the SupportCase found by the `where` argument doesn't exist, create a new SupportCase with this data.
     */
    create: XOR<SupportCaseCreateInput, SupportCaseUncheckedCreateInput>
    /**
     * In case the SupportCase was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SupportCaseUpdateInput, SupportCaseUncheckedUpdateInput>
  }

  /**
   * SupportCase delete
   */
  export type SupportCaseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
    /**
     * Filter which SupportCase to delete.
     */
    where: SupportCaseWhereUniqueInput
  }

  /**
   * SupportCase deleteMany
   */
  export type SupportCaseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SupportCases to delete
     */
    where?: SupportCaseWhereInput
  }

  /**
   * SupportCase without action
   */
  export type SupportCaseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SupportCase
     */
    select?: SupportCaseSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const WarehouseScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    address: 'address',
    city: 'city',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WarehouseScalarFieldEnum = (typeof WarehouseScalarFieldEnum)[keyof typeof WarehouseScalarFieldEnum]


  export const SkuInventoryScalarFieldEnum: {
    id: 'id',
    warehouseId: 'warehouseId',
    productId: 'productId',
    skuCode: 'skuCode',
    totalQuantity: 'totalQuantity',
    availableQuantity: 'availableQuantity',
    reservedQuantity: 'reservedQuantity',
    unavailableQuantity: 'unavailableQuantity',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SkuInventoryScalarFieldEnum = (typeof SkuInventoryScalarFieldEnum)[keyof typeof SkuInventoryScalarFieldEnum]


  export const InventoryLedgerScalarFieldEnum: {
    id: 'id',
    inventoryId: 'inventoryId',
    transactionType: 'transactionType',
    quantityDelta: 'quantityDelta',
    referenceId: 'referenceId',
    reason: 'reason',
    createdAt: 'createdAt'
  };

  export type InventoryLedgerScalarFieldEnum = (typeof InventoryLedgerScalarFieldEnum)[keyof typeof InventoryLedgerScalarFieldEnum]


  export const ShipmentScalarFieldEnum: {
    id: 'id',
    orderId: 'orderId',
    warehouseId: 'warehouseId',
    carrierCode: 'carrierCode',
    trackingCode: 'trackingCode',
    shippingFee: 'shippingFee',
    status: 'status',
    receiverName: 'receiverName',
    receiverPhone: 'receiverPhone',
    shippingAddress: 'shippingAddress',
    shippedAt: 'shippedAt',
    deliveredAt: 'deliveredAt',
    city: 'city',
    currentLocation: 'currentLocation',
    estimatedDeliveryDate: 'estimatedDeliveryDate',
    actualDeliveryDate: 'actualDeliveryDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ShipmentScalarFieldEnum = (typeof ShipmentScalarFieldEnum)[keyof typeof ShipmentScalarFieldEnum]


  export const CarrierScalarFieldEnum: {
    id: 'id',
    carrierCode: 'carrierCode',
    carrierName: 'carrierName',
    isActive: 'isActive',
    apiEndpoint: 'apiEndpoint',
    createdAt: 'createdAt'
  };

  export type CarrierScalarFieldEnum = (typeof CarrierScalarFieldEnum)[keyof typeof CarrierScalarFieldEnum]


  export const SupportCaseScalarFieldEnum: {
    id: 'id',
    type: 'type',
    orderId: 'orderId',
    orderCode: 'orderCode',
    userId: 'userId',
    customer: 'customer',
    reason: 'reason',
    priority: 'priority',
    status: 'status',
    resolutionNote: 'resolutionNote',
    resolvedBy: 'resolvedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SupportCaseScalarFieldEnum = (typeof SupportCaseScalarFieldEnum)[keyof typeof SupportCaseScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type WarehouseWhereInput = {
    AND?: WarehouseWhereInput | WarehouseWhereInput[]
    OR?: WarehouseWhereInput[]
    NOT?: WarehouseWhereInput | WarehouseWhereInput[]
    id?: BigIntFilter<"Warehouse"> | bigint | number
    code?: StringFilter<"Warehouse"> | string
    name?: StringFilter<"Warehouse"> | string
    address?: StringFilter<"Warehouse"> | string
    city?: StringFilter<"Warehouse"> | string
    isActive?: BoolFilter<"Warehouse"> | boolean
    createdAt?: DateTimeFilter<"Warehouse"> | Date | string
    updatedAt?: DateTimeFilter<"Warehouse"> | Date | string
    inventories?: SkuInventoryListRelationFilter
    shipments?: ShipmentListRelationFilter
  }

  export type WarehouseOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    address?: SortOrder
    city?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    inventories?: SkuInventoryOrderByRelationAggregateInput
    shipments?: ShipmentOrderByRelationAggregateInput
  }

  export type WarehouseWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    code?: string
    AND?: WarehouseWhereInput | WarehouseWhereInput[]
    OR?: WarehouseWhereInput[]
    NOT?: WarehouseWhereInput | WarehouseWhereInput[]
    name?: StringFilter<"Warehouse"> | string
    address?: StringFilter<"Warehouse"> | string
    city?: StringFilter<"Warehouse"> | string
    isActive?: BoolFilter<"Warehouse"> | boolean
    createdAt?: DateTimeFilter<"Warehouse"> | Date | string
    updatedAt?: DateTimeFilter<"Warehouse"> | Date | string
    inventories?: SkuInventoryListRelationFilter
    shipments?: ShipmentListRelationFilter
  }, "id" | "code">

  export type WarehouseOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    address?: SortOrder
    city?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WarehouseCountOrderByAggregateInput
    _avg?: WarehouseAvgOrderByAggregateInput
    _max?: WarehouseMaxOrderByAggregateInput
    _min?: WarehouseMinOrderByAggregateInput
    _sum?: WarehouseSumOrderByAggregateInput
  }

  export type WarehouseScalarWhereWithAggregatesInput = {
    AND?: WarehouseScalarWhereWithAggregatesInput | WarehouseScalarWhereWithAggregatesInput[]
    OR?: WarehouseScalarWhereWithAggregatesInput[]
    NOT?: WarehouseScalarWhereWithAggregatesInput | WarehouseScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"Warehouse"> | bigint | number
    code?: StringWithAggregatesFilter<"Warehouse"> | string
    name?: StringWithAggregatesFilter<"Warehouse"> | string
    address?: StringWithAggregatesFilter<"Warehouse"> | string
    city?: StringWithAggregatesFilter<"Warehouse"> | string
    isActive?: BoolWithAggregatesFilter<"Warehouse"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Warehouse"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Warehouse"> | Date | string
  }

  export type SkuInventoryWhereInput = {
    AND?: SkuInventoryWhereInput | SkuInventoryWhereInput[]
    OR?: SkuInventoryWhereInput[]
    NOT?: SkuInventoryWhereInput | SkuInventoryWhereInput[]
    id?: BigIntFilter<"SkuInventory"> | bigint | number
    warehouseId?: BigIntFilter<"SkuInventory"> | bigint | number
    productId?: BigIntFilter<"SkuInventory"> | bigint | number
    skuCode?: StringFilter<"SkuInventory"> | string
    totalQuantity?: IntFilter<"SkuInventory"> | number
    availableQuantity?: IntFilter<"SkuInventory"> | number
    reservedQuantity?: IntFilter<"SkuInventory"> | number
    unavailableQuantity?: IntFilter<"SkuInventory"> | number
    createdAt?: DateTimeFilter<"SkuInventory"> | Date | string
    updatedAt?: DateTimeFilter<"SkuInventory"> | Date | string
    warehouse?: XOR<WarehouseRelationFilter, WarehouseWhereInput>
    ledgers?: InventoryLedgerListRelationFilter
  }

  export type SkuInventoryOrderByWithRelationInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    skuCode?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    warehouse?: WarehouseOrderByWithRelationInput
    ledgers?: InventoryLedgerOrderByRelationAggregateInput
  }

  export type SkuInventoryWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    skuCode?: string
    AND?: SkuInventoryWhereInput | SkuInventoryWhereInput[]
    OR?: SkuInventoryWhereInput[]
    NOT?: SkuInventoryWhereInput | SkuInventoryWhereInput[]
    warehouseId?: BigIntFilter<"SkuInventory"> | bigint | number
    productId?: BigIntFilter<"SkuInventory"> | bigint | number
    totalQuantity?: IntFilter<"SkuInventory"> | number
    availableQuantity?: IntFilter<"SkuInventory"> | number
    reservedQuantity?: IntFilter<"SkuInventory"> | number
    unavailableQuantity?: IntFilter<"SkuInventory"> | number
    createdAt?: DateTimeFilter<"SkuInventory"> | Date | string
    updatedAt?: DateTimeFilter<"SkuInventory"> | Date | string
    warehouse?: XOR<WarehouseRelationFilter, WarehouseWhereInput>
    ledgers?: InventoryLedgerListRelationFilter
  }, "id" | "skuCode">

  export type SkuInventoryOrderByWithAggregationInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    skuCode?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SkuInventoryCountOrderByAggregateInput
    _avg?: SkuInventoryAvgOrderByAggregateInput
    _max?: SkuInventoryMaxOrderByAggregateInput
    _min?: SkuInventoryMinOrderByAggregateInput
    _sum?: SkuInventorySumOrderByAggregateInput
  }

  export type SkuInventoryScalarWhereWithAggregatesInput = {
    AND?: SkuInventoryScalarWhereWithAggregatesInput | SkuInventoryScalarWhereWithAggregatesInput[]
    OR?: SkuInventoryScalarWhereWithAggregatesInput[]
    NOT?: SkuInventoryScalarWhereWithAggregatesInput | SkuInventoryScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"SkuInventory"> | bigint | number
    warehouseId?: BigIntWithAggregatesFilter<"SkuInventory"> | bigint | number
    productId?: BigIntWithAggregatesFilter<"SkuInventory"> | bigint | number
    skuCode?: StringWithAggregatesFilter<"SkuInventory"> | string
    totalQuantity?: IntWithAggregatesFilter<"SkuInventory"> | number
    availableQuantity?: IntWithAggregatesFilter<"SkuInventory"> | number
    reservedQuantity?: IntWithAggregatesFilter<"SkuInventory"> | number
    unavailableQuantity?: IntWithAggregatesFilter<"SkuInventory"> | number
    createdAt?: DateTimeWithAggregatesFilter<"SkuInventory"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SkuInventory"> | Date | string
  }

  export type InventoryLedgerWhereInput = {
    AND?: InventoryLedgerWhereInput | InventoryLedgerWhereInput[]
    OR?: InventoryLedgerWhereInput[]
    NOT?: InventoryLedgerWhereInput | InventoryLedgerWhereInput[]
    id?: BigIntFilter<"InventoryLedger"> | bigint | number
    inventoryId?: BigIntFilter<"InventoryLedger"> | bigint | number
    transactionType?: StringFilter<"InventoryLedger"> | string
    quantityDelta?: IntFilter<"InventoryLedger"> | number
    referenceId?: StringNullableFilter<"InventoryLedger"> | string | null
    reason?: StringNullableFilter<"InventoryLedger"> | string | null
    createdAt?: DateTimeFilter<"InventoryLedger"> | Date | string
    inventory?: XOR<SkuInventoryRelationFilter, SkuInventoryWhereInput>
  }

  export type InventoryLedgerOrderByWithRelationInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    transactionType?: SortOrder
    quantityDelta?: SortOrder
    referenceId?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    inventory?: SkuInventoryOrderByWithRelationInput
  }

  export type InventoryLedgerWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: InventoryLedgerWhereInput | InventoryLedgerWhereInput[]
    OR?: InventoryLedgerWhereInput[]
    NOT?: InventoryLedgerWhereInput | InventoryLedgerWhereInput[]
    inventoryId?: BigIntFilter<"InventoryLedger"> | bigint | number
    transactionType?: StringFilter<"InventoryLedger"> | string
    quantityDelta?: IntFilter<"InventoryLedger"> | number
    referenceId?: StringNullableFilter<"InventoryLedger"> | string | null
    reason?: StringNullableFilter<"InventoryLedger"> | string | null
    createdAt?: DateTimeFilter<"InventoryLedger"> | Date | string
    inventory?: XOR<SkuInventoryRelationFilter, SkuInventoryWhereInput>
  }, "id">

  export type InventoryLedgerOrderByWithAggregationInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    transactionType?: SortOrder
    quantityDelta?: SortOrder
    referenceId?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: InventoryLedgerCountOrderByAggregateInput
    _avg?: InventoryLedgerAvgOrderByAggregateInput
    _max?: InventoryLedgerMaxOrderByAggregateInput
    _min?: InventoryLedgerMinOrderByAggregateInput
    _sum?: InventoryLedgerSumOrderByAggregateInput
  }

  export type InventoryLedgerScalarWhereWithAggregatesInput = {
    AND?: InventoryLedgerScalarWhereWithAggregatesInput | InventoryLedgerScalarWhereWithAggregatesInput[]
    OR?: InventoryLedgerScalarWhereWithAggregatesInput[]
    NOT?: InventoryLedgerScalarWhereWithAggregatesInput | InventoryLedgerScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"InventoryLedger"> | bigint | number
    inventoryId?: BigIntWithAggregatesFilter<"InventoryLedger"> | bigint | number
    transactionType?: StringWithAggregatesFilter<"InventoryLedger"> | string
    quantityDelta?: IntWithAggregatesFilter<"InventoryLedger"> | number
    referenceId?: StringNullableWithAggregatesFilter<"InventoryLedger"> | string | null
    reason?: StringNullableWithAggregatesFilter<"InventoryLedger"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"InventoryLedger"> | Date | string
  }

  export type ShipmentWhereInput = {
    AND?: ShipmentWhereInput | ShipmentWhereInput[]
    OR?: ShipmentWhereInput[]
    NOT?: ShipmentWhereInput | ShipmentWhereInput[]
    id?: StringFilter<"Shipment"> | string
    orderId?: StringFilter<"Shipment"> | string
    warehouseId?: BigIntNullableFilter<"Shipment"> | bigint | number | null
    carrierCode?: StringFilter<"Shipment"> | string
    trackingCode?: StringNullableFilter<"Shipment"> | string | null
    shippingFee?: DecimalFilter<"Shipment"> | Decimal | DecimalJsLike | number | string
    status?: StringFilter<"Shipment"> | string
    receiverName?: StringNullableFilter<"Shipment"> | string | null
    receiverPhone?: StringNullableFilter<"Shipment"> | string | null
    shippingAddress?: StringFilter<"Shipment"> | string
    shippedAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    deliveredAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    city?: StringNullableFilter<"Shipment"> | string | null
    currentLocation?: StringNullableFilter<"Shipment"> | string | null
    estimatedDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    actualDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    createdAt?: DateTimeFilter<"Shipment"> | Date | string
    updatedAt?: DateTimeFilter<"Shipment"> | Date | string
    warehouse?: XOR<WarehouseNullableRelationFilter, WarehouseWhereInput> | null
  }

  export type ShipmentOrderByWithRelationInput = {
    id?: SortOrder
    orderId?: SortOrder
    warehouseId?: SortOrderInput | SortOrder
    carrierCode?: SortOrder
    trackingCode?: SortOrderInput | SortOrder
    shippingFee?: SortOrder
    status?: SortOrder
    receiverName?: SortOrderInput | SortOrder
    receiverPhone?: SortOrderInput | SortOrder
    shippingAddress?: SortOrder
    shippedAt?: SortOrderInput | SortOrder
    deliveredAt?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    currentLocation?: SortOrderInput | SortOrder
    estimatedDeliveryDate?: SortOrderInput | SortOrder
    actualDeliveryDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    warehouse?: WarehouseOrderByWithRelationInput
  }

  export type ShipmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ShipmentWhereInput | ShipmentWhereInput[]
    OR?: ShipmentWhereInput[]
    NOT?: ShipmentWhereInput | ShipmentWhereInput[]
    orderId?: StringFilter<"Shipment"> | string
    warehouseId?: BigIntNullableFilter<"Shipment"> | bigint | number | null
    carrierCode?: StringFilter<"Shipment"> | string
    trackingCode?: StringNullableFilter<"Shipment"> | string | null
    shippingFee?: DecimalFilter<"Shipment"> | Decimal | DecimalJsLike | number | string
    status?: StringFilter<"Shipment"> | string
    receiverName?: StringNullableFilter<"Shipment"> | string | null
    receiverPhone?: StringNullableFilter<"Shipment"> | string | null
    shippingAddress?: StringFilter<"Shipment"> | string
    shippedAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    deliveredAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    city?: StringNullableFilter<"Shipment"> | string | null
    currentLocation?: StringNullableFilter<"Shipment"> | string | null
    estimatedDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    actualDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    createdAt?: DateTimeFilter<"Shipment"> | Date | string
    updatedAt?: DateTimeFilter<"Shipment"> | Date | string
    warehouse?: XOR<WarehouseNullableRelationFilter, WarehouseWhereInput> | null
  }, "id">

  export type ShipmentOrderByWithAggregationInput = {
    id?: SortOrder
    orderId?: SortOrder
    warehouseId?: SortOrderInput | SortOrder
    carrierCode?: SortOrder
    trackingCode?: SortOrderInput | SortOrder
    shippingFee?: SortOrder
    status?: SortOrder
    receiverName?: SortOrderInput | SortOrder
    receiverPhone?: SortOrderInput | SortOrder
    shippingAddress?: SortOrder
    shippedAt?: SortOrderInput | SortOrder
    deliveredAt?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    currentLocation?: SortOrderInput | SortOrder
    estimatedDeliveryDate?: SortOrderInput | SortOrder
    actualDeliveryDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ShipmentCountOrderByAggregateInput
    _avg?: ShipmentAvgOrderByAggregateInput
    _max?: ShipmentMaxOrderByAggregateInput
    _min?: ShipmentMinOrderByAggregateInput
    _sum?: ShipmentSumOrderByAggregateInput
  }

  export type ShipmentScalarWhereWithAggregatesInput = {
    AND?: ShipmentScalarWhereWithAggregatesInput | ShipmentScalarWhereWithAggregatesInput[]
    OR?: ShipmentScalarWhereWithAggregatesInput[]
    NOT?: ShipmentScalarWhereWithAggregatesInput | ShipmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Shipment"> | string
    orderId?: StringWithAggregatesFilter<"Shipment"> | string
    warehouseId?: BigIntNullableWithAggregatesFilter<"Shipment"> | bigint | number | null
    carrierCode?: StringWithAggregatesFilter<"Shipment"> | string
    trackingCode?: StringNullableWithAggregatesFilter<"Shipment"> | string | null
    shippingFee?: DecimalWithAggregatesFilter<"Shipment"> | Decimal | DecimalJsLike | number | string
    status?: StringWithAggregatesFilter<"Shipment"> | string
    receiverName?: StringNullableWithAggregatesFilter<"Shipment"> | string | null
    receiverPhone?: StringNullableWithAggregatesFilter<"Shipment"> | string | null
    shippingAddress?: StringWithAggregatesFilter<"Shipment"> | string
    shippedAt?: DateTimeNullableWithAggregatesFilter<"Shipment"> | Date | string | null
    deliveredAt?: DateTimeNullableWithAggregatesFilter<"Shipment"> | Date | string | null
    city?: StringNullableWithAggregatesFilter<"Shipment"> | string | null
    currentLocation?: StringNullableWithAggregatesFilter<"Shipment"> | string | null
    estimatedDeliveryDate?: DateTimeNullableWithAggregatesFilter<"Shipment"> | Date | string | null
    actualDeliveryDate?: DateTimeNullableWithAggregatesFilter<"Shipment"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Shipment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Shipment"> | Date | string
  }

  export type CarrierWhereInput = {
    AND?: CarrierWhereInput | CarrierWhereInput[]
    OR?: CarrierWhereInput[]
    NOT?: CarrierWhereInput | CarrierWhereInput[]
    id?: BigIntFilter<"Carrier"> | bigint | number
    carrierCode?: StringFilter<"Carrier"> | string
    carrierName?: StringFilter<"Carrier"> | string
    isActive?: BoolFilter<"Carrier"> | boolean
    apiEndpoint?: StringNullableFilter<"Carrier"> | string | null
    createdAt?: DateTimeFilter<"Carrier"> | Date | string
  }

  export type CarrierOrderByWithRelationInput = {
    id?: SortOrder
    carrierCode?: SortOrder
    carrierName?: SortOrder
    isActive?: SortOrder
    apiEndpoint?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type CarrierWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    carrierCode?: string
    AND?: CarrierWhereInput | CarrierWhereInput[]
    OR?: CarrierWhereInput[]
    NOT?: CarrierWhereInput | CarrierWhereInput[]
    carrierName?: StringFilter<"Carrier"> | string
    isActive?: BoolFilter<"Carrier"> | boolean
    apiEndpoint?: StringNullableFilter<"Carrier"> | string | null
    createdAt?: DateTimeFilter<"Carrier"> | Date | string
  }, "id" | "carrierCode">

  export type CarrierOrderByWithAggregationInput = {
    id?: SortOrder
    carrierCode?: SortOrder
    carrierName?: SortOrder
    isActive?: SortOrder
    apiEndpoint?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: CarrierCountOrderByAggregateInput
    _avg?: CarrierAvgOrderByAggregateInput
    _max?: CarrierMaxOrderByAggregateInput
    _min?: CarrierMinOrderByAggregateInput
    _sum?: CarrierSumOrderByAggregateInput
  }

  export type CarrierScalarWhereWithAggregatesInput = {
    AND?: CarrierScalarWhereWithAggregatesInput | CarrierScalarWhereWithAggregatesInput[]
    OR?: CarrierScalarWhereWithAggregatesInput[]
    NOT?: CarrierScalarWhereWithAggregatesInput | CarrierScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"Carrier"> | bigint | number
    carrierCode?: StringWithAggregatesFilter<"Carrier"> | string
    carrierName?: StringWithAggregatesFilter<"Carrier"> | string
    isActive?: BoolWithAggregatesFilter<"Carrier"> | boolean
    apiEndpoint?: StringNullableWithAggregatesFilter<"Carrier"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Carrier"> | Date | string
  }

  export type SupportCaseWhereInput = {
    AND?: SupportCaseWhereInput | SupportCaseWhereInput[]
    OR?: SupportCaseWhereInput[]
    NOT?: SupportCaseWhereInput | SupportCaseWhereInput[]
    id?: StringFilter<"SupportCase"> | string
    type?: StringFilter<"SupportCase"> | string
    orderId?: StringFilter<"SupportCase"> | string
    orderCode?: StringFilter<"SupportCase"> | string
    userId?: StringFilter<"SupportCase"> | string
    customer?: StringFilter<"SupportCase"> | string
    reason?: StringFilter<"SupportCase"> | string
    priority?: StringFilter<"SupportCase"> | string
    status?: StringFilter<"SupportCase"> | string
    resolutionNote?: StringNullableFilter<"SupportCase"> | string | null
    resolvedBy?: StringNullableFilter<"SupportCase"> | string | null
    createdAt?: DateTimeFilter<"SupportCase"> | Date | string
    updatedAt?: DateTimeFilter<"SupportCase"> | Date | string
  }

  export type SupportCaseOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    orderId?: SortOrder
    orderCode?: SortOrder
    userId?: SortOrder
    customer?: SortOrder
    reason?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    resolutionNote?: SortOrderInput | SortOrder
    resolvedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SupportCaseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SupportCaseWhereInput | SupportCaseWhereInput[]
    OR?: SupportCaseWhereInput[]
    NOT?: SupportCaseWhereInput | SupportCaseWhereInput[]
    type?: StringFilter<"SupportCase"> | string
    orderId?: StringFilter<"SupportCase"> | string
    orderCode?: StringFilter<"SupportCase"> | string
    userId?: StringFilter<"SupportCase"> | string
    customer?: StringFilter<"SupportCase"> | string
    reason?: StringFilter<"SupportCase"> | string
    priority?: StringFilter<"SupportCase"> | string
    status?: StringFilter<"SupportCase"> | string
    resolutionNote?: StringNullableFilter<"SupportCase"> | string | null
    resolvedBy?: StringNullableFilter<"SupportCase"> | string | null
    createdAt?: DateTimeFilter<"SupportCase"> | Date | string
    updatedAt?: DateTimeFilter<"SupportCase"> | Date | string
  }, "id">

  export type SupportCaseOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    orderId?: SortOrder
    orderCode?: SortOrder
    userId?: SortOrder
    customer?: SortOrder
    reason?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    resolutionNote?: SortOrderInput | SortOrder
    resolvedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SupportCaseCountOrderByAggregateInput
    _max?: SupportCaseMaxOrderByAggregateInput
    _min?: SupportCaseMinOrderByAggregateInput
  }

  export type SupportCaseScalarWhereWithAggregatesInput = {
    AND?: SupportCaseScalarWhereWithAggregatesInput | SupportCaseScalarWhereWithAggregatesInput[]
    OR?: SupportCaseScalarWhereWithAggregatesInput[]
    NOT?: SupportCaseScalarWhereWithAggregatesInput | SupportCaseScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SupportCase"> | string
    type?: StringWithAggregatesFilter<"SupportCase"> | string
    orderId?: StringWithAggregatesFilter<"SupportCase"> | string
    orderCode?: StringWithAggregatesFilter<"SupportCase"> | string
    userId?: StringWithAggregatesFilter<"SupportCase"> | string
    customer?: StringWithAggregatesFilter<"SupportCase"> | string
    reason?: StringWithAggregatesFilter<"SupportCase"> | string
    priority?: StringWithAggregatesFilter<"SupportCase"> | string
    status?: StringWithAggregatesFilter<"SupportCase"> | string
    resolutionNote?: StringNullableWithAggregatesFilter<"SupportCase"> | string | null
    resolvedBy?: StringNullableWithAggregatesFilter<"SupportCase"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"SupportCase"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SupportCase"> | Date | string
  }

  export type WarehouseCreateInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inventories?: SkuInventoryCreateNestedManyWithoutWarehouseInput
    shipments?: ShipmentCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseUncheckedCreateInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inventories?: SkuInventoryUncheckedCreateNestedManyWithoutWarehouseInput
    shipments?: ShipmentUncheckedCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inventories?: SkuInventoryUpdateManyWithoutWarehouseNestedInput
    shipments?: ShipmentUpdateManyWithoutWarehouseNestedInput
  }

  export type WarehouseUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inventories?: SkuInventoryUncheckedUpdateManyWithoutWarehouseNestedInput
    shipments?: ShipmentUncheckedUpdateManyWithoutWarehouseNestedInput
  }

  export type WarehouseCreateManyInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WarehouseUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WarehouseUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkuInventoryCreateInput = {
    id?: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    warehouse: WarehouseCreateNestedOneWithoutInventoriesInput
    ledgers?: InventoryLedgerCreateNestedManyWithoutInventoryInput
  }

  export type SkuInventoryUncheckedCreateInput = {
    id?: bigint | number
    warehouseId: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    ledgers?: InventoryLedgerUncheckedCreateNestedManyWithoutInventoryInput
  }

  export type SkuInventoryUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    warehouse?: WarehouseUpdateOneRequiredWithoutInventoriesNestedInput
    ledgers?: InventoryLedgerUpdateManyWithoutInventoryNestedInput
  }

  export type SkuInventoryUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    warehouseId?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ledgers?: InventoryLedgerUncheckedUpdateManyWithoutInventoryNestedInput
  }

  export type SkuInventoryCreateManyInput = {
    id?: bigint | number
    warehouseId: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SkuInventoryUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkuInventoryUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    warehouseId?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerCreateInput = {
    id?: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
    inventory: SkuInventoryCreateNestedOneWithoutLedgersInput
  }

  export type InventoryLedgerUncheckedCreateInput = {
    id?: bigint | number
    inventoryId: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
  }

  export type InventoryLedgerUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inventory?: SkuInventoryUpdateOneRequiredWithoutLedgersNestedInput
  }

  export type InventoryLedgerUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    inventoryId?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerCreateManyInput = {
    id?: bigint | number
    inventoryId: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
  }

  export type InventoryLedgerUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    inventoryId?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentCreateInput = {
    id: string
    orderId: string
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    warehouse?: WarehouseCreateNestedOneWithoutShipmentsInput
  }

  export type ShipmentUncheckedCreateInput = {
    id: string
    orderId: string
    warehouseId?: bigint | number | null
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShipmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    warehouse?: WarehouseUpdateOneWithoutShipmentsNestedInput
  }

  export type ShipmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    warehouseId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentCreateManyInput = {
    id: string
    orderId: string
    warehouseId?: bigint | number | null
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShipmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    warehouseId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CarrierCreateInput = {
    id?: bigint | number
    carrierCode: string
    carrierName: string
    isActive?: boolean
    apiEndpoint?: string | null
    createdAt?: Date | string
  }

  export type CarrierUncheckedCreateInput = {
    id?: bigint | number
    carrierCode: string
    carrierName: string
    isActive?: boolean
    apiEndpoint?: string | null
    createdAt?: Date | string
  }

  export type CarrierUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    carrierCode?: StringFieldUpdateOperationsInput | string
    carrierName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    apiEndpoint?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CarrierUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    carrierCode?: StringFieldUpdateOperationsInput | string
    carrierName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    apiEndpoint?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CarrierCreateManyInput = {
    id?: bigint | number
    carrierCode: string
    carrierName: string
    isActive?: boolean
    apiEndpoint?: string | null
    createdAt?: Date | string
  }

  export type CarrierUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    carrierCode?: StringFieldUpdateOperationsInput | string
    carrierName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    apiEndpoint?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CarrierUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    carrierCode?: StringFieldUpdateOperationsInput | string
    carrierName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    apiEndpoint?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SupportCaseCreateInput = {
    id: string
    type: string
    orderId: string
    orderCode: string
    userId: string
    customer: string
    reason: string
    priority?: string
    status?: string
    resolutionNote?: string | null
    resolvedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SupportCaseUncheckedCreateInput = {
    id: string
    type: string
    orderId: string
    orderCode: string
    userId: string
    customer: string
    reason: string
    priority?: string
    status?: string
    resolutionNote?: string | null
    resolvedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SupportCaseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    orderCode?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    customer?: StringFieldUpdateOperationsInput | string
    reason?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    resolutionNote?: NullableStringFieldUpdateOperationsInput | string | null
    resolvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SupportCaseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    orderCode?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    customer?: StringFieldUpdateOperationsInput | string
    reason?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    resolutionNote?: NullableStringFieldUpdateOperationsInput | string | null
    resolvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SupportCaseCreateManyInput = {
    id: string
    type: string
    orderId: string
    orderCode: string
    userId: string
    customer: string
    reason: string
    priority?: string
    status?: string
    resolutionNote?: string | null
    resolvedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SupportCaseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    orderCode?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    customer?: StringFieldUpdateOperationsInput | string
    reason?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    resolutionNote?: NullableStringFieldUpdateOperationsInput | string | null
    resolvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SupportCaseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    orderCode?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    customer?: StringFieldUpdateOperationsInput | string
    reason?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    resolutionNote?: NullableStringFieldUpdateOperationsInput | string | null
    resolvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SkuInventoryListRelationFilter = {
    every?: SkuInventoryWhereInput
    some?: SkuInventoryWhereInput
    none?: SkuInventoryWhereInput
  }

  export type ShipmentListRelationFilter = {
    every?: ShipmentWhereInput
    some?: ShipmentWhereInput
    none?: ShipmentWhereInput
  }

  export type SkuInventoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ShipmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type WarehouseCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    address?: SortOrder
    city?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WarehouseAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type WarehouseMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    address?: SortOrder
    city?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WarehouseMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    address?: SortOrder
    city?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WarehouseSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type WarehouseRelationFilter = {
    is?: WarehouseWhereInput
    isNot?: WarehouseWhereInput
  }

  export type InventoryLedgerListRelationFilter = {
    every?: InventoryLedgerWhereInput
    some?: InventoryLedgerWhereInput
    none?: InventoryLedgerWhereInput
  }

  export type InventoryLedgerOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SkuInventoryCountOrderByAggregateInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    skuCode?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SkuInventoryAvgOrderByAggregateInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
  }

  export type SkuInventoryMaxOrderByAggregateInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    skuCode?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SkuInventoryMinOrderByAggregateInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    skuCode?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SkuInventorySumOrderByAggregateInput = {
    id?: SortOrder
    warehouseId?: SortOrder
    productId?: SortOrder
    totalQuantity?: SortOrder
    availableQuantity?: SortOrder
    reservedQuantity?: SortOrder
    unavailableQuantity?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type SkuInventoryRelationFilter = {
    is?: SkuInventoryWhereInput
    isNot?: SkuInventoryWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type InventoryLedgerCountOrderByAggregateInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    transactionType?: SortOrder
    quantityDelta?: SortOrder
    referenceId?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type InventoryLedgerAvgOrderByAggregateInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    quantityDelta?: SortOrder
  }

  export type InventoryLedgerMaxOrderByAggregateInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    transactionType?: SortOrder
    quantityDelta?: SortOrder
    referenceId?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type InventoryLedgerMinOrderByAggregateInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    transactionType?: SortOrder
    quantityDelta?: SortOrder
    referenceId?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type InventoryLedgerSumOrderByAggregateInput = {
    id?: SortOrder
    inventoryId?: SortOrder
    quantityDelta?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type WarehouseNullableRelationFilter = {
    is?: WarehouseWhereInput | null
    isNot?: WarehouseWhereInput | null
  }

  export type ShipmentCountOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    warehouseId?: SortOrder
    carrierCode?: SortOrder
    trackingCode?: SortOrder
    shippingFee?: SortOrder
    status?: SortOrder
    receiverName?: SortOrder
    receiverPhone?: SortOrder
    shippingAddress?: SortOrder
    shippedAt?: SortOrder
    deliveredAt?: SortOrder
    city?: SortOrder
    currentLocation?: SortOrder
    estimatedDeliveryDate?: SortOrder
    actualDeliveryDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShipmentAvgOrderByAggregateInput = {
    warehouseId?: SortOrder
    shippingFee?: SortOrder
  }

  export type ShipmentMaxOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    warehouseId?: SortOrder
    carrierCode?: SortOrder
    trackingCode?: SortOrder
    shippingFee?: SortOrder
    status?: SortOrder
    receiverName?: SortOrder
    receiverPhone?: SortOrder
    shippingAddress?: SortOrder
    shippedAt?: SortOrder
    deliveredAt?: SortOrder
    city?: SortOrder
    currentLocation?: SortOrder
    estimatedDeliveryDate?: SortOrder
    actualDeliveryDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShipmentMinOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    warehouseId?: SortOrder
    carrierCode?: SortOrder
    trackingCode?: SortOrder
    shippingFee?: SortOrder
    status?: SortOrder
    receiverName?: SortOrder
    receiverPhone?: SortOrder
    shippingAddress?: SortOrder
    shippedAt?: SortOrder
    deliveredAt?: SortOrder
    city?: SortOrder
    currentLocation?: SortOrder
    estimatedDeliveryDate?: SortOrder
    actualDeliveryDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShipmentSumOrderByAggregateInput = {
    warehouseId?: SortOrder
    shippingFee?: SortOrder
  }

  export type BigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type CarrierCountOrderByAggregateInput = {
    id?: SortOrder
    carrierCode?: SortOrder
    carrierName?: SortOrder
    isActive?: SortOrder
    apiEndpoint?: SortOrder
    createdAt?: SortOrder
  }

  export type CarrierAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type CarrierMaxOrderByAggregateInput = {
    id?: SortOrder
    carrierCode?: SortOrder
    carrierName?: SortOrder
    isActive?: SortOrder
    apiEndpoint?: SortOrder
    createdAt?: SortOrder
  }

  export type CarrierMinOrderByAggregateInput = {
    id?: SortOrder
    carrierCode?: SortOrder
    carrierName?: SortOrder
    isActive?: SortOrder
    apiEndpoint?: SortOrder
    createdAt?: SortOrder
  }

  export type CarrierSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type SupportCaseCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    orderId?: SortOrder
    orderCode?: SortOrder
    userId?: SortOrder
    customer?: SortOrder
    reason?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    resolutionNote?: SortOrder
    resolvedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SupportCaseMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    orderId?: SortOrder
    orderCode?: SortOrder
    userId?: SortOrder
    customer?: SortOrder
    reason?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    resolutionNote?: SortOrder
    resolvedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SupportCaseMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    orderId?: SortOrder
    orderCode?: SortOrder
    userId?: SortOrder
    customer?: SortOrder
    reason?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    resolutionNote?: SortOrder
    resolvedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SkuInventoryCreateNestedManyWithoutWarehouseInput = {
    create?: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput> | SkuInventoryCreateWithoutWarehouseInput[] | SkuInventoryUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutWarehouseInput | SkuInventoryCreateOrConnectWithoutWarehouseInput[]
    createMany?: SkuInventoryCreateManyWarehouseInputEnvelope
    connect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
  }

  export type ShipmentCreateNestedManyWithoutWarehouseInput = {
    create?: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput> | ShipmentCreateWithoutWarehouseInput[] | ShipmentUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: ShipmentCreateOrConnectWithoutWarehouseInput | ShipmentCreateOrConnectWithoutWarehouseInput[]
    createMany?: ShipmentCreateManyWarehouseInputEnvelope
    connect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
  }

  export type SkuInventoryUncheckedCreateNestedManyWithoutWarehouseInput = {
    create?: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput> | SkuInventoryCreateWithoutWarehouseInput[] | SkuInventoryUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutWarehouseInput | SkuInventoryCreateOrConnectWithoutWarehouseInput[]
    createMany?: SkuInventoryCreateManyWarehouseInputEnvelope
    connect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
  }

  export type ShipmentUncheckedCreateNestedManyWithoutWarehouseInput = {
    create?: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput> | ShipmentCreateWithoutWarehouseInput[] | ShipmentUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: ShipmentCreateOrConnectWithoutWarehouseInput | ShipmentCreateOrConnectWithoutWarehouseInput[]
    createMany?: ShipmentCreateManyWarehouseInputEnvelope
    connect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type SkuInventoryUpdateManyWithoutWarehouseNestedInput = {
    create?: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput> | SkuInventoryCreateWithoutWarehouseInput[] | SkuInventoryUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutWarehouseInput | SkuInventoryCreateOrConnectWithoutWarehouseInput[]
    upsert?: SkuInventoryUpsertWithWhereUniqueWithoutWarehouseInput | SkuInventoryUpsertWithWhereUniqueWithoutWarehouseInput[]
    createMany?: SkuInventoryCreateManyWarehouseInputEnvelope
    set?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    disconnect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    delete?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    connect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    update?: SkuInventoryUpdateWithWhereUniqueWithoutWarehouseInput | SkuInventoryUpdateWithWhereUniqueWithoutWarehouseInput[]
    updateMany?: SkuInventoryUpdateManyWithWhereWithoutWarehouseInput | SkuInventoryUpdateManyWithWhereWithoutWarehouseInput[]
    deleteMany?: SkuInventoryScalarWhereInput | SkuInventoryScalarWhereInput[]
  }

  export type ShipmentUpdateManyWithoutWarehouseNestedInput = {
    create?: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput> | ShipmentCreateWithoutWarehouseInput[] | ShipmentUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: ShipmentCreateOrConnectWithoutWarehouseInput | ShipmentCreateOrConnectWithoutWarehouseInput[]
    upsert?: ShipmentUpsertWithWhereUniqueWithoutWarehouseInput | ShipmentUpsertWithWhereUniqueWithoutWarehouseInput[]
    createMany?: ShipmentCreateManyWarehouseInputEnvelope
    set?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    disconnect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    delete?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    connect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    update?: ShipmentUpdateWithWhereUniqueWithoutWarehouseInput | ShipmentUpdateWithWhereUniqueWithoutWarehouseInput[]
    updateMany?: ShipmentUpdateManyWithWhereWithoutWarehouseInput | ShipmentUpdateManyWithWhereWithoutWarehouseInput[]
    deleteMany?: ShipmentScalarWhereInput | ShipmentScalarWhereInput[]
  }

  export type SkuInventoryUncheckedUpdateManyWithoutWarehouseNestedInput = {
    create?: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput> | SkuInventoryCreateWithoutWarehouseInput[] | SkuInventoryUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutWarehouseInput | SkuInventoryCreateOrConnectWithoutWarehouseInput[]
    upsert?: SkuInventoryUpsertWithWhereUniqueWithoutWarehouseInput | SkuInventoryUpsertWithWhereUniqueWithoutWarehouseInput[]
    createMany?: SkuInventoryCreateManyWarehouseInputEnvelope
    set?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    disconnect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    delete?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    connect?: SkuInventoryWhereUniqueInput | SkuInventoryWhereUniqueInput[]
    update?: SkuInventoryUpdateWithWhereUniqueWithoutWarehouseInput | SkuInventoryUpdateWithWhereUniqueWithoutWarehouseInput[]
    updateMany?: SkuInventoryUpdateManyWithWhereWithoutWarehouseInput | SkuInventoryUpdateManyWithWhereWithoutWarehouseInput[]
    deleteMany?: SkuInventoryScalarWhereInput | SkuInventoryScalarWhereInput[]
  }

  export type ShipmentUncheckedUpdateManyWithoutWarehouseNestedInput = {
    create?: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput> | ShipmentCreateWithoutWarehouseInput[] | ShipmentUncheckedCreateWithoutWarehouseInput[]
    connectOrCreate?: ShipmentCreateOrConnectWithoutWarehouseInput | ShipmentCreateOrConnectWithoutWarehouseInput[]
    upsert?: ShipmentUpsertWithWhereUniqueWithoutWarehouseInput | ShipmentUpsertWithWhereUniqueWithoutWarehouseInput[]
    createMany?: ShipmentCreateManyWarehouseInputEnvelope
    set?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    disconnect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    delete?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    connect?: ShipmentWhereUniqueInput | ShipmentWhereUniqueInput[]
    update?: ShipmentUpdateWithWhereUniqueWithoutWarehouseInput | ShipmentUpdateWithWhereUniqueWithoutWarehouseInput[]
    updateMany?: ShipmentUpdateManyWithWhereWithoutWarehouseInput | ShipmentUpdateManyWithWhereWithoutWarehouseInput[]
    deleteMany?: ShipmentScalarWhereInput | ShipmentScalarWhereInput[]
  }

  export type WarehouseCreateNestedOneWithoutInventoriesInput = {
    create?: XOR<WarehouseCreateWithoutInventoriesInput, WarehouseUncheckedCreateWithoutInventoriesInput>
    connectOrCreate?: WarehouseCreateOrConnectWithoutInventoriesInput
    connect?: WarehouseWhereUniqueInput
  }

  export type InventoryLedgerCreateNestedManyWithoutInventoryInput = {
    create?: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput> | InventoryLedgerCreateWithoutInventoryInput[] | InventoryLedgerUncheckedCreateWithoutInventoryInput[]
    connectOrCreate?: InventoryLedgerCreateOrConnectWithoutInventoryInput | InventoryLedgerCreateOrConnectWithoutInventoryInput[]
    createMany?: InventoryLedgerCreateManyInventoryInputEnvelope
    connect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
  }

  export type InventoryLedgerUncheckedCreateNestedManyWithoutInventoryInput = {
    create?: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput> | InventoryLedgerCreateWithoutInventoryInput[] | InventoryLedgerUncheckedCreateWithoutInventoryInput[]
    connectOrCreate?: InventoryLedgerCreateOrConnectWithoutInventoryInput | InventoryLedgerCreateOrConnectWithoutInventoryInput[]
    createMany?: InventoryLedgerCreateManyInventoryInputEnvelope
    connect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type WarehouseUpdateOneRequiredWithoutInventoriesNestedInput = {
    create?: XOR<WarehouseCreateWithoutInventoriesInput, WarehouseUncheckedCreateWithoutInventoriesInput>
    connectOrCreate?: WarehouseCreateOrConnectWithoutInventoriesInput
    upsert?: WarehouseUpsertWithoutInventoriesInput
    connect?: WarehouseWhereUniqueInput
    update?: XOR<XOR<WarehouseUpdateToOneWithWhereWithoutInventoriesInput, WarehouseUpdateWithoutInventoriesInput>, WarehouseUncheckedUpdateWithoutInventoriesInput>
  }

  export type InventoryLedgerUpdateManyWithoutInventoryNestedInput = {
    create?: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput> | InventoryLedgerCreateWithoutInventoryInput[] | InventoryLedgerUncheckedCreateWithoutInventoryInput[]
    connectOrCreate?: InventoryLedgerCreateOrConnectWithoutInventoryInput | InventoryLedgerCreateOrConnectWithoutInventoryInput[]
    upsert?: InventoryLedgerUpsertWithWhereUniqueWithoutInventoryInput | InventoryLedgerUpsertWithWhereUniqueWithoutInventoryInput[]
    createMany?: InventoryLedgerCreateManyInventoryInputEnvelope
    set?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    disconnect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    delete?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    connect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    update?: InventoryLedgerUpdateWithWhereUniqueWithoutInventoryInput | InventoryLedgerUpdateWithWhereUniqueWithoutInventoryInput[]
    updateMany?: InventoryLedgerUpdateManyWithWhereWithoutInventoryInput | InventoryLedgerUpdateManyWithWhereWithoutInventoryInput[]
    deleteMany?: InventoryLedgerScalarWhereInput | InventoryLedgerScalarWhereInput[]
  }

  export type InventoryLedgerUncheckedUpdateManyWithoutInventoryNestedInput = {
    create?: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput> | InventoryLedgerCreateWithoutInventoryInput[] | InventoryLedgerUncheckedCreateWithoutInventoryInput[]
    connectOrCreate?: InventoryLedgerCreateOrConnectWithoutInventoryInput | InventoryLedgerCreateOrConnectWithoutInventoryInput[]
    upsert?: InventoryLedgerUpsertWithWhereUniqueWithoutInventoryInput | InventoryLedgerUpsertWithWhereUniqueWithoutInventoryInput[]
    createMany?: InventoryLedgerCreateManyInventoryInputEnvelope
    set?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    disconnect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    delete?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    connect?: InventoryLedgerWhereUniqueInput | InventoryLedgerWhereUniqueInput[]
    update?: InventoryLedgerUpdateWithWhereUniqueWithoutInventoryInput | InventoryLedgerUpdateWithWhereUniqueWithoutInventoryInput[]
    updateMany?: InventoryLedgerUpdateManyWithWhereWithoutInventoryInput | InventoryLedgerUpdateManyWithWhereWithoutInventoryInput[]
    deleteMany?: InventoryLedgerScalarWhereInput | InventoryLedgerScalarWhereInput[]
  }

  export type SkuInventoryCreateNestedOneWithoutLedgersInput = {
    create?: XOR<SkuInventoryCreateWithoutLedgersInput, SkuInventoryUncheckedCreateWithoutLedgersInput>
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutLedgersInput
    connect?: SkuInventoryWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type SkuInventoryUpdateOneRequiredWithoutLedgersNestedInput = {
    create?: XOR<SkuInventoryCreateWithoutLedgersInput, SkuInventoryUncheckedCreateWithoutLedgersInput>
    connectOrCreate?: SkuInventoryCreateOrConnectWithoutLedgersInput
    upsert?: SkuInventoryUpsertWithoutLedgersInput
    connect?: SkuInventoryWhereUniqueInput
    update?: XOR<XOR<SkuInventoryUpdateToOneWithWhereWithoutLedgersInput, SkuInventoryUpdateWithoutLedgersInput>, SkuInventoryUncheckedUpdateWithoutLedgersInput>
  }

  export type WarehouseCreateNestedOneWithoutShipmentsInput = {
    create?: XOR<WarehouseCreateWithoutShipmentsInput, WarehouseUncheckedCreateWithoutShipmentsInput>
    connectOrCreate?: WarehouseCreateOrConnectWithoutShipmentsInput
    connect?: WarehouseWhereUniqueInput
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type WarehouseUpdateOneWithoutShipmentsNestedInput = {
    create?: XOR<WarehouseCreateWithoutShipmentsInput, WarehouseUncheckedCreateWithoutShipmentsInput>
    connectOrCreate?: WarehouseCreateOrConnectWithoutShipmentsInput
    upsert?: WarehouseUpsertWithoutShipmentsInput
    disconnect?: WarehouseWhereInput | boolean
    delete?: WarehouseWhereInput | boolean
    connect?: WarehouseWhereUniqueInput
    update?: XOR<XOR<WarehouseUpdateToOneWithWhereWithoutShipmentsInput, WarehouseUpdateWithoutShipmentsInput>, WarehouseUncheckedUpdateWithoutShipmentsInput>
  }

  export type NullableBigIntFieldUpdateOperationsInput = {
    set?: bigint | number | null
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type SkuInventoryCreateWithoutWarehouseInput = {
    id?: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    ledgers?: InventoryLedgerCreateNestedManyWithoutInventoryInput
  }

  export type SkuInventoryUncheckedCreateWithoutWarehouseInput = {
    id?: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    ledgers?: InventoryLedgerUncheckedCreateNestedManyWithoutInventoryInput
  }

  export type SkuInventoryCreateOrConnectWithoutWarehouseInput = {
    where: SkuInventoryWhereUniqueInput
    create: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput>
  }

  export type SkuInventoryCreateManyWarehouseInputEnvelope = {
    data: SkuInventoryCreateManyWarehouseInput | SkuInventoryCreateManyWarehouseInput[]
    skipDuplicates?: boolean
  }

  export type ShipmentCreateWithoutWarehouseInput = {
    id: string
    orderId: string
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShipmentUncheckedCreateWithoutWarehouseInput = {
    id: string
    orderId: string
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShipmentCreateOrConnectWithoutWarehouseInput = {
    where: ShipmentWhereUniqueInput
    create: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput>
  }

  export type ShipmentCreateManyWarehouseInputEnvelope = {
    data: ShipmentCreateManyWarehouseInput | ShipmentCreateManyWarehouseInput[]
    skipDuplicates?: boolean
  }

  export type SkuInventoryUpsertWithWhereUniqueWithoutWarehouseInput = {
    where: SkuInventoryWhereUniqueInput
    update: XOR<SkuInventoryUpdateWithoutWarehouseInput, SkuInventoryUncheckedUpdateWithoutWarehouseInput>
    create: XOR<SkuInventoryCreateWithoutWarehouseInput, SkuInventoryUncheckedCreateWithoutWarehouseInput>
  }

  export type SkuInventoryUpdateWithWhereUniqueWithoutWarehouseInput = {
    where: SkuInventoryWhereUniqueInput
    data: XOR<SkuInventoryUpdateWithoutWarehouseInput, SkuInventoryUncheckedUpdateWithoutWarehouseInput>
  }

  export type SkuInventoryUpdateManyWithWhereWithoutWarehouseInput = {
    where: SkuInventoryScalarWhereInput
    data: XOR<SkuInventoryUpdateManyMutationInput, SkuInventoryUncheckedUpdateManyWithoutWarehouseInput>
  }

  export type SkuInventoryScalarWhereInput = {
    AND?: SkuInventoryScalarWhereInput | SkuInventoryScalarWhereInput[]
    OR?: SkuInventoryScalarWhereInput[]
    NOT?: SkuInventoryScalarWhereInput | SkuInventoryScalarWhereInput[]
    id?: BigIntFilter<"SkuInventory"> | bigint | number
    warehouseId?: BigIntFilter<"SkuInventory"> | bigint | number
    productId?: BigIntFilter<"SkuInventory"> | bigint | number
    skuCode?: StringFilter<"SkuInventory"> | string
    totalQuantity?: IntFilter<"SkuInventory"> | number
    availableQuantity?: IntFilter<"SkuInventory"> | number
    reservedQuantity?: IntFilter<"SkuInventory"> | number
    unavailableQuantity?: IntFilter<"SkuInventory"> | number
    createdAt?: DateTimeFilter<"SkuInventory"> | Date | string
    updatedAt?: DateTimeFilter<"SkuInventory"> | Date | string
  }

  export type ShipmentUpsertWithWhereUniqueWithoutWarehouseInput = {
    where: ShipmentWhereUniqueInput
    update: XOR<ShipmentUpdateWithoutWarehouseInput, ShipmentUncheckedUpdateWithoutWarehouseInput>
    create: XOR<ShipmentCreateWithoutWarehouseInput, ShipmentUncheckedCreateWithoutWarehouseInput>
  }

  export type ShipmentUpdateWithWhereUniqueWithoutWarehouseInput = {
    where: ShipmentWhereUniqueInput
    data: XOR<ShipmentUpdateWithoutWarehouseInput, ShipmentUncheckedUpdateWithoutWarehouseInput>
  }

  export type ShipmentUpdateManyWithWhereWithoutWarehouseInput = {
    where: ShipmentScalarWhereInput
    data: XOR<ShipmentUpdateManyMutationInput, ShipmentUncheckedUpdateManyWithoutWarehouseInput>
  }

  export type ShipmentScalarWhereInput = {
    AND?: ShipmentScalarWhereInput | ShipmentScalarWhereInput[]
    OR?: ShipmentScalarWhereInput[]
    NOT?: ShipmentScalarWhereInput | ShipmentScalarWhereInput[]
    id?: StringFilter<"Shipment"> | string
    orderId?: StringFilter<"Shipment"> | string
    warehouseId?: BigIntNullableFilter<"Shipment"> | bigint | number | null
    carrierCode?: StringFilter<"Shipment"> | string
    trackingCode?: StringNullableFilter<"Shipment"> | string | null
    shippingFee?: DecimalFilter<"Shipment"> | Decimal | DecimalJsLike | number | string
    status?: StringFilter<"Shipment"> | string
    receiverName?: StringNullableFilter<"Shipment"> | string | null
    receiverPhone?: StringNullableFilter<"Shipment"> | string | null
    shippingAddress?: StringFilter<"Shipment"> | string
    shippedAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    deliveredAt?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    city?: StringNullableFilter<"Shipment"> | string | null
    currentLocation?: StringNullableFilter<"Shipment"> | string | null
    estimatedDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    actualDeliveryDate?: DateTimeNullableFilter<"Shipment"> | Date | string | null
    createdAt?: DateTimeFilter<"Shipment"> | Date | string
    updatedAt?: DateTimeFilter<"Shipment"> | Date | string
  }

  export type WarehouseCreateWithoutInventoriesInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    shipments?: ShipmentCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseUncheckedCreateWithoutInventoriesInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    shipments?: ShipmentUncheckedCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseCreateOrConnectWithoutInventoriesInput = {
    where: WarehouseWhereUniqueInput
    create: XOR<WarehouseCreateWithoutInventoriesInput, WarehouseUncheckedCreateWithoutInventoriesInput>
  }

  export type InventoryLedgerCreateWithoutInventoryInput = {
    id?: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
  }

  export type InventoryLedgerUncheckedCreateWithoutInventoryInput = {
    id?: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
  }

  export type InventoryLedgerCreateOrConnectWithoutInventoryInput = {
    where: InventoryLedgerWhereUniqueInput
    create: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput>
  }

  export type InventoryLedgerCreateManyInventoryInputEnvelope = {
    data: InventoryLedgerCreateManyInventoryInput | InventoryLedgerCreateManyInventoryInput[]
    skipDuplicates?: boolean
  }

  export type WarehouseUpsertWithoutInventoriesInput = {
    update: XOR<WarehouseUpdateWithoutInventoriesInput, WarehouseUncheckedUpdateWithoutInventoriesInput>
    create: XOR<WarehouseCreateWithoutInventoriesInput, WarehouseUncheckedCreateWithoutInventoriesInput>
    where?: WarehouseWhereInput
  }

  export type WarehouseUpdateToOneWithWhereWithoutInventoriesInput = {
    where?: WarehouseWhereInput
    data: XOR<WarehouseUpdateWithoutInventoriesInput, WarehouseUncheckedUpdateWithoutInventoriesInput>
  }

  export type WarehouseUpdateWithoutInventoriesInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    shipments?: ShipmentUpdateManyWithoutWarehouseNestedInput
  }

  export type WarehouseUncheckedUpdateWithoutInventoriesInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    shipments?: ShipmentUncheckedUpdateManyWithoutWarehouseNestedInput
  }

  export type InventoryLedgerUpsertWithWhereUniqueWithoutInventoryInput = {
    where: InventoryLedgerWhereUniqueInput
    update: XOR<InventoryLedgerUpdateWithoutInventoryInput, InventoryLedgerUncheckedUpdateWithoutInventoryInput>
    create: XOR<InventoryLedgerCreateWithoutInventoryInput, InventoryLedgerUncheckedCreateWithoutInventoryInput>
  }

  export type InventoryLedgerUpdateWithWhereUniqueWithoutInventoryInput = {
    where: InventoryLedgerWhereUniqueInput
    data: XOR<InventoryLedgerUpdateWithoutInventoryInput, InventoryLedgerUncheckedUpdateWithoutInventoryInput>
  }

  export type InventoryLedgerUpdateManyWithWhereWithoutInventoryInput = {
    where: InventoryLedgerScalarWhereInput
    data: XOR<InventoryLedgerUpdateManyMutationInput, InventoryLedgerUncheckedUpdateManyWithoutInventoryInput>
  }

  export type InventoryLedgerScalarWhereInput = {
    AND?: InventoryLedgerScalarWhereInput | InventoryLedgerScalarWhereInput[]
    OR?: InventoryLedgerScalarWhereInput[]
    NOT?: InventoryLedgerScalarWhereInput | InventoryLedgerScalarWhereInput[]
    id?: BigIntFilter<"InventoryLedger"> | bigint | number
    inventoryId?: BigIntFilter<"InventoryLedger"> | bigint | number
    transactionType?: StringFilter<"InventoryLedger"> | string
    quantityDelta?: IntFilter<"InventoryLedger"> | number
    referenceId?: StringNullableFilter<"InventoryLedger"> | string | null
    reason?: StringNullableFilter<"InventoryLedger"> | string | null
    createdAt?: DateTimeFilter<"InventoryLedger"> | Date | string
  }

  export type SkuInventoryCreateWithoutLedgersInput = {
    id?: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    warehouse: WarehouseCreateNestedOneWithoutInventoriesInput
  }

  export type SkuInventoryUncheckedCreateWithoutLedgersInput = {
    id?: bigint | number
    warehouseId: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SkuInventoryCreateOrConnectWithoutLedgersInput = {
    where: SkuInventoryWhereUniqueInput
    create: XOR<SkuInventoryCreateWithoutLedgersInput, SkuInventoryUncheckedCreateWithoutLedgersInput>
  }

  export type SkuInventoryUpsertWithoutLedgersInput = {
    update: XOR<SkuInventoryUpdateWithoutLedgersInput, SkuInventoryUncheckedUpdateWithoutLedgersInput>
    create: XOR<SkuInventoryCreateWithoutLedgersInput, SkuInventoryUncheckedCreateWithoutLedgersInput>
    where?: SkuInventoryWhereInput
  }

  export type SkuInventoryUpdateToOneWithWhereWithoutLedgersInput = {
    where?: SkuInventoryWhereInput
    data: XOR<SkuInventoryUpdateWithoutLedgersInput, SkuInventoryUncheckedUpdateWithoutLedgersInput>
  }

  export type SkuInventoryUpdateWithoutLedgersInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    warehouse?: WarehouseUpdateOneRequiredWithoutInventoriesNestedInput
  }

  export type SkuInventoryUncheckedUpdateWithoutLedgersInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    warehouseId?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WarehouseCreateWithoutShipmentsInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inventories?: SkuInventoryCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseUncheckedCreateWithoutShipmentsInput = {
    id?: bigint | number
    code: string
    name: string
    address: string
    city: string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inventories?: SkuInventoryUncheckedCreateNestedManyWithoutWarehouseInput
  }

  export type WarehouseCreateOrConnectWithoutShipmentsInput = {
    where: WarehouseWhereUniqueInput
    create: XOR<WarehouseCreateWithoutShipmentsInput, WarehouseUncheckedCreateWithoutShipmentsInput>
  }

  export type WarehouseUpsertWithoutShipmentsInput = {
    update: XOR<WarehouseUpdateWithoutShipmentsInput, WarehouseUncheckedUpdateWithoutShipmentsInput>
    create: XOR<WarehouseCreateWithoutShipmentsInput, WarehouseUncheckedCreateWithoutShipmentsInput>
    where?: WarehouseWhereInput
  }

  export type WarehouseUpdateToOneWithWhereWithoutShipmentsInput = {
    where?: WarehouseWhereInput
    data: XOR<WarehouseUpdateWithoutShipmentsInput, WarehouseUncheckedUpdateWithoutShipmentsInput>
  }

  export type WarehouseUpdateWithoutShipmentsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inventories?: SkuInventoryUpdateManyWithoutWarehouseNestedInput
  }

  export type WarehouseUncheckedUpdateWithoutShipmentsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inventories?: SkuInventoryUncheckedUpdateManyWithoutWarehouseNestedInput
  }

  export type SkuInventoryCreateManyWarehouseInput = {
    id?: bigint | number
    productId: bigint | number
    skuCode: string
    totalQuantity?: number
    availableQuantity?: number
    reservedQuantity?: number
    unavailableQuantity?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShipmentCreateManyWarehouseInput = {
    id: string
    orderId: string
    carrierCode: string
    trackingCode?: string | null
    shippingFee?: Decimal | DecimalJsLike | number | string
    status?: string
    receiverName?: string | null
    receiverPhone?: string | null
    shippingAddress: string
    shippedAt?: Date | string | null
    deliveredAt?: Date | string | null
    city?: string | null
    currentLocation?: string | null
    estimatedDeliveryDate?: Date | string | null
    actualDeliveryDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SkuInventoryUpdateWithoutWarehouseInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ledgers?: InventoryLedgerUpdateManyWithoutInventoryNestedInput
  }

  export type SkuInventoryUncheckedUpdateWithoutWarehouseInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ledgers?: InventoryLedgerUncheckedUpdateManyWithoutInventoryNestedInput
  }

  export type SkuInventoryUncheckedUpdateManyWithoutWarehouseInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    skuCode?: StringFieldUpdateOperationsInput | string
    totalQuantity?: IntFieldUpdateOperationsInput | number
    availableQuantity?: IntFieldUpdateOperationsInput | number
    reservedQuantity?: IntFieldUpdateOperationsInput | number
    unavailableQuantity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentUpdateWithoutWarehouseInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentUncheckedUpdateWithoutWarehouseInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipmentUncheckedUpdateManyWithoutWarehouseInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    carrierCode?: StringFieldUpdateOperationsInput | string
    trackingCode?: NullableStringFieldUpdateOperationsInput | string | null
    shippingFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: StringFieldUpdateOperationsInput | string
    receiverName?: NullableStringFieldUpdateOperationsInput | string | null
    receiverPhone?: NullableStringFieldUpdateOperationsInput | string | null
    shippingAddress?: StringFieldUpdateOperationsInput | string
    shippedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    currentLocation?: NullableStringFieldUpdateOperationsInput | string | null
    estimatedDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    actualDeliveryDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerCreateManyInventoryInput = {
    id?: bigint | number
    transactionType: string
    quantityDelta: number
    referenceId?: string | null
    reason?: string | null
    createdAt?: Date | string
  }

  export type InventoryLedgerUpdateWithoutInventoryInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerUncheckedUpdateWithoutInventoryInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InventoryLedgerUncheckedUpdateManyWithoutInventoryInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    transactionType?: StringFieldUpdateOperationsInput | string
    quantityDelta?: IntFieldUpdateOperationsInput | number
    referenceId?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use WarehouseCountOutputTypeDefaultArgs instead
     */
    export type WarehouseCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = WarehouseCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SkuInventoryCountOutputTypeDefaultArgs instead
     */
    export type SkuInventoryCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SkuInventoryCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use WarehouseDefaultArgs instead
     */
    export type WarehouseArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = WarehouseDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SkuInventoryDefaultArgs instead
     */
    export type SkuInventoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SkuInventoryDefaultArgs<ExtArgs>
    /**
     * @deprecated Use InventoryLedgerDefaultArgs instead
     */
    export type InventoryLedgerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InventoryLedgerDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ShipmentDefaultArgs instead
     */
    export type ShipmentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ShipmentDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CarrierDefaultArgs instead
     */
    export type CarrierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CarrierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SupportCaseDefaultArgs instead
     */
    export type SupportCaseArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SupportCaseDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}