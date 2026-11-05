
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
 * Model AuctionRoom
 * 
 */
export type AuctionRoom = $Result.DefaultSelection<Prisma.$AuctionRoomPayload>
/**
 * Model AuctionBid
 * 
 */
export type AuctionBid = $Result.DefaultSelection<Prisma.$AuctionBidPayload>
/**
 * Model AuctionSettlement
 * 
 */
export type AuctionSettlement = $Result.DefaultSelection<Prisma.$AuctionSettlementPayload>
/**
 * Model AuctionExtension
 * 
 */
export type AuctionExtension = $Result.DefaultSelection<Prisma.$AuctionExtensionPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more AuctionRooms
 * const auctionRooms = await prisma.auctionRoom.findMany()
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
   * // Fetch zero or more AuctionRooms
   * const auctionRooms = await prisma.auctionRoom.findMany()
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
   * `prisma.auctionRoom`: Exposes CRUD operations for the **AuctionRoom** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuctionRooms
    * const auctionRooms = await prisma.auctionRoom.findMany()
    * ```
    */
  get auctionRoom(): Prisma.AuctionRoomDelegate<ExtArgs>;

  /**
   * `prisma.auctionBid`: Exposes CRUD operations for the **AuctionBid** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuctionBids
    * const auctionBids = await prisma.auctionBid.findMany()
    * ```
    */
  get auctionBid(): Prisma.AuctionBidDelegate<ExtArgs>;

  /**
   * `prisma.auctionSettlement`: Exposes CRUD operations for the **AuctionSettlement** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuctionSettlements
    * const auctionSettlements = await prisma.auctionSettlement.findMany()
    * ```
    */
  get auctionSettlement(): Prisma.AuctionSettlementDelegate<ExtArgs>;

  /**
   * `prisma.auctionExtension`: Exposes CRUD operations for the **AuctionExtension** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuctionExtensions
    * const auctionExtensions = await prisma.auctionExtension.findMany()
    * ```
    */
  get auctionExtension(): Prisma.AuctionExtensionDelegate<ExtArgs>;
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
    AuctionRoom: 'AuctionRoom',
    AuctionBid: 'AuctionBid',
    AuctionSettlement: 'AuctionSettlement',
    AuctionExtension: 'AuctionExtension'
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
      modelProps: "auctionRoom" | "auctionBid" | "auctionSettlement" | "auctionExtension"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      AuctionRoom: {
        payload: Prisma.$AuctionRoomPayload<ExtArgs>
        fields: Prisma.AuctionRoomFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuctionRoomFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuctionRoomFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          findFirst: {
            args: Prisma.AuctionRoomFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuctionRoomFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          findMany: {
            args: Prisma.AuctionRoomFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>[]
          }
          create: {
            args: Prisma.AuctionRoomCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          createMany: {
            args: Prisma.AuctionRoomCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuctionRoomCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>[]
          }
          delete: {
            args: Prisma.AuctionRoomDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          update: {
            args: Prisma.AuctionRoomUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          deleteMany: {
            args: Prisma.AuctionRoomDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuctionRoomUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuctionRoomUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionRoomPayload>
          }
          aggregate: {
            args: Prisma.AuctionRoomAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuctionRoom>
          }
          groupBy: {
            args: Prisma.AuctionRoomGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuctionRoomGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuctionRoomCountArgs<ExtArgs>
            result: $Utils.Optional<AuctionRoomCountAggregateOutputType> | number
          }
        }
      }
      AuctionBid: {
        payload: Prisma.$AuctionBidPayload<ExtArgs>
        fields: Prisma.AuctionBidFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuctionBidFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuctionBidFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          findFirst: {
            args: Prisma.AuctionBidFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuctionBidFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          findMany: {
            args: Prisma.AuctionBidFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>[]
          }
          create: {
            args: Prisma.AuctionBidCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          createMany: {
            args: Prisma.AuctionBidCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuctionBidCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>[]
          }
          delete: {
            args: Prisma.AuctionBidDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          update: {
            args: Prisma.AuctionBidUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          deleteMany: {
            args: Prisma.AuctionBidDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuctionBidUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuctionBidUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionBidPayload>
          }
          aggregate: {
            args: Prisma.AuctionBidAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuctionBid>
          }
          groupBy: {
            args: Prisma.AuctionBidGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuctionBidGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuctionBidCountArgs<ExtArgs>
            result: $Utils.Optional<AuctionBidCountAggregateOutputType> | number
          }
        }
      }
      AuctionSettlement: {
        payload: Prisma.$AuctionSettlementPayload<ExtArgs>
        fields: Prisma.AuctionSettlementFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuctionSettlementFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuctionSettlementFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          findFirst: {
            args: Prisma.AuctionSettlementFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuctionSettlementFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          findMany: {
            args: Prisma.AuctionSettlementFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>[]
          }
          create: {
            args: Prisma.AuctionSettlementCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          createMany: {
            args: Prisma.AuctionSettlementCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuctionSettlementCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>[]
          }
          delete: {
            args: Prisma.AuctionSettlementDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          update: {
            args: Prisma.AuctionSettlementUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          deleteMany: {
            args: Prisma.AuctionSettlementDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuctionSettlementUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuctionSettlementUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionSettlementPayload>
          }
          aggregate: {
            args: Prisma.AuctionSettlementAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuctionSettlement>
          }
          groupBy: {
            args: Prisma.AuctionSettlementGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuctionSettlementGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuctionSettlementCountArgs<ExtArgs>
            result: $Utils.Optional<AuctionSettlementCountAggregateOutputType> | number
          }
        }
      }
      AuctionExtension: {
        payload: Prisma.$AuctionExtensionPayload<ExtArgs>
        fields: Prisma.AuctionExtensionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuctionExtensionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuctionExtensionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          findFirst: {
            args: Prisma.AuctionExtensionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuctionExtensionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          findMany: {
            args: Prisma.AuctionExtensionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>[]
          }
          create: {
            args: Prisma.AuctionExtensionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          createMany: {
            args: Prisma.AuctionExtensionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuctionExtensionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>[]
          }
          delete: {
            args: Prisma.AuctionExtensionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          update: {
            args: Prisma.AuctionExtensionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          deleteMany: {
            args: Prisma.AuctionExtensionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuctionExtensionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuctionExtensionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuctionExtensionPayload>
          }
          aggregate: {
            args: Prisma.AuctionExtensionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuctionExtension>
          }
          groupBy: {
            args: Prisma.AuctionExtensionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuctionExtensionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuctionExtensionCountArgs<ExtArgs>
            result: $Utils.Optional<AuctionExtensionCountAggregateOutputType> | number
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
   * Count Type AuctionRoomCountOutputType
   */

  export type AuctionRoomCountOutputType = {
    bids: number
    extensions: number
  }

  export type AuctionRoomCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    bids?: boolean | AuctionRoomCountOutputTypeCountBidsArgs
    extensions?: boolean | AuctionRoomCountOutputTypeCountExtensionsArgs
  }

  // Custom InputTypes
  /**
   * AuctionRoomCountOutputType without action
   */
  export type AuctionRoomCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoomCountOutputType
     */
    select?: AuctionRoomCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AuctionRoomCountOutputType without action
   */
  export type AuctionRoomCountOutputTypeCountBidsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionBidWhereInput
  }

  /**
   * AuctionRoomCountOutputType without action
   */
  export type AuctionRoomCountOutputTypeCountExtensionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionExtensionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model AuctionRoom
   */

  export type AggregateAuctionRoom = {
    _count: AuctionRoomCountAggregateOutputType | null
    _avg: AuctionRoomAvgAggregateOutputType | null
    _sum: AuctionRoomSumAggregateOutputType | null
    _min: AuctionRoomMinAggregateOutputType | null
    _max: AuctionRoomMaxAggregateOutputType | null
  }

  export type AuctionRoomAvgAggregateOutputType = {
    id: number | null
    productId: number | null
    startPrice: Decimal | null
    currentPrice: Decimal | null
    bidStep: Decimal | null
    buyNowPrice: Decimal | null
  }

  export type AuctionRoomSumAggregateOutputType = {
    id: bigint | null
    productId: bigint | null
    startPrice: Decimal | null
    currentPrice: Decimal | null
    bidStep: Decimal | null
    buyNowPrice: Decimal | null
  }

  export type AuctionRoomMinAggregateOutputType = {
    id: bigint | null
    productId: bigint | null
    sellerId: string | null
    title: string | null
    startPrice: Decimal | null
    currentPrice: Decimal | null
    bidStep: Decimal | null
    buyNowPrice: Decimal | null
    startTime: Date | null
    endTime: Date | null
    actualEndTime: Date | null
    status: string | null
    winnerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuctionRoomMaxAggregateOutputType = {
    id: bigint | null
    productId: bigint | null
    sellerId: string | null
    title: string | null
    startPrice: Decimal | null
    currentPrice: Decimal | null
    bidStep: Decimal | null
    buyNowPrice: Decimal | null
    startTime: Date | null
    endTime: Date | null
    actualEndTime: Date | null
    status: string | null
    winnerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuctionRoomCountAggregateOutputType = {
    id: number
    productId: number
    sellerId: number
    title: number
    startPrice: number
    currentPrice: number
    bidStep: number
    buyNowPrice: number
    startTime: number
    endTime: number
    actualEndTime: number
    status: number
    winnerId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AuctionRoomAvgAggregateInputType = {
    id?: true
    productId?: true
    startPrice?: true
    currentPrice?: true
    bidStep?: true
    buyNowPrice?: true
  }

  export type AuctionRoomSumAggregateInputType = {
    id?: true
    productId?: true
    startPrice?: true
    currentPrice?: true
    bidStep?: true
    buyNowPrice?: true
  }

  export type AuctionRoomMinAggregateInputType = {
    id?: true
    productId?: true
    sellerId?: true
    title?: true
    startPrice?: true
    currentPrice?: true
    bidStep?: true
    buyNowPrice?: true
    startTime?: true
    endTime?: true
    actualEndTime?: true
    status?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuctionRoomMaxAggregateInputType = {
    id?: true
    productId?: true
    sellerId?: true
    title?: true
    startPrice?: true
    currentPrice?: true
    bidStep?: true
    buyNowPrice?: true
    startTime?: true
    endTime?: true
    actualEndTime?: true
    status?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuctionRoomCountAggregateInputType = {
    id?: true
    productId?: true
    sellerId?: true
    title?: true
    startPrice?: true
    currentPrice?: true
    bidStep?: true
    buyNowPrice?: true
    startTime?: true
    endTime?: true
    actualEndTime?: true
    status?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AuctionRoomAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionRoom to aggregate.
     */
    where?: AuctionRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionRooms to fetch.
     */
    orderBy?: AuctionRoomOrderByWithRelationInput | AuctionRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuctionRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuctionRooms
    **/
    _count?: true | AuctionRoomCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuctionRoomAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuctionRoomSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuctionRoomMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuctionRoomMaxAggregateInputType
  }

  export type GetAuctionRoomAggregateType<T extends AuctionRoomAggregateArgs> = {
        [P in keyof T & keyof AggregateAuctionRoom]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuctionRoom[P]>
      : GetScalarType<T[P], AggregateAuctionRoom[P]>
  }




  export type AuctionRoomGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionRoomWhereInput
    orderBy?: AuctionRoomOrderByWithAggregationInput | AuctionRoomOrderByWithAggregationInput[]
    by: AuctionRoomScalarFieldEnum[] | AuctionRoomScalarFieldEnum
    having?: AuctionRoomScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuctionRoomCountAggregateInputType | true
    _avg?: AuctionRoomAvgAggregateInputType
    _sum?: AuctionRoomSumAggregateInputType
    _min?: AuctionRoomMinAggregateInputType
    _max?: AuctionRoomMaxAggregateInputType
  }

  export type AuctionRoomGroupByOutputType = {
    id: bigint
    productId: bigint
    sellerId: string
    title: string
    startPrice: Decimal
    currentPrice: Decimal
    bidStep: Decimal
    buyNowPrice: Decimal | null
    startTime: Date
    endTime: Date
    actualEndTime: Date | null
    status: string
    winnerId: string | null
    createdAt: Date
    updatedAt: Date
    _count: AuctionRoomCountAggregateOutputType | null
    _avg: AuctionRoomAvgAggregateOutputType | null
    _sum: AuctionRoomSumAggregateOutputType | null
    _min: AuctionRoomMinAggregateOutputType | null
    _max: AuctionRoomMaxAggregateOutputType | null
  }

  type GetAuctionRoomGroupByPayload<T extends AuctionRoomGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuctionRoomGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuctionRoomGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuctionRoomGroupByOutputType[P]>
            : GetScalarType<T[P], AuctionRoomGroupByOutputType[P]>
        }
      >
    >


  export type AuctionRoomSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    sellerId?: boolean
    title?: boolean
    startPrice?: boolean
    currentPrice?: boolean
    bidStep?: boolean
    buyNowPrice?: boolean
    startTime?: boolean
    endTime?: boolean
    actualEndTime?: boolean
    status?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    bids?: boolean | AuctionRoom$bidsArgs<ExtArgs>
    settlement?: boolean | AuctionRoom$settlementArgs<ExtArgs>
    extensions?: boolean | AuctionRoom$extensionsArgs<ExtArgs>
    _count?: boolean | AuctionRoomCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionRoom"]>

  export type AuctionRoomSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    sellerId?: boolean
    title?: boolean
    startPrice?: boolean
    currentPrice?: boolean
    bidStep?: boolean
    buyNowPrice?: boolean
    startTime?: boolean
    endTime?: boolean
    actualEndTime?: boolean
    status?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["auctionRoom"]>

  export type AuctionRoomSelectScalar = {
    id?: boolean
    productId?: boolean
    sellerId?: boolean
    title?: boolean
    startPrice?: boolean
    currentPrice?: boolean
    bidStep?: boolean
    buyNowPrice?: boolean
    startTime?: boolean
    endTime?: boolean
    actualEndTime?: boolean
    status?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AuctionRoomInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    bids?: boolean | AuctionRoom$bidsArgs<ExtArgs>
    settlement?: boolean | AuctionRoom$settlementArgs<ExtArgs>
    extensions?: boolean | AuctionRoom$extensionsArgs<ExtArgs>
    _count?: boolean | AuctionRoomCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AuctionRoomIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $AuctionRoomPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuctionRoom"
    objects: {
      bids: Prisma.$AuctionBidPayload<ExtArgs>[]
      settlement: Prisma.$AuctionSettlementPayload<ExtArgs> | null
      extensions: Prisma.$AuctionExtensionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      productId: bigint
      sellerId: string
      title: string
      startPrice: Prisma.Decimal
      currentPrice: Prisma.Decimal
      bidStep: Prisma.Decimal
      buyNowPrice: Prisma.Decimal | null
      startTime: Date
      endTime: Date
      actualEndTime: Date | null
      status: string
      winnerId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["auctionRoom"]>
    composites: {}
  }

  type AuctionRoomGetPayload<S extends boolean | null | undefined | AuctionRoomDefaultArgs> = $Result.GetResult<Prisma.$AuctionRoomPayload, S>

  type AuctionRoomCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuctionRoomFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuctionRoomCountAggregateInputType | true
    }

  export interface AuctionRoomDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuctionRoom'], meta: { name: 'AuctionRoom' } }
    /**
     * Find zero or one AuctionRoom that matches the filter.
     * @param {AuctionRoomFindUniqueArgs} args - Arguments to find a AuctionRoom
     * @example
     * // Get one AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuctionRoomFindUniqueArgs>(args: SelectSubset<T, AuctionRoomFindUniqueArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AuctionRoom that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuctionRoomFindUniqueOrThrowArgs} args - Arguments to find a AuctionRoom
     * @example
     * // Get one AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuctionRoomFindUniqueOrThrowArgs>(args: SelectSubset<T, AuctionRoomFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AuctionRoom that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomFindFirstArgs} args - Arguments to find a AuctionRoom
     * @example
     * // Get one AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuctionRoomFindFirstArgs>(args?: SelectSubset<T, AuctionRoomFindFirstArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AuctionRoom that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomFindFirstOrThrowArgs} args - Arguments to find a AuctionRoom
     * @example
     * // Get one AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuctionRoomFindFirstOrThrowArgs>(args?: SelectSubset<T, AuctionRoomFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AuctionRooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuctionRooms
     * const auctionRooms = await prisma.auctionRoom.findMany()
     * 
     * // Get first 10 AuctionRooms
     * const auctionRooms = await prisma.auctionRoom.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auctionRoomWithIdOnly = await prisma.auctionRoom.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuctionRoomFindManyArgs>(args?: SelectSubset<T, AuctionRoomFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AuctionRoom.
     * @param {AuctionRoomCreateArgs} args - Arguments to create a AuctionRoom.
     * @example
     * // Create one AuctionRoom
     * const AuctionRoom = await prisma.auctionRoom.create({
     *   data: {
     *     // ... data to create a AuctionRoom
     *   }
     * })
     * 
     */
    create<T extends AuctionRoomCreateArgs>(args: SelectSubset<T, AuctionRoomCreateArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AuctionRooms.
     * @param {AuctionRoomCreateManyArgs} args - Arguments to create many AuctionRooms.
     * @example
     * // Create many AuctionRooms
     * const auctionRoom = await prisma.auctionRoom.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuctionRoomCreateManyArgs>(args?: SelectSubset<T, AuctionRoomCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuctionRooms and returns the data saved in the database.
     * @param {AuctionRoomCreateManyAndReturnArgs} args - Arguments to create many AuctionRooms.
     * @example
     * // Create many AuctionRooms
     * const auctionRoom = await prisma.auctionRoom.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuctionRooms and only return the `id`
     * const auctionRoomWithIdOnly = await prisma.auctionRoom.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuctionRoomCreateManyAndReturnArgs>(args?: SelectSubset<T, AuctionRoomCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AuctionRoom.
     * @param {AuctionRoomDeleteArgs} args - Arguments to delete one AuctionRoom.
     * @example
     * // Delete one AuctionRoom
     * const AuctionRoom = await prisma.auctionRoom.delete({
     *   where: {
     *     // ... filter to delete one AuctionRoom
     *   }
     * })
     * 
     */
    delete<T extends AuctionRoomDeleteArgs>(args: SelectSubset<T, AuctionRoomDeleteArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AuctionRoom.
     * @param {AuctionRoomUpdateArgs} args - Arguments to update one AuctionRoom.
     * @example
     * // Update one AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuctionRoomUpdateArgs>(args: SelectSubset<T, AuctionRoomUpdateArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AuctionRooms.
     * @param {AuctionRoomDeleteManyArgs} args - Arguments to filter AuctionRooms to delete.
     * @example
     * // Delete a few AuctionRooms
     * const { count } = await prisma.auctionRoom.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuctionRoomDeleteManyArgs>(args?: SelectSubset<T, AuctionRoomDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuctionRooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuctionRooms
     * const auctionRoom = await prisma.auctionRoom.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuctionRoomUpdateManyArgs>(args: SelectSubset<T, AuctionRoomUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuctionRoom.
     * @param {AuctionRoomUpsertArgs} args - Arguments to update or create a AuctionRoom.
     * @example
     * // Update or create a AuctionRoom
     * const auctionRoom = await prisma.auctionRoom.upsert({
     *   create: {
     *     // ... data to create a AuctionRoom
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuctionRoom we want to update
     *   }
     * })
     */
    upsert<T extends AuctionRoomUpsertArgs>(args: SelectSubset<T, AuctionRoomUpsertArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AuctionRooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomCountArgs} args - Arguments to filter AuctionRooms to count.
     * @example
     * // Count the number of AuctionRooms
     * const count = await prisma.auctionRoom.count({
     *   where: {
     *     // ... the filter for the AuctionRooms we want to count
     *   }
     * })
    **/
    count<T extends AuctionRoomCountArgs>(
      args?: Subset<T, AuctionRoomCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuctionRoomCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuctionRoom.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuctionRoomAggregateArgs>(args: Subset<T, AuctionRoomAggregateArgs>): Prisma.PrismaPromise<GetAuctionRoomAggregateType<T>>

    /**
     * Group by AuctionRoom.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionRoomGroupByArgs} args - Group by arguments.
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
      T extends AuctionRoomGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuctionRoomGroupByArgs['orderBy'] }
        : { orderBy?: AuctionRoomGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuctionRoomGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuctionRoomGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuctionRoom model
   */
  readonly fields: AuctionRoomFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuctionRoom.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuctionRoomClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    bids<T extends AuctionRoom$bidsArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoom$bidsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findMany"> | Null>
    settlement<T extends AuctionRoom$settlementArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoom$settlementArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    extensions<T extends AuctionRoom$extensionsArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoom$extensionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the AuctionRoom model
   */ 
  interface AuctionRoomFieldRefs {
    readonly id: FieldRef<"AuctionRoom", 'BigInt'>
    readonly productId: FieldRef<"AuctionRoom", 'BigInt'>
    readonly sellerId: FieldRef<"AuctionRoom", 'String'>
    readonly title: FieldRef<"AuctionRoom", 'String'>
    readonly startPrice: FieldRef<"AuctionRoom", 'Decimal'>
    readonly currentPrice: FieldRef<"AuctionRoom", 'Decimal'>
    readonly bidStep: FieldRef<"AuctionRoom", 'Decimal'>
    readonly buyNowPrice: FieldRef<"AuctionRoom", 'Decimal'>
    readonly startTime: FieldRef<"AuctionRoom", 'DateTime'>
    readonly endTime: FieldRef<"AuctionRoom", 'DateTime'>
    readonly actualEndTime: FieldRef<"AuctionRoom", 'DateTime'>
    readonly status: FieldRef<"AuctionRoom", 'String'>
    readonly winnerId: FieldRef<"AuctionRoom", 'String'>
    readonly createdAt: FieldRef<"AuctionRoom", 'DateTime'>
    readonly updatedAt: FieldRef<"AuctionRoom", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuctionRoom findUnique
   */
  export type AuctionRoomFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter, which AuctionRoom to fetch.
     */
    where: AuctionRoomWhereUniqueInput
  }

  /**
   * AuctionRoom findUniqueOrThrow
   */
  export type AuctionRoomFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter, which AuctionRoom to fetch.
     */
    where: AuctionRoomWhereUniqueInput
  }

  /**
   * AuctionRoom findFirst
   */
  export type AuctionRoomFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter, which AuctionRoom to fetch.
     */
    where?: AuctionRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionRooms to fetch.
     */
    orderBy?: AuctionRoomOrderByWithRelationInput | AuctionRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionRooms.
     */
    cursor?: AuctionRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionRooms.
     */
    distinct?: AuctionRoomScalarFieldEnum | AuctionRoomScalarFieldEnum[]
  }

  /**
   * AuctionRoom findFirstOrThrow
   */
  export type AuctionRoomFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter, which AuctionRoom to fetch.
     */
    where?: AuctionRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionRooms to fetch.
     */
    orderBy?: AuctionRoomOrderByWithRelationInput | AuctionRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionRooms.
     */
    cursor?: AuctionRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionRooms.
     */
    distinct?: AuctionRoomScalarFieldEnum | AuctionRoomScalarFieldEnum[]
  }

  /**
   * AuctionRoom findMany
   */
  export type AuctionRoomFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter, which AuctionRooms to fetch.
     */
    where?: AuctionRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionRooms to fetch.
     */
    orderBy?: AuctionRoomOrderByWithRelationInput | AuctionRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuctionRooms.
     */
    cursor?: AuctionRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionRooms.
     */
    skip?: number
    distinct?: AuctionRoomScalarFieldEnum | AuctionRoomScalarFieldEnum[]
  }

  /**
   * AuctionRoom create
   */
  export type AuctionRoomCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * The data needed to create a AuctionRoom.
     */
    data: XOR<AuctionRoomCreateInput, AuctionRoomUncheckedCreateInput>
  }

  /**
   * AuctionRoom createMany
   */
  export type AuctionRoomCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuctionRooms.
     */
    data: AuctionRoomCreateManyInput | AuctionRoomCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuctionRoom createManyAndReturn
   */
  export type AuctionRoomCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AuctionRooms.
     */
    data: AuctionRoomCreateManyInput | AuctionRoomCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuctionRoom update
   */
  export type AuctionRoomUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * The data needed to update a AuctionRoom.
     */
    data: XOR<AuctionRoomUpdateInput, AuctionRoomUncheckedUpdateInput>
    /**
     * Choose, which AuctionRoom to update.
     */
    where: AuctionRoomWhereUniqueInput
  }

  /**
   * AuctionRoom updateMany
   */
  export type AuctionRoomUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuctionRooms.
     */
    data: XOR<AuctionRoomUpdateManyMutationInput, AuctionRoomUncheckedUpdateManyInput>
    /**
     * Filter which AuctionRooms to update
     */
    where?: AuctionRoomWhereInput
  }

  /**
   * AuctionRoom upsert
   */
  export type AuctionRoomUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * The filter to search for the AuctionRoom to update in case it exists.
     */
    where: AuctionRoomWhereUniqueInput
    /**
     * In case the AuctionRoom found by the `where` argument doesn't exist, create a new AuctionRoom with this data.
     */
    create: XOR<AuctionRoomCreateInput, AuctionRoomUncheckedCreateInput>
    /**
     * In case the AuctionRoom was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuctionRoomUpdateInput, AuctionRoomUncheckedUpdateInput>
  }

  /**
   * AuctionRoom delete
   */
  export type AuctionRoomDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
    /**
     * Filter which AuctionRoom to delete.
     */
    where: AuctionRoomWhereUniqueInput
  }

  /**
   * AuctionRoom deleteMany
   */
  export type AuctionRoomDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionRooms to delete
     */
    where?: AuctionRoomWhereInput
  }

  /**
   * AuctionRoom.bids
   */
  export type AuctionRoom$bidsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    where?: AuctionBidWhereInput
    orderBy?: AuctionBidOrderByWithRelationInput | AuctionBidOrderByWithRelationInput[]
    cursor?: AuctionBidWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuctionBidScalarFieldEnum | AuctionBidScalarFieldEnum[]
  }

  /**
   * AuctionRoom.settlement
   */
  export type AuctionRoom$settlementArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    where?: AuctionSettlementWhereInput
  }

  /**
   * AuctionRoom.extensions
   */
  export type AuctionRoom$extensionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    where?: AuctionExtensionWhereInput
    orderBy?: AuctionExtensionOrderByWithRelationInput | AuctionExtensionOrderByWithRelationInput[]
    cursor?: AuctionExtensionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuctionExtensionScalarFieldEnum | AuctionExtensionScalarFieldEnum[]
  }

  /**
   * AuctionRoom without action
   */
  export type AuctionRoomDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionRoom
     */
    select?: AuctionRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionRoomInclude<ExtArgs> | null
  }


  /**
   * Model AuctionBid
   */

  export type AggregateAuctionBid = {
    _count: AuctionBidCountAggregateOutputType | null
    _avg: AuctionBidAvgAggregateOutputType | null
    _sum: AuctionBidSumAggregateOutputType | null
    _min: AuctionBidMinAggregateOutputType | null
    _max: AuctionBidMaxAggregateOutputType | null
  }

  export type AuctionBidAvgAggregateOutputType = {
    id: number | null
    auctionId: number | null
    bidAmount: Decimal | null
  }

  export type AuctionBidSumAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    bidAmount: Decimal | null
  }

  export type AuctionBidMinAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    bidderId: string | null
    bidAmount: Decimal | null
    bidTime: Date | null
    isWinning: boolean | null
    createdAt: Date | null
  }

  export type AuctionBidMaxAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    bidderId: string | null
    bidAmount: Decimal | null
    bidTime: Date | null
    isWinning: boolean | null
    createdAt: Date | null
  }

  export type AuctionBidCountAggregateOutputType = {
    id: number
    auctionId: number
    bidderId: number
    bidAmount: number
    bidTime: number
    isWinning: number
    createdAt: number
    _all: number
  }


  export type AuctionBidAvgAggregateInputType = {
    id?: true
    auctionId?: true
    bidAmount?: true
  }

  export type AuctionBidSumAggregateInputType = {
    id?: true
    auctionId?: true
    bidAmount?: true
  }

  export type AuctionBidMinAggregateInputType = {
    id?: true
    auctionId?: true
    bidderId?: true
    bidAmount?: true
    bidTime?: true
    isWinning?: true
    createdAt?: true
  }

  export type AuctionBidMaxAggregateInputType = {
    id?: true
    auctionId?: true
    bidderId?: true
    bidAmount?: true
    bidTime?: true
    isWinning?: true
    createdAt?: true
  }

  export type AuctionBidCountAggregateInputType = {
    id?: true
    auctionId?: true
    bidderId?: true
    bidAmount?: true
    bidTime?: true
    isWinning?: true
    createdAt?: true
    _all?: true
  }

  export type AuctionBidAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionBid to aggregate.
     */
    where?: AuctionBidWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionBids to fetch.
     */
    orderBy?: AuctionBidOrderByWithRelationInput | AuctionBidOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuctionBidWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionBids from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionBids.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuctionBids
    **/
    _count?: true | AuctionBidCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuctionBidAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuctionBidSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuctionBidMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuctionBidMaxAggregateInputType
  }

  export type GetAuctionBidAggregateType<T extends AuctionBidAggregateArgs> = {
        [P in keyof T & keyof AggregateAuctionBid]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuctionBid[P]>
      : GetScalarType<T[P], AggregateAuctionBid[P]>
  }




  export type AuctionBidGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionBidWhereInput
    orderBy?: AuctionBidOrderByWithAggregationInput | AuctionBidOrderByWithAggregationInput[]
    by: AuctionBidScalarFieldEnum[] | AuctionBidScalarFieldEnum
    having?: AuctionBidScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuctionBidCountAggregateInputType | true
    _avg?: AuctionBidAvgAggregateInputType
    _sum?: AuctionBidSumAggregateInputType
    _min?: AuctionBidMinAggregateInputType
    _max?: AuctionBidMaxAggregateInputType
  }

  export type AuctionBidGroupByOutputType = {
    id: bigint
    auctionId: bigint
    bidderId: string
    bidAmount: Decimal
    bidTime: Date
    isWinning: boolean
    createdAt: Date
    _count: AuctionBidCountAggregateOutputType | null
    _avg: AuctionBidAvgAggregateOutputType | null
    _sum: AuctionBidSumAggregateOutputType | null
    _min: AuctionBidMinAggregateOutputType | null
    _max: AuctionBidMaxAggregateOutputType | null
  }

  type GetAuctionBidGroupByPayload<T extends AuctionBidGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuctionBidGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuctionBidGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuctionBidGroupByOutputType[P]>
            : GetScalarType<T[P], AuctionBidGroupByOutputType[P]>
        }
      >
    >


  export type AuctionBidSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    bidderId?: boolean
    bidAmount?: boolean
    bidTime?: boolean
    isWinning?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionBid"]>

  export type AuctionBidSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    bidderId?: boolean
    bidAmount?: boolean
    bidTime?: boolean
    isWinning?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionBid"]>

  export type AuctionBidSelectScalar = {
    id?: boolean
    auctionId?: boolean
    bidderId?: boolean
    bidAmount?: boolean
    bidTime?: boolean
    isWinning?: boolean
    createdAt?: boolean
  }

  export type AuctionBidInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }
  export type AuctionBidIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }

  export type $AuctionBidPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuctionBid"
    objects: {
      auction: Prisma.$AuctionRoomPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      auctionId: bigint
      bidderId: string
      bidAmount: Prisma.Decimal
      bidTime: Date
      isWinning: boolean
      createdAt: Date
    }, ExtArgs["result"]["auctionBid"]>
    composites: {}
  }

  type AuctionBidGetPayload<S extends boolean | null | undefined | AuctionBidDefaultArgs> = $Result.GetResult<Prisma.$AuctionBidPayload, S>

  type AuctionBidCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuctionBidFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuctionBidCountAggregateInputType | true
    }

  export interface AuctionBidDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuctionBid'], meta: { name: 'AuctionBid' } }
    /**
     * Find zero or one AuctionBid that matches the filter.
     * @param {AuctionBidFindUniqueArgs} args - Arguments to find a AuctionBid
     * @example
     * // Get one AuctionBid
     * const auctionBid = await prisma.auctionBid.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuctionBidFindUniqueArgs>(args: SelectSubset<T, AuctionBidFindUniqueArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AuctionBid that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuctionBidFindUniqueOrThrowArgs} args - Arguments to find a AuctionBid
     * @example
     * // Get one AuctionBid
     * const auctionBid = await prisma.auctionBid.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuctionBidFindUniqueOrThrowArgs>(args: SelectSubset<T, AuctionBidFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AuctionBid that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidFindFirstArgs} args - Arguments to find a AuctionBid
     * @example
     * // Get one AuctionBid
     * const auctionBid = await prisma.auctionBid.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuctionBidFindFirstArgs>(args?: SelectSubset<T, AuctionBidFindFirstArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AuctionBid that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidFindFirstOrThrowArgs} args - Arguments to find a AuctionBid
     * @example
     * // Get one AuctionBid
     * const auctionBid = await prisma.auctionBid.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuctionBidFindFirstOrThrowArgs>(args?: SelectSubset<T, AuctionBidFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AuctionBids that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuctionBids
     * const auctionBids = await prisma.auctionBid.findMany()
     * 
     * // Get first 10 AuctionBids
     * const auctionBids = await prisma.auctionBid.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auctionBidWithIdOnly = await prisma.auctionBid.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuctionBidFindManyArgs>(args?: SelectSubset<T, AuctionBidFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AuctionBid.
     * @param {AuctionBidCreateArgs} args - Arguments to create a AuctionBid.
     * @example
     * // Create one AuctionBid
     * const AuctionBid = await prisma.auctionBid.create({
     *   data: {
     *     // ... data to create a AuctionBid
     *   }
     * })
     * 
     */
    create<T extends AuctionBidCreateArgs>(args: SelectSubset<T, AuctionBidCreateArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AuctionBids.
     * @param {AuctionBidCreateManyArgs} args - Arguments to create many AuctionBids.
     * @example
     * // Create many AuctionBids
     * const auctionBid = await prisma.auctionBid.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuctionBidCreateManyArgs>(args?: SelectSubset<T, AuctionBidCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuctionBids and returns the data saved in the database.
     * @param {AuctionBidCreateManyAndReturnArgs} args - Arguments to create many AuctionBids.
     * @example
     * // Create many AuctionBids
     * const auctionBid = await prisma.auctionBid.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuctionBids and only return the `id`
     * const auctionBidWithIdOnly = await prisma.auctionBid.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuctionBidCreateManyAndReturnArgs>(args?: SelectSubset<T, AuctionBidCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AuctionBid.
     * @param {AuctionBidDeleteArgs} args - Arguments to delete one AuctionBid.
     * @example
     * // Delete one AuctionBid
     * const AuctionBid = await prisma.auctionBid.delete({
     *   where: {
     *     // ... filter to delete one AuctionBid
     *   }
     * })
     * 
     */
    delete<T extends AuctionBidDeleteArgs>(args: SelectSubset<T, AuctionBidDeleteArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AuctionBid.
     * @param {AuctionBidUpdateArgs} args - Arguments to update one AuctionBid.
     * @example
     * // Update one AuctionBid
     * const auctionBid = await prisma.auctionBid.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuctionBidUpdateArgs>(args: SelectSubset<T, AuctionBidUpdateArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AuctionBids.
     * @param {AuctionBidDeleteManyArgs} args - Arguments to filter AuctionBids to delete.
     * @example
     * // Delete a few AuctionBids
     * const { count } = await prisma.auctionBid.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuctionBidDeleteManyArgs>(args?: SelectSubset<T, AuctionBidDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuctionBids.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuctionBids
     * const auctionBid = await prisma.auctionBid.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuctionBidUpdateManyArgs>(args: SelectSubset<T, AuctionBidUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuctionBid.
     * @param {AuctionBidUpsertArgs} args - Arguments to update or create a AuctionBid.
     * @example
     * // Update or create a AuctionBid
     * const auctionBid = await prisma.auctionBid.upsert({
     *   create: {
     *     // ... data to create a AuctionBid
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuctionBid we want to update
     *   }
     * })
     */
    upsert<T extends AuctionBidUpsertArgs>(args: SelectSubset<T, AuctionBidUpsertArgs<ExtArgs>>): Prisma__AuctionBidClient<$Result.GetResult<Prisma.$AuctionBidPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AuctionBids.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidCountArgs} args - Arguments to filter AuctionBids to count.
     * @example
     * // Count the number of AuctionBids
     * const count = await prisma.auctionBid.count({
     *   where: {
     *     // ... the filter for the AuctionBids we want to count
     *   }
     * })
    **/
    count<T extends AuctionBidCountArgs>(
      args?: Subset<T, AuctionBidCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuctionBidCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuctionBid.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuctionBidAggregateArgs>(args: Subset<T, AuctionBidAggregateArgs>): Prisma.PrismaPromise<GetAuctionBidAggregateType<T>>

    /**
     * Group by AuctionBid.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionBidGroupByArgs} args - Group by arguments.
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
      T extends AuctionBidGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuctionBidGroupByArgs['orderBy'] }
        : { orderBy?: AuctionBidGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuctionBidGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuctionBidGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuctionBid model
   */
  readonly fields: AuctionBidFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuctionBid.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuctionBidClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    auction<T extends AuctionRoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoomDefaultArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the AuctionBid model
   */ 
  interface AuctionBidFieldRefs {
    readonly id: FieldRef<"AuctionBid", 'BigInt'>
    readonly auctionId: FieldRef<"AuctionBid", 'BigInt'>
    readonly bidderId: FieldRef<"AuctionBid", 'String'>
    readonly bidAmount: FieldRef<"AuctionBid", 'Decimal'>
    readonly bidTime: FieldRef<"AuctionBid", 'DateTime'>
    readonly isWinning: FieldRef<"AuctionBid", 'Boolean'>
    readonly createdAt: FieldRef<"AuctionBid", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuctionBid findUnique
   */
  export type AuctionBidFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter, which AuctionBid to fetch.
     */
    where: AuctionBidWhereUniqueInput
  }

  /**
   * AuctionBid findUniqueOrThrow
   */
  export type AuctionBidFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter, which AuctionBid to fetch.
     */
    where: AuctionBidWhereUniqueInput
  }

  /**
   * AuctionBid findFirst
   */
  export type AuctionBidFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter, which AuctionBid to fetch.
     */
    where?: AuctionBidWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionBids to fetch.
     */
    orderBy?: AuctionBidOrderByWithRelationInput | AuctionBidOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionBids.
     */
    cursor?: AuctionBidWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionBids from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionBids.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionBids.
     */
    distinct?: AuctionBidScalarFieldEnum | AuctionBidScalarFieldEnum[]
  }

  /**
   * AuctionBid findFirstOrThrow
   */
  export type AuctionBidFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter, which AuctionBid to fetch.
     */
    where?: AuctionBidWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionBids to fetch.
     */
    orderBy?: AuctionBidOrderByWithRelationInput | AuctionBidOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionBids.
     */
    cursor?: AuctionBidWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionBids from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionBids.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionBids.
     */
    distinct?: AuctionBidScalarFieldEnum | AuctionBidScalarFieldEnum[]
  }

  /**
   * AuctionBid findMany
   */
  export type AuctionBidFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter, which AuctionBids to fetch.
     */
    where?: AuctionBidWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionBids to fetch.
     */
    orderBy?: AuctionBidOrderByWithRelationInput | AuctionBidOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuctionBids.
     */
    cursor?: AuctionBidWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionBids from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionBids.
     */
    skip?: number
    distinct?: AuctionBidScalarFieldEnum | AuctionBidScalarFieldEnum[]
  }

  /**
   * AuctionBid create
   */
  export type AuctionBidCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * The data needed to create a AuctionBid.
     */
    data: XOR<AuctionBidCreateInput, AuctionBidUncheckedCreateInput>
  }

  /**
   * AuctionBid createMany
   */
  export type AuctionBidCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuctionBids.
     */
    data: AuctionBidCreateManyInput | AuctionBidCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuctionBid createManyAndReturn
   */
  export type AuctionBidCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AuctionBids.
     */
    data: AuctionBidCreateManyInput | AuctionBidCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuctionBid update
   */
  export type AuctionBidUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * The data needed to update a AuctionBid.
     */
    data: XOR<AuctionBidUpdateInput, AuctionBidUncheckedUpdateInput>
    /**
     * Choose, which AuctionBid to update.
     */
    where: AuctionBidWhereUniqueInput
  }

  /**
   * AuctionBid updateMany
   */
  export type AuctionBidUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuctionBids.
     */
    data: XOR<AuctionBidUpdateManyMutationInput, AuctionBidUncheckedUpdateManyInput>
    /**
     * Filter which AuctionBids to update
     */
    where?: AuctionBidWhereInput
  }

  /**
   * AuctionBid upsert
   */
  export type AuctionBidUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * The filter to search for the AuctionBid to update in case it exists.
     */
    where: AuctionBidWhereUniqueInput
    /**
     * In case the AuctionBid found by the `where` argument doesn't exist, create a new AuctionBid with this data.
     */
    create: XOR<AuctionBidCreateInput, AuctionBidUncheckedCreateInput>
    /**
     * In case the AuctionBid was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuctionBidUpdateInput, AuctionBidUncheckedUpdateInput>
  }

  /**
   * AuctionBid delete
   */
  export type AuctionBidDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
    /**
     * Filter which AuctionBid to delete.
     */
    where: AuctionBidWhereUniqueInput
  }

  /**
   * AuctionBid deleteMany
   */
  export type AuctionBidDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionBids to delete
     */
    where?: AuctionBidWhereInput
  }

  /**
   * AuctionBid without action
   */
  export type AuctionBidDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionBid
     */
    select?: AuctionBidSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionBidInclude<ExtArgs> | null
  }


  /**
   * Model AuctionSettlement
   */

  export type AggregateAuctionSettlement = {
    _count: AuctionSettlementCountAggregateOutputType | null
    _avg: AuctionSettlementAvgAggregateOutputType | null
    _sum: AuctionSettlementSumAggregateOutputType | null
    _min: AuctionSettlementMinAggregateOutputType | null
    _max: AuctionSettlementMaxAggregateOutputType | null
  }

  export type AuctionSettlementAvgAggregateOutputType = {
    id: number | null
    auctionId: number | null
    winningBidAmount: Decimal | null
    orderId: number | null
  }

  export type AuctionSettlementSumAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    winningBidAmount: Decimal | null
    orderId: bigint | null
  }

  export type AuctionSettlementMinAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    winnerId: string | null
    winningBidAmount: Decimal | null
    paymentDeadline: Date | null
    orderId: bigint | null
    status: string | null
    settledAt: Date | null
    createdAt: Date | null
  }

  export type AuctionSettlementMaxAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    winnerId: string | null
    winningBidAmount: Decimal | null
    paymentDeadline: Date | null
    orderId: bigint | null
    status: string | null
    settledAt: Date | null
    createdAt: Date | null
  }

  export type AuctionSettlementCountAggregateOutputType = {
    id: number
    auctionId: number
    winnerId: number
    winningBidAmount: number
    paymentDeadline: number
    orderId: number
    status: number
    settledAt: number
    createdAt: number
    _all: number
  }


  export type AuctionSettlementAvgAggregateInputType = {
    id?: true
    auctionId?: true
    winningBidAmount?: true
    orderId?: true
  }

  export type AuctionSettlementSumAggregateInputType = {
    id?: true
    auctionId?: true
    winningBidAmount?: true
    orderId?: true
  }

  export type AuctionSettlementMinAggregateInputType = {
    id?: true
    auctionId?: true
    winnerId?: true
    winningBidAmount?: true
    paymentDeadline?: true
    orderId?: true
    status?: true
    settledAt?: true
    createdAt?: true
  }

  export type AuctionSettlementMaxAggregateInputType = {
    id?: true
    auctionId?: true
    winnerId?: true
    winningBidAmount?: true
    paymentDeadline?: true
    orderId?: true
    status?: true
    settledAt?: true
    createdAt?: true
  }

  export type AuctionSettlementCountAggregateInputType = {
    id?: true
    auctionId?: true
    winnerId?: true
    winningBidAmount?: true
    paymentDeadline?: true
    orderId?: true
    status?: true
    settledAt?: true
    createdAt?: true
    _all?: true
  }

  export type AuctionSettlementAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionSettlement to aggregate.
     */
    where?: AuctionSettlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionSettlements to fetch.
     */
    orderBy?: AuctionSettlementOrderByWithRelationInput | AuctionSettlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuctionSettlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionSettlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionSettlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuctionSettlements
    **/
    _count?: true | AuctionSettlementCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuctionSettlementAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuctionSettlementSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuctionSettlementMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuctionSettlementMaxAggregateInputType
  }

  export type GetAuctionSettlementAggregateType<T extends AuctionSettlementAggregateArgs> = {
        [P in keyof T & keyof AggregateAuctionSettlement]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuctionSettlement[P]>
      : GetScalarType<T[P], AggregateAuctionSettlement[P]>
  }




  export type AuctionSettlementGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionSettlementWhereInput
    orderBy?: AuctionSettlementOrderByWithAggregationInput | AuctionSettlementOrderByWithAggregationInput[]
    by: AuctionSettlementScalarFieldEnum[] | AuctionSettlementScalarFieldEnum
    having?: AuctionSettlementScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuctionSettlementCountAggregateInputType | true
    _avg?: AuctionSettlementAvgAggregateInputType
    _sum?: AuctionSettlementSumAggregateInputType
    _min?: AuctionSettlementMinAggregateInputType
    _max?: AuctionSettlementMaxAggregateInputType
  }

  export type AuctionSettlementGroupByOutputType = {
    id: bigint
    auctionId: bigint
    winnerId: string
    winningBidAmount: Decimal
    paymentDeadline: Date
    orderId: bigint | null
    status: string
    settledAt: Date
    createdAt: Date
    _count: AuctionSettlementCountAggregateOutputType | null
    _avg: AuctionSettlementAvgAggregateOutputType | null
    _sum: AuctionSettlementSumAggregateOutputType | null
    _min: AuctionSettlementMinAggregateOutputType | null
    _max: AuctionSettlementMaxAggregateOutputType | null
  }

  type GetAuctionSettlementGroupByPayload<T extends AuctionSettlementGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuctionSettlementGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuctionSettlementGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuctionSettlementGroupByOutputType[P]>
            : GetScalarType<T[P], AuctionSettlementGroupByOutputType[P]>
        }
      >
    >


  export type AuctionSettlementSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    winnerId?: boolean
    winningBidAmount?: boolean
    paymentDeadline?: boolean
    orderId?: boolean
    status?: boolean
    settledAt?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionSettlement"]>

  export type AuctionSettlementSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    winnerId?: boolean
    winningBidAmount?: boolean
    paymentDeadline?: boolean
    orderId?: boolean
    status?: boolean
    settledAt?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionSettlement"]>

  export type AuctionSettlementSelectScalar = {
    id?: boolean
    auctionId?: boolean
    winnerId?: boolean
    winningBidAmount?: boolean
    paymentDeadline?: boolean
    orderId?: boolean
    status?: boolean
    settledAt?: boolean
    createdAt?: boolean
  }

  export type AuctionSettlementInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }
  export type AuctionSettlementIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }

  export type $AuctionSettlementPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuctionSettlement"
    objects: {
      auction: Prisma.$AuctionRoomPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      auctionId: bigint
      winnerId: string
      winningBidAmount: Prisma.Decimal
      paymentDeadline: Date
      orderId: bigint | null
      status: string
      settledAt: Date
      createdAt: Date
    }, ExtArgs["result"]["auctionSettlement"]>
    composites: {}
  }

  type AuctionSettlementGetPayload<S extends boolean | null | undefined | AuctionSettlementDefaultArgs> = $Result.GetResult<Prisma.$AuctionSettlementPayload, S>

  type AuctionSettlementCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuctionSettlementFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuctionSettlementCountAggregateInputType | true
    }

  export interface AuctionSettlementDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuctionSettlement'], meta: { name: 'AuctionSettlement' } }
    /**
     * Find zero or one AuctionSettlement that matches the filter.
     * @param {AuctionSettlementFindUniqueArgs} args - Arguments to find a AuctionSettlement
     * @example
     * // Get one AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuctionSettlementFindUniqueArgs>(args: SelectSubset<T, AuctionSettlementFindUniqueArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AuctionSettlement that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuctionSettlementFindUniqueOrThrowArgs} args - Arguments to find a AuctionSettlement
     * @example
     * // Get one AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuctionSettlementFindUniqueOrThrowArgs>(args: SelectSubset<T, AuctionSettlementFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AuctionSettlement that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementFindFirstArgs} args - Arguments to find a AuctionSettlement
     * @example
     * // Get one AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuctionSettlementFindFirstArgs>(args?: SelectSubset<T, AuctionSettlementFindFirstArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AuctionSettlement that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementFindFirstOrThrowArgs} args - Arguments to find a AuctionSettlement
     * @example
     * // Get one AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuctionSettlementFindFirstOrThrowArgs>(args?: SelectSubset<T, AuctionSettlementFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AuctionSettlements that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuctionSettlements
     * const auctionSettlements = await prisma.auctionSettlement.findMany()
     * 
     * // Get first 10 AuctionSettlements
     * const auctionSettlements = await prisma.auctionSettlement.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auctionSettlementWithIdOnly = await prisma.auctionSettlement.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuctionSettlementFindManyArgs>(args?: SelectSubset<T, AuctionSettlementFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AuctionSettlement.
     * @param {AuctionSettlementCreateArgs} args - Arguments to create a AuctionSettlement.
     * @example
     * // Create one AuctionSettlement
     * const AuctionSettlement = await prisma.auctionSettlement.create({
     *   data: {
     *     // ... data to create a AuctionSettlement
     *   }
     * })
     * 
     */
    create<T extends AuctionSettlementCreateArgs>(args: SelectSubset<T, AuctionSettlementCreateArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AuctionSettlements.
     * @param {AuctionSettlementCreateManyArgs} args - Arguments to create many AuctionSettlements.
     * @example
     * // Create many AuctionSettlements
     * const auctionSettlement = await prisma.auctionSettlement.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuctionSettlementCreateManyArgs>(args?: SelectSubset<T, AuctionSettlementCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuctionSettlements and returns the data saved in the database.
     * @param {AuctionSettlementCreateManyAndReturnArgs} args - Arguments to create many AuctionSettlements.
     * @example
     * // Create many AuctionSettlements
     * const auctionSettlement = await prisma.auctionSettlement.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuctionSettlements and only return the `id`
     * const auctionSettlementWithIdOnly = await prisma.auctionSettlement.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuctionSettlementCreateManyAndReturnArgs>(args?: SelectSubset<T, AuctionSettlementCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AuctionSettlement.
     * @param {AuctionSettlementDeleteArgs} args - Arguments to delete one AuctionSettlement.
     * @example
     * // Delete one AuctionSettlement
     * const AuctionSettlement = await prisma.auctionSettlement.delete({
     *   where: {
     *     // ... filter to delete one AuctionSettlement
     *   }
     * })
     * 
     */
    delete<T extends AuctionSettlementDeleteArgs>(args: SelectSubset<T, AuctionSettlementDeleteArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AuctionSettlement.
     * @param {AuctionSettlementUpdateArgs} args - Arguments to update one AuctionSettlement.
     * @example
     * // Update one AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuctionSettlementUpdateArgs>(args: SelectSubset<T, AuctionSettlementUpdateArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AuctionSettlements.
     * @param {AuctionSettlementDeleteManyArgs} args - Arguments to filter AuctionSettlements to delete.
     * @example
     * // Delete a few AuctionSettlements
     * const { count } = await prisma.auctionSettlement.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuctionSettlementDeleteManyArgs>(args?: SelectSubset<T, AuctionSettlementDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuctionSettlements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuctionSettlements
     * const auctionSettlement = await prisma.auctionSettlement.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuctionSettlementUpdateManyArgs>(args: SelectSubset<T, AuctionSettlementUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuctionSettlement.
     * @param {AuctionSettlementUpsertArgs} args - Arguments to update or create a AuctionSettlement.
     * @example
     * // Update or create a AuctionSettlement
     * const auctionSettlement = await prisma.auctionSettlement.upsert({
     *   create: {
     *     // ... data to create a AuctionSettlement
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuctionSettlement we want to update
     *   }
     * })
     */
    upsert<T extends AuctionSettlementUpsertArgs>(args: SelectSubset<T, AuctionSettlementUpsertArgs<ExtArgs>>): Prisma__AuctionSettlementClient<$Result.GetResult<Prisma.$AuctionSettlementPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AuctionSettlements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementCountArgs} args - Arguments to filter AuctionSettlements to count.
     * @example
     * // Count the number of AuctionSettlements
     * const count = await prisma.auctionSettlement.count({
     *   where: {
     *     // ... the filter for the AuctionSettlements we want to count
     *   }
     * })
    **/
    count<T extends AuctionSettlementCountArgs>(
      args?: Subset<T, AuctionSettlementCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuctionSettlementCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuctionSettlement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuctionSettlementAggregateArgs>(args: Subset<T, AuctionSettlementAggregateArgs>): Prisma.PrismaPromise<GetAuctionSettlementAggregateType<T>>

    /**
     * Group by AuctionSettlement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionSettlementGroupByArgs} args - Group by arguments.
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
      T extends AuctionSettlementGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuctionSettlementGroupByArgs['orderBy'] }
        : { orderBy?: AuctionSettlementGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuctionSettlementGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuctionSettlementGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuctionSettlement model
   */
  readonly fields: AuctionSettlementFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuctionSettlement.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuctionSettlementClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    auction<T extends AuctionRoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoomDefaultArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the AuctionSettlement model
   */ 
  interface AuctionSettlementFieldRefs {
    readonly id: FieldRef<"AuctionSettlement", 'BigInt'>
    readonly auctionId: FieldRef<"AuctionSettlement", 'BigInt'>
    readonly winnerId: FieldRef<"AuctionSettlement", 'String'>
    readonly winningBidAmount: FieldRef<"AuctionSettlement", 'Decimal'>
    readonly paymentDeadline: FieldRef<"AuctionSettlement", 'DateTime'>
    readonly orderId: FieldRef<"AuctionSettlement", 'BigInt'>
    readonly status: FieldRef<"AuctionSettlement", 'String'>
    readonly settledAt: FieldRef<"AuctionSettlement", 'DateTime'>
    readonly createdAt: FieldRef<"AuctionSettlement", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuctionSettlement findUnique
   */
  export type AuctionSettlementFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter, which AuctionSettlement to fetch.
     */
    where: AuctionSettlementWhereUniqueInput
  }

  /**
   * AuctionSettlement findUniqueOrThrow
   */
  export type AuctionSettlementFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter, which AuctionSettlement to fetch.
     */
    where: AuctionSettlementWhereUniqueInput
  }

  /**
   * AuctionSettlement findFirst
   */
  export type AuctionSettlementFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter, which AuctionSettlement to fetch.
     */
    where?: AuctionSettlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionSettlements to fetch.
     */
    orderBy?: AuctionSettlementOrderByWithRelationInput | AuctionSettlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionSettlements.
     */
    cursor?: AuctionSettlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionSettlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionSettlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionSettlements.
     */
    distinct?: AuctionSettlementScalarFieldEnum | AuctionSettlementScalarFieldEnum[]
  }

  /**
   * AuctionSettlement findFirstOrThrow
   */
  export type AuctionSettlementFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter, which AuctionSettlement to fetch.
     */
    where?: AuctionSettlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionSettlements to fetch.
     */
    orderBy?: AuctionSettlementOrderByWithRelationInput | AuctionSettlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionSettlements.
     */
    cursor?: AuctionSettlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionSettlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionSettlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionSettlements.
     */
    distinct?: AuctionSettlementScalarFieldEnum | AuctionSettlementScalarFieldEnum[]
  }

  /**
   * AuctionSettlement findMany
   */
  export type AuctionSettlementFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter, which AuctionSettlements to fetch.
     */
    where?: AuctionSettlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionSettlements to fetch.
     */
    orderBy?: AuctionSettlementOrderByWithRelationInput | AuctionSettlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuctionSettlements.
     */
    cursor?: AuctionSettlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionSettlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionSettlements.
     */
    skip?: number
    distinct?: AuctionSettlementScalarFieldEnum | AuctionSettlementScalarFieldEnum[]
  }

  /**
   * AuctionSettlement create
   */
  export type AuctionSettlementCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * The data needed to create a AuctionSettlement.
     */
    data: XOR<AuctionSettlementCreateInput, AuctionSettlementUncheckedCreateInput>
  }

  /**
   * AuctionSettlement createMany
   */
  export type AuctionSettlementCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuctionSettlements.
     */
    data: AuctionSettlementCreateManyInput | AuctionSettlementCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuctionSettlement createManyAndReturn
   */
  export type AuctionSettlementCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AuctionSettlements.
     */
    data: AuctionSettlementCreateManyInput | AuctionSettlementCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuctionSettlement update
   */
  export type AuctionSettlementUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * The data needed to update a AuctionSettlement.
     */
    data: XOR<AuctionSettlementUpdateInput, AuctionSettlementUncheckedUpdateInput>
    /**
     * Choose, which AuctionSettlement to update.
     */
    where: AuctionSettlementWhereUniqueInput
  }

  /**
   * AuctionSettlement updateMany
   */
  export type AuctionSettlementUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuctionSettlements.
     */
    data: XOR<AuctionSettlementUpdateManyMutationInput, AuctionSettlementUncheckedUpdateManyInput>
    /**
     * Filter which AuctionSettlements to update
     */
    where?: AuctionSettlementWhereInput
  }

  /**
   * AuctionSettlement upsert
   */
  export type AuctionSettlementUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * The filter to search for the AuctionSettlement to update in case it exists.
     */
    where: AuctionSettlementWhereUniqueInput
    /**
     * In case the AuctionSettlement found by the `where` argument doesn't exist, create a new AuctionSettlement with this data.
     */
    create: XOR<AuctionSettlementCreateInput, AuctionSettlementUncheckedCreateInput>
    /**
     * In case the AuctionSettlement was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuctionSettlementUpdateInput, AuctionSettlementUncheckedUpdateInput>
  }

  /**
   * AuctionSettlement delete
   */
  export type AuctionSettlementDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
    /**
     * Filter which AuctionSettlement to delete.
     */
    where: AuctionSettlementWhereUniqueInput
  }

  /**
   * AuctionSettlement deleteMany
   */
  export type AuctionSettlementDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionSettlements to delete
     */
    where?: AuctionSettlementWhereInput
  }

  /**
   * AuctionSettlement without action
   */
  export type AuctionSettlementDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionSettlement
     */
    select?: AuctionSettlementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionSettlementInclude<ExtArgs> | null
  }


  /**
   * Model AuctionExtension
   */

  export type AggregateAuctionExtension = {
    _count: AuctionExtensionCountAggregateOutputType | null
    _avg: AuctionExtensionAvgAggregateOutputType | null
    _sum: AuctionExtensionSumAggregateOutputType | null
    _min: AuctionExtensionMinAggregateOutputType | null
    _max: AuctionExtensionMaxAggregateOutputType | null
  }

  export type AuctionExtensionAvgAggregateOutputType = {
    id: number | null
    auctionId: number | null
    extendedMinutes: number | null
  }

  export type AuctionExtensionSumAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    extendedMinutes: number | null
  }

  export type AuctionExtensionMinAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    extendedMinutes: number | null
    previousEndTime: Date | null
    newEndTime: Date | null
    reason: string | null
    createdAt: Date | null
  }

  export type AuctionExtensionMaxAggregateOutputType = {
    id: bigint | null
    auctionId: bigint | null
    extendedMinutes: number | null
    previousEndTime: Date | null
    newEndTime: Date | null
    reason: string | null
    createdAt: Date | null
  }

  export type AuctionExtensionCountAggregateOutputType = {
    id: number
    auctionId: number
    extendedMinutes: number
    previousEndTime: number
    newEndTime: number
    reason: number
    createdAt: number
    _all: number
  }


  export type AuctionExtensionAvgAggregateInputType = {
    id?: true
    auctionId?: true
    extendedMinutes?: true
  }

  export type AuctionExtensionSumAggregateInputType = {
    id?: true
    auctionId?: true
    extendedMinutes?: true
  }

  export type AuctionExtensionMinAggregateInputType = {
    id?: true
    auctionId?: true
    extendedMinutes?: true
    previousEndTime?: true
    newEndTime?: true
    reason?: true
    createdAt?: true
  }

  export type AuctionExtensionMaxAggregateInputType = {
    id?: true
    auctionId?: true
    extendedMinutes?: true
    previousEndTime?: true
    newEndTime?: true
    reason?: true
    createdAt?: true
  }

  export type AuctionExtensionCountAggregateInputType = {
    id?: true
    auctionId?: true
    extendedMinutes?: true
    previousEndTime?: true
    newEndTime?: true
    reason?: true
    createdAt?: true
    _all?: true
  }

  export type AuctionExtensionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionExtension to aggregate.
     */
    where?: AuctionExtensionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionExtensions to fetch.
     */
    orderBy?: AuctionExtensionOrderByWithRelationInput | AuctionExtensionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuctionExtensionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionExtensions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionExtensions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuctionExtensions
    **/
    _count?: true | AuctionExtensionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuctionExtensionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuctionExtensionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuctionExtensionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuctionExtensionMaxAggregateInputType
  }

  export type GetAuctionExtensionAggregateType<T extends AuctionExtensionAggregateArgs> = {
        [P in keyof T & keyof AggregateAuctionExtension]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuctionExtension[P]>
      : GetScalarType<T[P], AggregateAuctionExtension[P]>
  }




  export type AuctionExtensionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuctionExtensionWhereInput
    orderBy?: AuctionExtensionOrderByWithAggregationInput | AuctionExtensionOrderByWithAggregationInput[]
    by: AuctionExtensionScalarFieldEnum[] | AuctionExtensionScalarFieldEnum
    having?: AuctionExtensionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuctionExtensionCountAggregateInputType | true
    _avg?: AuctionExtensionAvgAggregateInputType
    _sum?: AuctionExtensionSumAggregateInputType
    _min?: AuctionExtensionMinAggregateInputType
    _max?: AuctionExtensionMaxAggregateInputType
  }

  export type AuctionExtensionGroupByOutputType = {
    id: bigint
    auctionId: bigint
    extendedMinutes: number
    previousEndTime: Date
    newEndTime: Date
    reason: string
    createdAt: Date
    _count: AuctionExtensionCountAggregateOutputType | null
    _avg: AuctionExtensionAvgAggregateOutputType | null
    _sum: AuctionExtensionSumAggregateOutputType | null
    _min: AuctionExtensionMinAggregateOutputType | null
    _max: AuctionExtensionMaxAggregateOutputType | null
  }

  type GetAuctionExtensionGroupByPayload<T extends AuctionExtensionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuctionExtensionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuctionExtensionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuctionExtensionGroupByOutputType[P]>
            : GetScalarType<T[P], AuctionExtensionGroupByOutputType[P]>
        }
      >
    >


  export type AuctionExtensionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    extendedMinutes?: boolean
    previousEndTime?: boolean
    newEndTime?: boolean
    reason?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionExtension"]>

  export type AuctionExtensionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auctionId?: boolean
    extendedMinutes?: boolean
    previousEndTime?: boolean
    newEndTime?: boolean
    reason?: boolean
    createdAt?: boolean
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auctionExtension"]>

  export type AuctionExtensionSelectScalar = {
    id?: boolean
    auctionId?: boolean
    extendedMinutes?: boolean
    previousEndTime?: boolean
    newEndTime?: boolean
    reason?: boolean
    createdAt?: boolean
  }

  export type AuctionExtensionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }
  export type AuctionExtensionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auction?: boolean | AuctionRoomDefaultArgs<ExtArgs>
  }

  export type $AuctionExtensionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuctionExtension"
    objects: {
      auction: Prisma.$AuctionRoomPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      auctionId: bigint
      extendedMinutes: number
      previousEndTime: Date
      newEndTime: Date
      reason: string
      createdAt: Date
    }, ExtArgs["result"]["auctionExtension"]>
    composites: {}
  }

  type AuctionExtensionGetPayload<S extends boolean | null | undefined | AuctionExtensionDefaultArgs> = $Result.GetResult<Prisma.$AuctionExtensionPayload, S>

  type AuctionExtensionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuctionExtensionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuctionExtensionCountAggregateInputType | true
    }

  export interface AuctionExtensionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuctionExtension'], meta: { name: 'AuctionExtension' } }
    /**
     * Find zero or one AuctionExtension that matches the filter.
     * @param {AuctionExtensionFindUniqueArgs} args - Arguments to find a AuctionExtension
     * @example
     * // Get one AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuctionExtensionFindUniqueArgs>(args: SelectSubset<T, AuctionExtensionFindUniqueArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AuctionExtension that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuctionExtensionFindUniqueOrThrowArgs} args - Arguments to find a AuctionExtension
     * @example
     * // Get one AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuctionExtensionFindUniqueOrThrowArgs>(args: SelectSubset<T, AuctionExtensionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AuctionExtension that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionFindFirstArgs} args - Arguments to find a AuctionExtension
     * @example
     * // Get one AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuctionExtensionFindFirstArgs>(args?: SelectSubset<T, AuctionExtensionFindFirstArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AuctionExtension that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionFindFirstOrThrowArgs} args - Arguments to find a AuctionExtension
     * @example
     * // Get one AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuctionExtensionFindFirstOrThrowArgs>(args?: SelectSubset<T, AuctionExtensionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AuctionExtensions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuctionExtensions
     * const auctionExtensions = await prisma.auctionExtension.findMany()
     * 
     * // Get first 10 AuctionExtensions
     * const auctionExtensions = await prisma.auctionExtension.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auctionExtensionWithIdOnly = await prisma.auctionExtension.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuctionExtensionFindManyArgs>(args?: SelectSubset<T, AuctionExtensionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AuctionExtension.
     * @param {AuctionExtensionCreateArgs} args - Arguments to create a AuctionExtension.
     * @example
     * // Create one AuctionExtension
     * const AuctionExtension = await prisma.auctionExtension.create({
     *   data: {
     *     // ... data to create a AuctionExtension
     *   }
     * })
     * 
     */
    create<T extends AuctionExtensionCreateArgs>(args: SelectSubset<T, AuctionExtensionCreateArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AuctionExtensions.
     * @param {AuctionExtensionCreateManyArgs} args - Arguments to create many AuctionExtensions.
     * @example
     * // Create many AuctionExtensions
     * const auctionExtension = await prisma.auctionExtension.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuctionExtensionCreateManyArgs>(args?: SelectSubset<T, AuctionExtensionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuctionExtensions and returns the data saved in the database.
     * @param {AuctionExtensionCreateManyAndReturnArgs} args - Arguments to create many AuctionExtensions.
     * @example
     * // Create many AuctionExtensions
     * const auctionExtension = await prisma.auctionExtension.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuctionExtensions and only return the `id`
     * const auctionExtensionWithIdOnly = await prisma.auctionExtension.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuctionExtensionCreateManyAndReturnArgs>(args?: SelectSubset<T, AuctionExtensionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AuctionExtension.
     * @param {AuctionExtensionDeleteArgs} args - Arguments to delete one AuctionExtension.
     * @example
     * // Delete one AuctionExtension
     * const AuctionExtension = await prisma.auctionExtension.delete({
     *   where: {
     *     // ... filter to delete one AuctionExtension
     *   }
     * })
     * 
     */
    delete<T extends AuctionExtensionDeleteArgs>(args: SelectSubset<T, AuctionExtensionDeleteArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AuctionExtension.
     * @param {AuctionExtensionUpdateArgs} args - Arguments to update one AuctionExtension.
     * @example
     * // Update one AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuctionExtensionUpdateArgs>(args: SelectSubset<T, AuctionExtensionUpdateArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AuctionExtensions.
     * @param {AuctionExtensionDeleteManyArgs} args - Arguments to filter AuctionExtensions to delete.
     * @example
     * // Delete a few AuctionExtensions
     * const { count } = await prisma.auctionExtension.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuctionExtensionDeleteManyArgs>(args?: SelectSubset<T, AuctionExtensionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuctionExtensions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuctionExtensions
     * const auctionExtension = await prisma.auctionExtension.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuctionExtensionUpdateManyArgs>(args: SelectSubset<T, AuctionExtensionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuctionExtension.
     * @param {AuctionExtensionUpsertArgs} args - Arguments to update or create a AuctionExtension.
     * @example
     * // Update or create a AuctionExtension
     * const auctionExtension = await prisma.auctionExtension.upsert({
     *   create: {
     *     // ... data to create a AuctionExtension
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuctionExtension we want to update
     *   }
     * })
     */
    upsert<T extends AuctionExtensionUpsertArgs>(args: SelectSubset<T, AuctionExtensionUpsertArgs<ExtArgs>>): Prisma__AuctionExtensionClient<$Result.GetResult<Prisma.$AuctionExtensionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AuctionExtensions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionCountArgs} args - Arguments to filter AuctionExtensions to count.
     * @example
     * // Count the number of AuctionExtensions
     * const count = await prisma.auctionExtension.count({
     *   where: {
     *     // ... the filter for the AuctionExtensions we want to count
     *   }
     * })
    **/
    count<T extends AuctionExtensionCountArgs>(
      args?: Subset<T, AuctionExtensionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuctionExtensionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuctionExtension.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuctionExtensionAggregateArgs>(args: Subset<T, AuctionExtensionAggregateArgs>): Prisma.PrismaPromise<GetAuctionExtensionAggregateType<T>>

    /**
     * Group by AuctionExtension.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuctionExtensionGroupByArgs} args - Group by arguments.
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
      T extends AuctionExtensionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuctionExtensionGroupByArgs['orderBy'] }
        : { orderBy?: AuctionExtensionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuctionExtensionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuctionExtensionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuctionExtension model
   */
  readonly fields: AuctionExtensionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuctionExtension.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuctionExtensionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    auction<T extends AuctionRoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AuctionRoomDefaultArgs<ExtArgs>>): Prisma__AuctionRoomClient<$Result.GetResult<Prisma.$AuctionRoomPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the AuctionExtension model
   */ 
  interface AuctionExtensionFieldRefs {
    readonly id: FieldRef<"AuctionExtension", 'BigInt'>
    readonly auctionId: FieldRef<"AuctionExtension", 'BigInt'>
    readonly extendedMinutes: FieldRef<"AuctionExtension", 'Int'>
    readonly previousEndTime: FieldRef<"AuctionExtension", 'DateTime'>
    readonly newEndTime: FieldRef<"AuctionExtension", 'DateTime'>
    readonly reason: FieldRef<"AuctionExtension", 'String'>
    readonly createdAt: FieldRef<"AuctionExtension", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuctionExtension findUnique
   */
  export type AuctionExtensionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter, which AuctionExtension to fetch.
     */
    where: AuctionExtensionWhereUniqueInput
  }

  /**
   * AuctionExtension findUniqueOrThrow
   */
  export type AuctionExtensionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter, which AuctionExtension to fetch.
     */
    where: AuctionExtensionWhereUniqueInput
  }

  /**
   * AuctionExtension findFirst
   */
  export type AuctionExtensionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter, which AuctionExtension to fetch.
     */
    where?: AuctionExtensionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionExtensions to fetch.
     */
    orderBy?: AuctionExtensionOrderByWithRelationInput | AuctionExtensionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionExtensions.
     */
    cursor?: AuctionExtensionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionExtensions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionExtensions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionExtensions.
     */
    distinct?: AuctionExtensionScalarFieldEnum | AuctionExtensionScalarFieldEnum[]
  }

  /**
   * AuctionExtension findFirstOrThrow
   */
  export type AuctionExtensionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter, which AuctionExtension to fetch.
     */
    where?: AuctionExtensionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionExtensions to fetch.
     */
    orderBy?: AuctionExtensionOrderByWithRelationInput | AuctionExtensionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuctionExtensions.
     */
    cursor?: AuctionExtensionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionExtensions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionExtensions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuctionExtensions.
     */
    distinct?: AuctionExtensionScalarFieldEnum | AuctionExtensionScalarFieldEnum[]
  }

  /**
   * AuctionExtension findMany
   */
  export type AuctionExtensionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter, which AuctionExtensions to fetch.
     */
    where?: AuctionExtensionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuctionExtensions to fetch.
     */
    orderBy?: AuctionExtensionOrderByWithRelationInput | AuctionExtensionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuctionExtensions.
     */
    cursor?: AuctionExtensionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuctionExtensions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuctionExtensions.
     */
    skip?: number
    distinct?: AuctionExtensionScalarFieldEnum | AuctionExtensionScalarFieldEnum[]
  }

  /**
   * AuctionExtension create
   */
  export type AuctionExtensionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * The data needed to create a AuctionExtension.
     */
    data: XOR<AuctionExtensionCreateInput, AuctionExtensionUncheckedCreateInput>
  }

  /**
   * AuctionExtension createMany
   */
  export type AuctionExtensionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuctionExtensions.
     */
    data: AuctionExtensionCreateManyInput | AuctionExtensionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuctionExtension createManyAndReturn
   */
  export type AuctionExtensionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AuctionExtensions.
     */
    data: AuctionExtensionCreateManyInput | AuctionExtensionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuctionExtension update
   */
  export type AuctionExtensionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * The data needed to update a AuctionExtension.
     */
    data: XOR<AuctionExtensionUpdateInput, AuctionExtensionUncheckedUpdateInput>
    /**
     * Choose, which AuctionExtension to update.
     */
    where: AuctionExtensionWhereUniqueInput
  }

  /**
   * AuctionExtension updateMany
   */
  export type AuctionExtensionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuctionExtensions.
     */
    data: XOR<AuctionExtensionUpdateManyMutationInput, AuctionExtensionUncheckedUpdateManyInput>
    /**
     * Filter which AuctionExtensions to update
     */
    where?: AuctionExtensionWhereInput
  }

  /**
   * AuctionExtension upsert
   */
  export type AuctionExtensionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * The filter to search for the AuctionExtension to update in case it exists.
     */
    where: AuctionExtensionWhereUniqueInput
    /**
     * In case the AuctionExtension found by the `where` argument doesn't exist, create a new AuctionExtension with this data.
     */
    create: XOR<AuctionExtensionCreateInput, AuctionExtensionUncheckedCreateInput>
    /**
     * In case the AuctionExtension was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuctionExtensionUpdateInput, AuctionExtensionUncheckedUpdateInput>
  }

  /**
   * AuctionExtension delete
   */
  export type AuctionExtensionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
    /**
     * Filter which AuctionExtension to delete.
     */
    where: AuctionExtensionWhereUniqueInput
  }

  /**
   * AuctionExtension deleteMany
   */
  export type AuctionExtensionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuctionExtensions to delete
     */
    where?: AuctionExtensionWhereInput
  }

  /**
   * AuctionExtension without action
   */
  export type AuctionExtensionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuctionExtension
     */
    select?: AuctionExtensionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuctionExtensionInclude<ExtArgs> | null
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


  export const AuctionRoomScalarFieldEnum: {
    id: 'id',
    productId: 'productId',
    sellerId: 'sellerId',
    title: 'title',
    startPrice: 'startPrice',
    currentPrice: 'currentPrice',
    bidStep: 'bidStep',
    buyNowPrice: 'buyNowPrice',
    startTime: 'startTime',
    endTime: 'endTime',
    actualEndTime: 'actualEndTime',
    status: 'status',
    winnerId: 'winnerId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AuctionRoomScalarFieldEnum = (typeof AuctionRoomScalarFieldEnum)[keyof typeof AuctionRoomScalarFieldEnum]


  export const AuctionBidScalarFieldEnum: {
    id: 'id',
    auctionId: 'auctionId',
    bidderId: 'bidderId',
    bidAmount: 'bidAmount',
    bidTime: 'bidTime',
    isWinning: 'isWinning',
    createdAt: 'createdAt'
  };

  export type AuctionBidScalarFieldEnum = (typeof AuctionBidScalarFieldEnum)[keyof typeof AuctionBidScalarFieldEnum]


  export const AuctionSettlementScalarFieldEnum: {
    id: 'id',
    auctionId: 'auctionId',
    winnerId: 'winnerId',
    winningBidAmount: 'winningBidAmount',
    paymentDeadline: 'paymentDeadline',
    orderId: 'orderId',
    status: 'status',
    settledAt: 'settledAt',
    createdAt: 'createdAt'
  };

  export type AuctionSettlementScalarFieldEnum = (typeof AuctionSettlementScalarFieldEnum)[keyof typeof AuctionSettlementScalarFieldEnum]


  export const AuctionExtensionScalarFieldEnum: {
    id: 'id',
    auctionId: 'auctionId',
    extendedMinutes: 'extendedMinutes',
    previousEndTime: 'previousEndTime',
    newEndTime: 'newEndTime',
    reason: 'reason',
    createdAt: 'createdAt'
  };

  export type AuctionExtensionScalarFieldEnum = (typeof AuctionExtensionScalarFieldEnum)[keyof typeof AuctionExtensionScalarFieldEnum]


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
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


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


  export type AuctionRoomWhereInput = {
    AND?: AuctionRoomWhereInput | AuctionRoomWhereInput[]
    OR?: AuctionRoomWhereInput[]
    NOT?: AuctionRoomWhereInput | AuctionRoomWhereInput[]
    id?: BigIntFilter<"AuctionRoom"> | bigint | number
    productId?: BigIntFilter<"AuctionRoom"> | bigint | number
    sellerId?: StringFilter<"AuctionRoom"> | string
    title?: StringFilter<"AuctionRoom"> | string
    startPrice?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    buyNowPrice?: DecimalNullableFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFilter<"AuctionRoom"> | Date | string
    endTime?: DateTimeFilter<"AuctionRoom"> | Date | string
    actualEndTime?: DateTimeNullableFilter<"AuctionRoom"> | Date | string | null
    status?: StringFilter<"AuctionRoom"> | string
    winnerId?: StringNullableFilter<"AuctionRoom"> | string | null
    createdAt?: DateTimeFilter<"AuctionRoom"> | Date | string
    updatedAt?: DateTimeFilter<"AuctionRoom"> | Date | string
    bids?: AuctionBidListRelationFilter
    settlement?: XOR<AuctionSettlementNullableRelationFilter, AuctionSettlementWhereInput> | null
    extensions?: AuctionExtensionListRelationFilter
  }

  export type AuctionRoomOrderByWithRelationInput = {
    id?: SortOrder
    productId?: SortOrder
    sellerId?: SortOrder
    title?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrderInput | SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    actualEndTime?: SortOrderInput | SortOrder
    status?: SortOrder
    winnerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    bids?: AuctionBidOrderByRelationAggregateInput
    settlement?: AuctionSettlementOrderByWithRelationInput
    extensions?: AuctionExtensionOrderByRelationAggregateInput
  }

  export type AuctionRoomWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: AuctionRoomWhereInput | AuctionRoomWhereInput[]
    OR?: AuctionRoomWhereInput[]
    NOT?: AuctionRoomWhereInput | AuctionRoomWhereInput[]
    productId?: BigIntFilter<"AuctionRoom"> | bigint | number
    sellerId?: StringFilter<"AuctionRoom"> | string
    title?: StringFilter<"AuctionRoom"> | string
    startPrice?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    buyNowPrice?: DecimalNullableFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFilter<"AuctionRoom"> | Date | string
    endTime?: DateTimeFilter<"AuctionRoom"> | Date | string
    actualEndTime?: DateTimeNullableFilter<"AuctionRoom"> | Date | string | null
    status?: StringFilter<"AuctionRoom"> | string
    winnerId?: StringNullableFilter<"AuctionRoom"> | string | null
    createdAt?: DateTimeFilter<"AuctionRoom"> | Date | string
    updatedAt?: DateTimeFilter<"AuctionRoom"> | Date | string
    bids?: AuctionBidListRelationFilter
    settlement?: XOR<AuctionSettlementNullableRelationFilter, AuctionSettlementWhereInput> | null
    extensions?: AuctionExtensionListRelationFilter
  }, "id">

  export type AuctionRoomOrderByWithAggregationInput = {
    id?: SortOrder
    productId?: SortOrder
    sellerId?: SortOrder
    title?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrderInput | SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    actualEndTime?: SortOrderInput | SortOrder
    status?: SortOrder
    winnerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AuctionRoomCountOrderByAggregateInput
    _avg?: AuctionRoomAvgOrderByAggregateInput
    _max?: AuctionRoomMaxOrderByAggregateInput
    _min?: AuctionRoomMinOrderByAggregateInput
    _sum?: AuctionRoomSumOrderByAggregateInput
  }

  export type AuctionRoomScalarWhereWithAggregatesInput = {
    AND?: AuctionRoomScalarWhereWithAggregatesInput | AuctionRoomScalarWhereWithAggregatesInput[]
    OR?: AuctionRoomScalarWhereWithAggregatesInput[]
    NOT?: AuctionRoomScalarWhereWithAggregatesInput | AuctionRoomScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"AuctionRoom"> | bigint | number
    productId?: BigIntWithAggregatesFilter<"AuctionRoom"> | bigint | number
    sellerId?: StringWithAggregatesFilter<"AuctionRoom"> | string
    title?: StringWithAggregatesFilter<"AuctionRoom"> | string
    startPrice?: DecimalWithAggregatesFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalWithAggregatesFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalWithAggregatesFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string
    buyNowPrice?: DecimalNullableWithAggregatesFilter<"AuctionRoom"> | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeWithAggregatesFilter<"AuctionRoom"> | Date | string
    endTime?: DateTimeWithAggregatesFilter<"AuctionRoom"> | Date | string
    actualEndTime?: DateTimeNullableWithAggregatesFilter<"AuctionRoom"> | Date | string | null
    status?: StringWithAggregatesFilter<"AuctionRoom"> | string
    winnerId?: StringNullableWithAggregatesFilter<"AuctionRoom"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AuctionRoom"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AuctionRoom"> | Date | string
  }

  export type AuctionBidWhereInput = {
    AND?: AuctionBidWhereInput | AuctionBidWhereInput[]
    OR?: AuctionBidWhereInput[]
    NOT?: AuctionBidWhereInput | AuctionBidWhereInput[]
    id?: BigIntFilter<"AuctionBid"> | bigint | number
    auctionId?: BigIntFilter<"AuctionBid"> | bigint | number
    bidderId?: StringFilter<"AuctionBid"> | string
    bidAmount?: DecimalFilter<"AuctionBid"> | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFilter<"AuctionBid"> | Date | string
    isWinning?: BoolFilter<"AuctionBid"> | boolean
    createdAt?: DateTimeFilter<"AuctionBid"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }

  export type AuctionBidOrderByWithRelationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidderId?: SortOrder
    bidAmount?: SortOrder
    bidTime?: SortOrder
    isWinning?: SortOrder
    createdAt?: SortOrder
    auction?: AuctionRoomOrderByWithRelationInput
  }

  export type AuctionBidWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: AuctionBidWhereInput | AuctionBidWhereInput[]
    OR?: AuctionBidWhereInput[]
    NOT?: AuctionBidWhereInput | AuctionBidWhereInput[]
    auctionId?: BigIntFilter<"AuctionBid"> | bigint | number
    bidderId?: StringFilter<"AuctionBid"> | string
    bidAmount?: DecimalFilter<"AuctionBid"> | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFilter<"AuctionBid"> | Date | string
    isWinning?: BoolFilter<"AuctionBid"> | boolean
    createdAt?: DateTimeFilter<"AuctionBid"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }, "id">

  export type AuctionBidOrderByWithAggregationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidderId?: SortOrder
    bidAmount?: SortOrder
    bidTime?: SortOrder
    isWinning?: SortOrder
    createdAt?: SortOrder
    _count?: AuctionBidCountOrderByAggregateInput
    _avg?: AuctionBidAvgOrderByAggregateInput
    _max?: AuctionBidMaxOrderByAggregateInput
    _min?: AuctionBidMinOrderByAggregateInput
    _sum?: AuctionBidSumOrderByAggregateInput
  }

  export type AuctionBidScalarWhereWithAggregatesInput = {
    AND?: AuctionBidScalarWhereWithAggregatesInput | AuctionBidScalarWhereWithAggregatesInput[]
    OR?: AuctionBidScalarWhereWithAggregatesInput[]
    NOT?: AuctionBidScalarWhereWithAggregatesInput | AuctionBidScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"AuctionBid"> | bigint | number
    auctionId?: BigIntWithAggregatesFilter<"AuctionBid"> | bigint | number
    bidderId?: StringWithAggregatesFilter<"AuctionBid"> | string
    bidAmount?: DecimalWithAggregatesFilter<"AuctionBid"> | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeWithAggregatesFilter<"AuctionBid"> | Date | string
    isWinning?: BoolWithAggregatesFilter<"AuctionBid"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"AuctionBid"> | Date | string
  }

  export type AuctionSettlementWhereInput = {
    AND?: AuctionSettlementWhereInput | AuctionSettlementWhereInput[]
    OR?: AuctionSettlementWhereInput[]
    NOT?: AuctionSettlementWhereInput | AuctionSettlementWhereInput[]
    id?: BigIntFilter<"AuctionSettlement"> | bigint | number
    auctionId?: BigIntFilter<"AuctionSettlement"> | bigint | number
    winnerId?: StringFilter<"AuctionSettlement"> | string
    winningBidAmount?: DecimalFilter<"AuctionSettlement"> | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFilter<"AuctionSettlement"> | Date | string
    orderId?: BigIntNullableFilter<"AuctionSettlement"> | bigint | number | null
    status?: StringFilter<"AuctionSettlement"> | string
    settledAt?: DateTimeFilter<"AuctionSettlement"> | Date | string
    createdAt?: DateTimeFilter<"AuctionSettlement"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }

  export type AuctionSettlementOrderByWithRelationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winnerId?: SortOrder
    winningBidAmount?: SortOrder
    paymentDeadline?: SortOrder
    orderId?: SortOrderInput | SortOrder
    status?: SortOrder
    settledAt?: SortOrder
    createdAt?: SortOrder
    auction?: AuctionRoomOrderByWithRelationInput
  }

  export type AuctionSettlementWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    auctionId?: bigint | number
    AND?: AuctionSettlementWhereInput | AuctionSettlementWhereInput[]
    OR?: AuctionSettlementWhereInput[]
    NOT?: AuctionSettlementWhereInput | AuctionSettlementWhereInput[]
    winnerId?: StringFilter<"AuctionSettlement"> | string
    winningBidAmount?: DecimalFilter<"AuctionSettlement"> | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFilter<"AuctionSettlement"> | Date | string
    orderId?: BigIntNullableFilter<"AuctionSettlement"> | bigint | number | null
    status?: StringFilter<"AuctionSettlement"> | string
    settledAt?: DateTimeFilter<"AuctionSettlement"> | Date | string
    createdAt?: DateTimeFilter<"AuctionSettlement"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }, "id" | "auctionId">

  export type AuctionSettlementOrderByWithAggregationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winnerId?: SortOrder
    winningBidAmount?: SortOrder
    paymentDeadline?: SortOrder
    orderId?: SortOrderInput | SortOrder
    status?: SortOrder
    settledAt?: SortOrder
    createdAt?: SortOrder
    _count?: AuctionSettlementCountOrderByAggregateInput
    _avg?: AuctionSettlementAvgOrderByAggregateInput
    _max?: AuctionSettlementMaxOrderByAggregateInput
    _min?: AuctionSettlementMinOrderByAggregateInput
    _sum?: AuctionSettlementSumOrderByAggregateInput
  }

  export type AuctionSettlementScalarWhereWithAggregatesInput = {
    AND?: AuctionSettlementScalarWhereWithAggregatesInput | AuctionSettlementScalarWhereWithAggregatesInput[]
    OR?: AuctionSettlementScalarWhereWithAggregatesInput[]
    NOT?: AuctionSettlementScalarWhereWithAggregatesInput | AuctionSettlementScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"AuctionSettlement"> | bigint | number
    auctionId?: BigIntWithAggregatesFilter<"AuctionSettlement"> | bigint | number
    winnerId?: StringWithAggregatesFilter<"AuctionSettlement"> | string
    winningBidAmount?: DecimalWithAggregatesFilter<"AuctionSettlement"> | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeWithAggregatesFilter<"AuctionSettlement"> | Date | string
    orderId?: BigIntNullableWithAggregatesFilter<"AuctionSettlement"> | bigint | number | null
    status?: StringWithAggregatesFilter<"AuctionSettlement"> | string
    settledAt?: DateTimeWithAggregatesFilter<"AuctionSettlement"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"AuctionSettlement"> | Date | string
  }

  export type AuctionExtensionWhereInput = {
    AND?: AuctionExtensionWhereInput | AuctionExtensionWhereInput[]
    OR?: AuctionExtensionWhereInput[]
    NOT?: AuctionExtensionWhereInput | AuctionExtensionWhereInput[]
    id?: BigIntFilter<"AuctionExtension"> | bigint | number
    auctionId?: BigIntFilter<"AuctionExtension"> | bigint | number
    extendedMinutes?: IntFilter<"AuctionExtension"> | number
    previousEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    newEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    reason?: StringFilter<"AuctionExtension"> | string
    createdAt?: DateTimeFilter<"AuctionExtension"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }

  export type AuctionExtensionOrderByWithRelationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
    previousEndTime?: SortOrder
    newEndTime?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    auction?: AuctionRoomOrderByWithRelationInput
  }

  export type AuctionExtensionWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: AuctionExtensionWhereInput | AuctionExtensionWhereInput[]
    OR?: AuctionExtensionWhereInput[]
    NOT?: AuctionExtensionWhereInput | AuctionExtensionWhereInput[]
    auctionId?: BigIntFilter<"AuctionExtension"> | bigint | number
    extendedMinutes?: IntFilter<"AuctionExtension"> | number
    previousEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    newEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    reason?: StringFilter<"AuctionExtension"> | string
    createdAt?: DateTimeFilter<"AuctionExtension"> | Date | string
    auction?: XOR<AuctionRoomRelationFilter, AuctionRoomWhereInput>
  }, "id">

  export type AuctionExtensionOrderByWithAggregationInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
    previousEndTime?: SortOrder
    newEndTime?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    _count?: AuctionExtensionCountOrderByAggregateInput
    _avg?: AuctionExtensionAvgOrderByAggregateInput
    _max?: AuctionExtensionMaxOrderByAggregateInput
    _min?: AuctionExtensionMinOrderByAggregateInput
    _sum?: AuctionExtensionSumOrderByAggregateInput
  }

  export type AuctionExtensionScalarWhereWithAggregatesInput = {
    AND?: AuctionExtensionScalarWhereWithAggregatesInput | AuctionExtensionScalarWhereWithAggregatesInput[]
    OR?: AuctionExtensionScalarWhereWithAggregatesInput[]
    NOT?: AuctionExtensionScalarWhereWithAggregatesInput | AuctionExtensionScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"AuctionExtension"> | bigint | number
    auctionId?: BigIntWithAggregatesFilter<"AuctionExtension"> | bigint | number
    extendedMinutes?: IntWithAggregatesFilter<"AuctionExtension"> | number
    previousEndTime?: DateTimeWithAggregatesFilter<"AuctionExtension"> | Date | string
    newEndTime?: DateTimeWithAggregatesFilter<"AuctionExtension"> | Date | string
    reason?: StringWithAggregatesFilter<"AuctionExtension"> | string
    createdAt?: DateTimeWithAggregatesFilter<"AuctionExtension"> | Date | string
  }

  export type AuctionRoomCreateInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidCreateNestedManyWithoutAuctionInput
    settlement?: AuctionSettlementCreateNestedOneWithoutAuctionInput
    extensions?: AuctionExtensionCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomUncheckedCreateInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidUncheckedCreateNestedManyWithoutAuctionInput
    settlement?: AuctionSettlementUncheckedCreateNestedOneWithoutAuctionInput
    extensions?: AuctionExtensionUncheckedCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUpdateManyWithoutAuctionNestedInput
    settlement?: AuctionSettlementUpdateOneWithoutAuctionNestedInput
    extensions?: AuctionExtensionUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUncheckedUpdateManyWithoutAuctionNestedInput
    settlement?: AuctionSettlementUncheckedUpdateOneWithoutAuctionNestedInput
    extensions?: AuctionExtensionUncheckedUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomCreateManyInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuctionRoomUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionRoomUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionBidCreateInput = {
    id?: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
    auction: AuctionRoomCreateNestedOneWithoutBidsInput
  }

  export type AuctionBidUncheckedCreateInput = {
    id?: bigint | number
    auctionId: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
  }

  export type AuctionBidUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auction?: AuctionRoomUpdateOneRequiredWithoutBidsNestedInput
  }

  export type AuctionBidUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionBidCreateManyInput = {
    id?: bigint | number
    auctionId: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
  }

  export type AuctionBidUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionBidUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionSettlementCreateInput = {
    id?: bigint | number
    winnerId: string
    winningBidAmount: Decimal | DecimalJsLike | number | string
    paymentDeadline: Date | string
    orderId?: bigint | number | null
    status?: string
    settledAt?: Date | string
    createdAt?: Date | string
    auction: AuctionRoomCreateNestedOneWithoutSettlementInput
  }

  export type AuctionSettlementUncheckedCreateInput = {
    id?: bigint | number
    auctionId: bigint | number
    winnerId: string
    winningBidAmount: Decimal | DecimalJsLike | number | string
    paymentDeadline: Date | string
    orderId?: bigint | number | null
    status?: string
    settledAt?: Date | string
    createdAt?: Date | string
  }

  export type AuctionSettlementUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auction?: AuctionRoomUpdateOneRequiredWithoutSettlementNestedInput
  }

  export type AuctionSettlementUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionSettlementCreateManyInput = {
    id?: bigint | number
    auctionId: bigint | number
    winnerId: string
    winningBidAmount: Decimal | DecimalJsLike | number | string
    paymentDeadline: Date | string
    orderId?: bigint | number | null
    status?: string
    settledAt?: Date | string
    createdAt?: Date | string
  }

  export type AuctionSettlementUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionSettlementUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionCreateInput = {
    id?: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
    auction: AuctionRoomCreateNestedOneWithoutExtensionsInput
  }

  export type AuctionExtensionUncheckedCreateInput = {
    id?: bigint | number
    auctionId: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
  }

  export type AuctionExtensionUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auction?: AuctionRoomUpdateOneRequiredWithoutExtensionsNestedInput
  }

  export type AuctionExtensionUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionCreateManyInput = {
    id?: bigint | number
    auctionId: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
  }

  export type AuctionExtensionUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    auctionId?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
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

  export type AuctionBidListRelationFilter = {
    every?: AuctionBidWhereInput
    some?: AuctionBidWhereInput
    none?: AuctionBidWhereInput
  }

  export type AuctionSettlementNullableRelationFilter = {
    is?: AuctionSettlementWhereInput | null
    isNot?: AuctionSettlementWhereInput | null
  }

  export type AuctionExtensionListRelationFilter = {
    every?: AuctionExtensionWhereInput
    some?: AuctionExtensionWhereInput
    none?: AuctionExtensionWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AuctionBidOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuctionExtensionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuctionRoomCountOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    sellerId?: SortOrder
    title?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    actualEndTime?: SortOrder
    status?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuctionRoomAvgOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrder
  }

  export type AuctionRoomMaxOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    sellerId?: SortOrder
    title?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    actualEndTime?: SortOrder
    status?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuctionRoomMinOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    sellerId?: SortOrder
    title?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    actualEndTime?: SortOrder
    status?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuctionRoomSumOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    startPrice?: SortOrder
    currentPrice?: SortOrder
    bidStep?: SortOrder
    buyNowPrice?: SortOrder
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

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type AuctionRoomRelationFilter = {
    is?: AuctionRoomWhereInput
    isNot?: AuctionRoomWhereInput
  }

  export type AuctionBidCountOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidderId?: SortOrder
    bidAmount?: SortOrder
    bidTime?: SortOrder
    isWinning?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionBidAvgOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidAmount?: SortOrder
  }

  export type AuctionBidMaxOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidderId?: SortOrder
    bidAmount?: SortOrder
    bidTime?: SortOrder
    isWinning?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionBidMinOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidderId?: SortOrder
    bidAmount?: SortOrder
    bidTime?: SortOrder
    isWinning?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionBidSumOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    bidAmount?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
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

  export type AuctionSettlementCountOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winnerId?: SortOrder
    winningBidAmount?: SortOrder
    paymentDeadline?: SortOrder
    orderId?: SortOrder
    status?: SortOrder
    settledAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionSettlementAvgOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winningBidAmount?: SortOrder
    orderId?: SortOrder
  }

  export type AuctionSettlementMaxOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winnerId?: SortOrder
    winningBidAmount?: SortOrder
    paymentDeadline?: SortOrder
    orderId?: SortOrder
    status?: SortOrder
    settledAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionSettlementMinOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winnerId?: SortOrder
    winningBidAmount?: SortOrder
    paymentDeadline?: SortOrder
    orderId?: SortOrder
    status?: SortOrder
    settledAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionSettlementSumOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    winningBidAmount?: SortOrder
    orderId?: SortOrder
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

  export type AuctionExtensionCountOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
    previousEndTime?: SortOrder
    newEndTime?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionExtensionAvgOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
  }

  export type AuctionExtensionMaxOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
    previousEndTime?: SortOrder
    newEndTime?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionExtensionMinOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
    previousEndTime?: SortOrder
    newEndTime?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type AuctionExtensionSumOrderByAggregateInput = {
    id?: SortOrder
    auctionId?: SortOrder
    extendedMinutes?: SortOrder
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

  export type AuctionBidCreateNestedManyWithoutAuctionInput = {
    create?: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput> | AuctionBidCreateWithoutAuctionInput[] | AuctionBidUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionBidCreateOrConnectWithoutAuctionInput | AuctionBidCreateOrConnectWithoutAuctionInput[]
    createMany?: AuctionBidCreateManyAuctionInputEnvelope
    connect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
  }

  export type AuctionSettlementCreateNestedOneWithoutAuctionInput = {
    create?: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
    connectOrCreate?: AuctionSettlementCreateOrConnectWithoutAuctionInput
    connect?: AuctionSettlementWhereUniqueInput
  }

  export type AuctionExtensionCreateNestedManyWithoutAuctionInput = {
    create?: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput> | AuctionExtensionCreateWithoutAuctionInput[] | AuctionExtensionUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionExtensionCreateOrConnectWithoutAuctionInput | AuctionExtensionCreateOrConnectWithoutAuctionInput[]
    createMany?: AuctionExtensionCreateManyAuctionInputEnvelope
    connect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
  }

  export type AuctionBidUncheckedCreateNestedManyWithoutAuctionInput = {
    create?: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput> | AuctionBidCreateWithoutAuctionInput[] | AuctionBidUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionBidCreateOrConnectWithoutAuctionInput | AuctionBidCreateOrConnectWithoutAuctionInput[]
    createMany?: AuctionBidCreateManyAuctionInputEnvelope
    connect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
  }

  export type AuctionSettlementUncheckedCreateNestedOneWithoutAuctionInput = {
    create?: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
    connectOrCreate?: AuctionSettlementCreateOrConnectWithoutAuctionInput
    connect?: AuctionSettlementWhereUniqueInput
  }

  export type AuctionExtensionUncheckedCreateNestedManyWithoutAuctionInput = {
    create?: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput> | AuctionExtensionCreateWithoutAuctionInput[] | AuctionExtensionUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionExtensionCreateOrConnectWithoutAuctionInput | AuctionExtensionCreateOrConnectWithoutAuctionInput[]
    createMany?: AuctionExtensionCreateManyAuctionInputEnvelope
    connect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
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

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type AuctionBidUpdateManyWithoutAuctionNestedInput = {
    create?: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput> | AuctionBidCreateWithoutAuctionInput[] | AuctionBidUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionBidCreateOrConnectWithoutAuctionInput | AuctionBidCreateOrConnectWithoutAuctionInput[]
    upsert?: AuctionBidUpsertWithWhereUniqueWithoutAuctionInput | AuctionBidUpsertWithWhereUniqueWithoutAuctionInput[]
    createMany?: AuctionBidCreateManyAuctionInputEnvelope
    set?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    disconnect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    delete?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    connect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    update?: AuctionBidUpdateWithWhereUniqueWithoutAuctionInput | AuctionBidUpdateWithWhereUniqueWithoutAuctionInput[]
    updateMany?: AuctionBidUpdateManyWithWhereWithoutAuctionInput | AuctionBidUpdateManyWithWhereWithoutAuctionInput[]
    deleteMany?: AuctionBidScalarWhereInput | AuctionBidScalarWhereInput[]
  }

  export type AuctionSettlementUpdateOneWithoutAuctionNestedInput = {
    create?: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
    connectOrCreate?: AuctionSettlementCreateOrConnectWithoutAuctionInput
    upsert?: AuctionSettlementUpsertWithoutAuctionInput
    disconnect?: AuctionSettlementWhereInput | boolean
    delete?: AuctionSettlementWhereInput | boolean
    connect?: AuctionSettlementWhereUniqueInput
    update?: XOR<XOR<AuctionSettlementUpdateToOneWithWhereWithoutAuctionInput, AuctionSettlementUpdateWithoutAuctionInput>, AuctionSettlementUncheckedUpdateWithoutAuctionInput>
  }

  export type AuctionExtensionUpdateManyWithoutAuctionNestedInput = {
    create?: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput> | AuctionExtensionCreateWithoutAuctionInput[] | AuctionExtensionUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionExtensionCreateOrConnectWithoutAuctionInput | AuctionExtensionCreateOrConnectWithoutAuctionInput[]
    upsert?: AuctionExtensionUpsertWithWhereUniqueWithoutAuctionInput | AuctionExtensionUpsertWithWhereUniqueWithoutAuctionInput[]
    createMany?: AuctionExtensionCreateManyAuctionInputEnvelope
    set?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    disconnect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    delete?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    connect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    update?: AuctionExtensionUpdateWithWhereUniqueWithoutAuctionInput | AuctionExtensionUpdateWithWhereUniqueWithoutAuctionInput[]
    updateMany?: AuctionExtensionUpdateManyWithWhereWithoutAuctionInput | AuctionExtensionUpdateManyWithWhereWithoutAuctionInput[]
    deleteMany?: AuctionExtensionScalarWhereInput | AuctionExtensionScalarWhereInput[]
  }

  export type AuctionBidUncheckedUpdateManyWithoutAuctionNestedInput = {
    create?: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput> | AuctionBidCreateWithoutAuctionInput[] | AuctionBidUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionBidCreateOrConnectWithoutAuctionInput | AuctionBidCreateOrConnectWithoutAuctionInput[]
    upsert?: AuctionBidUpsertWithWhereUniqueWithoutAuctionInput | AuctionBidUpsertWithWhereUniqueWithoutAuctionInput[]
    createMany?: AuctionBidCreateManyAuctionInputEnvelope
    set?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    disconnect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    delete?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    connect?: AuctionBidWhereUniqueInput | AuctionBidWhereUniqueInput[]
    update?: AuctionBidUpdateWithWhereUniqueWithoutAuctionInput | AuctionBidUpdateWithWhereUniqueWithoutAuctionInput[]
    updateMany?: AuctionBidUpdateManyWithWhereWithoutAuctionInput | AuctionBidUpdateManyWithWhereWithoutAuctionInput[]
    deleteMany?: AuctionBidScalarWhereInput | AuctionBidScalarWhereInput[]
  }

  export type AuctionSettlementUncheckedUpdateOneWithoutAuctionNestedInput = {
    create?: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
    connectOrCreate?: AuctionSettlementCreateOrConnectWithoutAuctionInput
    upsert?: AuctionSettlementUpsertWithoutAuctionInput
    disconnect?: AuctionSettlementWhereInput | boolean
    delete?: AuctionSettlementWhereInput | boolean
    connect?: AuctionSettlementWhereUniqueInput
    update?: XOR<XOR<AuctionSettlementUpdateToOneWithWhereWithoutAuctionInput, AuctionSettlementUpdateWithoutAuctionInput>, AuctionSettlementUncheckedUpdateWithoutAuctionInput>
  }

  export type AuctionExtensionUncheckedUpdateManyWithoutAuctionNestedInput = {
    create?: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput> | AuctionExtensionCreateWithoutAuctionInput[] | AuctionExtensionUncheckedCreateWithoutAuctionInput[]
    connectOrCreate?: AuctionExtensionCreateOrConnectWithoutAuctionInput | AuctionExtensionCreateOrConnectWithoutAuctionInput[]
    upsert?: AuctionExtensionUpsertWithWhereUniqueWithoutAuctionInput | AuctionExtensionUpsertWithWhereUniqueWithoutAuctionInput[]
    createMany?: AuctionExtensionCreateManyAuctionInputEnvelope
    set?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    disconnect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    delete?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    connect?: AuctionExtensionWhereUniqueInput | AuctionExtensionWhereUniqueInput[]
    update?: AuctionExtensionUpdateWithWhereUniqueWithoutAuctionInput | AuctionExtensionUpdateWithWhereUniqueWithoutAuctionInput[]
    updateMany?: AuctionExtensionUpdateManyWithWhereWithoutAuctionInput | AuctionExtensionUpdateManyWithWhereWithoutAuctionInput[]
    deleteMany?: AuctionExtensionScalarWhereInput | AuctionExtensionScalarWhereInput[]
  }

  export type AuctionRoomCreateNestedOneWithoutBidsInput = {
    create?: XOR<AuctionRoomCreateWithoutBidsInput, AuctionRoomUncheckedCreateWithoutBidsInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutBidsInput
    connect?: AuctionRoomWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type AuctionRoomUpdateOneRequiredWithoutBidsNestedInput = {
    create?: XOR<AuctionRoomCreateWithoutBidsInput, AuctionRoomUncheckedCreateWithoutBidsInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutBidsInput
    upsert?: AuctionRoomUpsertWithoutBidsInput
    connect?: AuctionRoomWhereUniqueInput
    update?: XOR<XOR<AuctionRoomUpdateToOneWithWhereWithoutBidsInput, AuctionRoomUpdateWithoutBidsInput>, AuctionRoomUncheckedUpdateWithoutBidsInput>
  }

  export type AuctionRoomCreateNestedOneWithoutSettlementInput = {
    create?: XOR<AuctionRoomCreateWithoutSettlementInput, AuctionRoomUncheckedCreateWithoutSettlementInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutSettlementInput
    connect?: AuctionRoomWhereUniqueInput
  }

  export type NullableBigIntFieldUpdateOperationsInput = {
    set?: bigint | number | null
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type AuctionRoomUpdateOneRequiredWithoutSettlementNestedInput = {
    create?: XOR<AuctionRoomCreateWithoutSettlementInput, AuctionRoomUncheckedCreateWithoutSettlementInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutSettlementInput
    upsert?: AuctionRoomUpsertWithoutSettlementInput
    connect?: AuctionRoomWhereUniqueInput
    update?: XOR<XOR<AuctionRoomUpdateToOneWithWhereWithoutSettlementInput, AuctionRoomUpdateWithoutSettlementInput>, AuctionRoomUncheckedUpdateWithoutSettlementInput>
  }

  export type AuctionRoomCreateNestedOneWithoutExtensionsInput = {
    create?: XOR<AuctionRoomCreateWithoutExtensionsInput, AuctionRoomUncheckedCreateWithoutExtensionsInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutExtensionsInput
    connect?: AuctionRoomWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AuctionRoomUpdateOneRequiredWithoutExtensionsNestedInput = {
    create?: XOR<AuctionRoomCreateWithoutExtensionsInput, AuctionRoomUncheckedCreateWithoutExtensionsInput>
    connectOrCreate?: AuctionRoomCreateOrConnectWithoutExtensionsInput
    upsert?: AuctionRoomUpsertWithoutExtensionsInput
    connect?: AuctionRoomWhereUniqueInput
    update?: XOR<XOR<AuctionRoomUpdateToOneWithWhereWithoutExtensionsInput, AuctionRoomUpdateWithoutExtensionsInput>, AuctionRoomUncheckedUpdateWithoutExtensionsInput>
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

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
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

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
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

  export type AuctionBidCreateWithoutAuctionInput = {
    id?: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
  }

  export type AuctionBidUncheckedCreateWithoutAuctionInput = {
    id?: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
  }

  export type AuctionBidCreateOrConnectWithoutAuctionInput = {
    where: AuctionBidWhereUniqueInput
    create: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput>
  }

  export type AuctionBidCreateManyAuctionInputEnvelope = {
    data: AuctionBidCreateManyAuctionInput | AuctionBidCreateManyAuctionInput[]
    skipDuplicates?: boolean
  }

  export type AuctionSettlementCreateWithoutAuctionInput = {
    id?: bigint | number
    winnerId: string
    winningBidAmount: Decimal | DecimalJsLike | number | string
    paymentDeadline: Date | string
    orderId?: bigint | number | null
    status?: string
    settledAt?: Date | string
    createdAt?: Date | string
  }

  export type AuctionSettlementUncheckedCreateWithoutAuctionInput = {
    id?: bigint | number
    winnerId: string
    winningBidAmount: Decimal | DecimalJsLike | number | string
    paymentDeadline: Date | string
    orderId?: bigint | number | null
    status?: string
    settledAt?: Date | string
    createdAt?: Date | string
  }

  export type AuctionSettlementCreateOrConnectWithoutAuctionInput = {
    where: AuctionSettlementWhereUniqueInput
    create: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
  }

  export type AuctionExtensionCreateWithoutAuctionInput = {
    id?: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
  }

  export type AuctionExtensionUncheckedCreateWithoutAuctionInput = {
    id?: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
  }

  export type AuctionExtensionCreateOrConnectWithoutAuctionInput = {
    where: AuctionExtensionWhereUniqueInput
    create: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput>
  }

  export type AuctionExtensionCreateManyAuctionInputEnvelope = {
    data: AuctionExtensionCreateManyAuctionInput | AuctionExtensionCreateManyAuctionInput[]
    skipDuplicates?: boolean
  }

  export type AuctionBidUpsertWithWhereUniqueWithoutAuctionInput = {
    where: AuctionBidWhereUniqueInput
    update: XOR<AuctionBidUpdateWithoutAuctionInput, AuctionBidUncheckedUpdateWithoutAuctionInput>
    create: XOR<AuctionBidCreateWithoutAuctionInput, AuctionBidUncheckedCreateWithoutAuctionInput>
  }

  export type AuctionBidUpdateWithWhereUniqueWithoutAuctionInput = {
    where: AuctionBidWhereUniqueInput
    data: XOR<AuctionBidUpdateWithoutAuctionInput, AuctionBidUncheckedUpdateWithoutAuctionInput>
  }

  export type AuctionBidUpdateManyWithWhereWithoutAuctionInput = {
    where: AuctionBidScalarWhereInput
    data: XOR<AuctionBidUpdateManyMutationInput, AuctionBidUncheckedUpdateManyWithoutAuctionInput>
  }

  export type AuctionBidScalarWhereInput = {
    AND?: AuctionBidScalarWhereInput | AuctionBidScalarWhereInput[]
    OR?: AuctionBidScalarWhereInput[]
    NOT?: AuctionBidScalarWhereInput | AuctionBidScalarWhereInput[]
    id?: BigIntFilter<"AuctionBid"> | bigint | number
    auctionId?: BigIntFilter<"AuctionBid"> | bigint | number
    bidderId?: StringFilter<"AuctionBid"> | string
    bidAmount?: DecimalFilter<"AuctionBid"> | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFilter<"AuctionBid"> | Date | string
    isWinning?: BoolFilter<"AuctionBid"> | boolean
    createdAt?: DateTimeFilter<"AuctionBid"> | Date | string
  }

  export type AuctionSettlementUpsertWithoutAuctionInput = {
    update: XOR<AuctionSettlementUpdateWithoutAuctionInput, AuctionSettlementUncheckedUpdateWithoutAuctionInput>
    create: XOR<AuctionSettlementCreateWithoutAuctionInput, AuctionSettlementUncheckedCreateWithoutAuctionInput>
    where?: AuctionSettlementWhereInput
  }

  export type AuctionSettlementUpdateToOneWithWhereWithoutAuctionInput = {
    where?: AuctionSettlementWhereInput
    data: XOR<AuctionSettlementUpdateWithoutAuctionInput, AuctionSettlementUncheckedUpdateWithoutAuctionInput>
  }

  export type AuctionSettlementUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionSettlementUncheckedUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    winnerId?: StringFieldUpdateOperationsInput | string
    winningBidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    paymentDeadline?: DateTimeFieldUpdateOperationsInput | Date | string
    orderId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    status?: StringFieldUpdateOperationsInput | string
    settledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionUpsertWithWhereUniqueWithoutAuctionInput = {
    where: AuctionExtensionWhereUniqueInput
    update: XOR<AuctionExtensionUpdateWithoutAuctionInput, AuctionExtensionUncheckedUpdateWithoutAuctionInput>
    create: XOR<AuctionExtensionCreateWithoutAuctionInput, AuctionExtensionUncheckedCreateWithoutAuctionInput>
  }

  export type AuctionExtensionUpdateWithWhereUniqueWithoutAuctionInput = {
    where: AuctionExtensionWhereUniqueInput
    data: XOR<AuctionExtensionUpdateWithoutAuctionInput, AuctionExtensionUncheckedUpdateWithoutAuctionInput>
  }

  export type AuctionExtensionUpdateManyWithWhereWithoutAuctionInput = {
    where: AuctionExtensionScalarWhereInput
    data: XOR<AuctionExtensionUpdateManyMutationInput, AuctionExtensionUncheckedUpdateManyWithoutAuctionInput>
  }

  export type AuctionExtensionScalarWhereInput = {
    AND?: AuctionExtensionScalarWhereInput | AuctionExtensionScalarWhereInput[]
    OR?: AuctionExtensionScalarWhereInput[]
    NOT?: AuctionExtensionScalarWhereInput | AuctionExtensionScalarWhereInput[]
    id?: BigIntFilter<"AuctionExtension"> | bigint | number
    auctionId?: BigIntFilter<"AuctionExtension"> | bigint | number
    extendedMinutes?: IntFilter<"AuctionExtension"> | number
    previousEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    newEndTime?: DateTimeFilter<"AuctionExtension"> | Date | string
    reason?: StringFilter<"AuctionExtension"> | string
    createdAt?: DateTimeFilter<"AuctionExtension"> | Date | string
  }

  export type AuctionRoomCreateWithoutBidsInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    settlement?: AuctionSettlementCreateNestedOneWithoutAuctionInput
    extensions?: AuctionExtensionCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomUncheckedCreateWithoutBidsInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    settlement?: AuctionSettlementUncheckedCreateNestedOneWithoutAuctionInput
    extensions?: AuctionExtensionUncheckedCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomCreateOrConnectWithoutBidsInput = {
    where: AuctionRoomWhereUniqueInput
    create: XOR<AuctionRoomCreateWithoutBidsInput, AuctionRoomUncheckedCreateWithoutBidsInput>
  }

  export type AuctionRoomUpsertWithoutBidsInput = {
    update: XOR<AuctionRoomUpdateWithoutBidsInput, AuctionRoomUncheckedUpdateWithoutBidsInput>
    create: XOR<AuctionRoomCreateWithoutBidsInput, AuctionRoomUncheckedCreateWithoutBidsInput>
    where?: AuctionRoomWhereInput
  }

  export type AuctionRoomUpdateToOneWithWhereWithoutBidsInput = {
    where?: AuctionRoomWhereInput
    data: XOR<AuctionRoomUpdateWithoutBidsInput, AuctionRoomUncheckedUpdateWithoutBidsInput>
  }

  export type AuctionRoomUpdateWithoutBidsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    settlement?: AuctionSettlementUpdateOneWithoutAuctionNestedInput
    extensions?: AuctionExtensionUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomUncheckedUpdateWithoutBidsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    settlement?: AuctionSettlementUncheckedUpdateOneWithoutAuctionNestedInput
    extensions?: AuctionExtensionUncheckedUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomCreateWithoutSettlementInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidCreateNestedManyWithoutAuctionInput
    extensions?: AuctionExtensionCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomUncheckedCreateWithoutSettlementInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidUncheckedCreateNestedManyWithoutAuctionInput
    extensions?: AuctionExtensionUncheckedCreateNestedManyWithoutAuctionInput
  }

  export type AuctionRoomCreateOrConnectWithoutSettlementInput = {
    where: AuctionRoomWhereUniqueInput
    create: XOR<AuctionRoomCreateWithoutSettlementInput, AuctionRoomUncheckedCreateWithoutSettlementInput>
  }

  export type AuctionRoomUpsertWithoutSettlementInput = {
    update: XOR<AuctionRoomUpdateWithoutSettlementInput, AuctionRoomUncheckedUpdateWithoutSettlementInput>
    create: XOR<AuctionRoomCreateWithoutSettlementInput, AuctionRoomUncheckedCreateWithoutSettlementInput>
    where?: AuctionRoomWhereInput
  }

  export type AuctionRoomUpdateToOneWithWhereWithoutSettlementInput = {
    where?: AuctionRoomWhereInput
    data: XOR<AuctionRoomUpdateWithoutSettlementInput, AuctionRoomUncheckedUpdateWithoutSettlementInput>
  }

  export type AuctionRoomUpdateWithoutSettlementInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUpdateManyWithoutAuctionNestedInput
    extensions?: AuctionExtensionUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomUncheckedUpdateWithoutSettlementInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUncheckedUpdateManyWithoutAuctionNestedInput
    extensions?: AuctionExtensionUncheckedUpdateManyWithoutAuctionNestedInput
  }

  export type AuctionRoomCreateWithoutExtensionsInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidCreateNestedManyWithoutAuctionInput
    settlement?: AuctionSettlementCreateNestedOneWithoutAuctionInput
  }

  export type AuctionRoomUncheckedCreateWithoutExtensionsInput = {
    id?: bigint | number
    productId: bigint | number
    sellerId: string
    title: string
    startPrice: Decimal | DecimalJsLike | number | string
    currentPrice: Decimal | DecimalJsLike | number | string
    bidStep: Decimal | DecimalJsLike | number | string
    buyNowPrice?: Decimal | DecimalJsLike | number | string | null
    startTime: Date | string
    endTime: Date | string
    actualEndTime?: Date | string | null
    status?: string
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bids?: AuctionBidUncheckedCreateNestedManyWithoutAuctionInput
    settlement?: AuctionSettlementUncheckedCreateNestedOneWithoutAuctionInput
  }

  export type AuctionRoomCreateOrConnectWithoutExtensionsInput = {
    where: AuctionRoomWhereUniqueInput
    create: XOR<AuctionRoomCreateWithoutExtensionsInput, AuctionRoomUncheckedCreateWithoutExtensionsInput>
  }

  export type AuctionRoomUpsertWithoutExtensionsInput = {
    update: XOR<AuctionRoomUpdateWithoutExtensionsInput, AuctionRoomUncheckedUpdateWithoutExtensionsInput>
    create: XOR<AuctionRoomCreateWithoutExtensionsInput, AuctionRoomUncheckedCreateWithoutExtensionsInput>
    where?: AuctionRoomWhereInput
  }

  export type AuctionRoomUpdateToOneWithWhereWithoutExtensionsInput = {
    where?: AuctionRoomWhereInput
    data: XOR<AuctionRoomUpdateWithoutExtensionsInput, AuctionRoomUncheckedUpdateWithoutExtensionsInput>
  }

  export type AuctionRoomUpdateWithoutExtensionsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUpdateManyWithoutAuctionNestedInput
    settlement?: AuctionSettlementUpdateOneWithoutAuctionNestedInput
  }

  export type AuctionRoomUncheckedUpdateWithoutExtensionsInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    productId?: BigIntFieldUpdateOperationsInput | bigint | number
    sellerId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    startPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currentPrice?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidStep?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    buyNowPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    actualEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bids?: AuctionBidUncheckedUpdateManyWithoutAuctionNestedInput
    settlement?: AuctionSettlementUncheckedUpdateOneWithoutAuctionNestedInput
  }

  export type AuctionBidCreateManyAuctionInput = {
    id?: bigint | number
    bidderId: string
    bidAmount: Decimal | DecimalJsLike | number | string
    bidTime?: Date | string
    isWinning?: boolean
    createdAt?: Date | string
  }

  export type AuctionExtensionCreateManyAuctionInput = {
    id?: bigint | number
    extendedMinutes?: number
    previousEndTime: Date | string
    newEndTime: Date | string
    reason?: string
    createdAt?: Date | string
  }

  export type AuctionBidUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionBidUncheckedUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionBidUncheckedUpdateManyWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    bidderId?: StringFieldUpdateOperationsInput | string
    bidAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    bidTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isWinning?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionUncheckedUpdateWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuctionExtensionUncheckedUpdateManyWithoutAuctionInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    extendedMinutes?: IntFieldUpdateOperationsInput | number
    previousEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    newEndTime?: DateTimeFieldUpdateOperationsInput | Date | string
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use AuctionRoomCountOutputTypeDefaultArgs instead
     */
    export type AuctionRoomCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuctionRoomCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuctionRoomDefaultArgs instead
     */
    export type AuctionRoomArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuctionRoomDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuctionBidDefaultArgs instead
     */
    export type AuctionBidArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuctionBidDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuctionSettlementDefaultArgs instead
     */
    export type AuctionSettlementArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuctionSettlementDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuctionExtensionDefaultArgs instead
     */
    export type AuctionExtensionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuctionExtensionDefaultArgs<ExtArgs>

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