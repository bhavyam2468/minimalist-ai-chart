/* Lets `import text from "./x.md?raw"` typecheck — Vite resolves it at build. */
declare module "*?raw" {
  const content: string;
  export default content;
}
