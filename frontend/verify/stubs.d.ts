// Offline typecheck stubs (npm registry is unreachable in the authoring sandbox). NOT shipped to runtime.
declare namespace JSX { interface IntrinsicElements { [e: string]: { [a: string]: any; onChange?: (e: any) => void; onClick?: (e: any) => void } } interface Element {} interface ElementChildrenAttribute { children: {} } interface IntrinsicAttributes { key?: any } }
declare namespace React { type ReactNode = any }
declare module "react/jsx-runtime" { export const jsx: any; export const jsxs: any; export const Fragment: any }
declare module "react" {
  export type ReactNode = any;
  export function useState<T>(i: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
  export function useEffect(f: () => void | (() => void), d?: unknown[]): void;
  export function useRef<T>(i: T): { current: T };
  export function useCallback<T extends (...a: any[]) => any>(f: T, d: unknown[]): T;
  export function useMemo<T>(f: () => T, d: unknown[]): T;
  export interface Ctx<T> { Provider: any; __t?: T }
  export function createContext<T>(d: T): Ctx<T>;
  export function useContext<T>(c: Ctx<T>): T;
  export const Suspense: any;
}
declare module "next" { export type Metadata = any; export type Viewport = any }
declare module "next/link" { const L: any; export default L }
declare module "next/navigation" { export function usePathname(): string; export function useRouter(): { push(p: string): void }; export function useSearchParams(): { get(k: string): string | null }; export function useParams<T>(): T }
declare module "@tanstack/react-query" {
  export class QueryClient { constructor(o?: any); invalidateQueries(a?: any): Promise<void> }
  export const QueryClientProvider: any;
  export function useQueryClient(): QueryClient;
  export function useQuery<T>(o: { queryKey: unknown[]; queryFn: () => Promise<T>; enabled?: boolean; refetchInterval?: number | false }): { data: T | undefined; isLoading: boolean; isError: boolean; refetch(): Promise<unknown> };
}
declare module "genlayer-js" { export function createClient(c: any): any }
declare module "genlayer-js/chains" { export const studionet: { id: number; name: string; rpcUrls: { default: { http: readonly string[] } }; nativeCurrency: any; blockExplorers?: { default: { url: string } } } }
declare module "*.css";
