declare module "mammoth" {
  export type Result<T> = { value: T; messages: unknown[] };
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<Result<string>>;
}

declare module "remark-gfm" {
  const remarkGfm: import("unified").Pluggable;
  export default remarkGfm;
}