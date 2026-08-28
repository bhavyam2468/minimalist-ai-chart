/**
Pyodide, loaded on demand.

The interpreter is fetched from a CDN the first time run_python is called and
then reused, with numpy, pandas, matplotlib and micropip preloaded. Nothing
pays for python until the agent actually asks for it.
 */
let pyodide: any = null;
let pyLoading: Promise<any> | null = null;

export async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (pyLoading) return pyLoading;
  pyLoading = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        s.onload = () => res(); s.onerror = () => rej(new Error("pyodide load failed"));
        document.head.appendChild(s);
      });
    }
    pyodide = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    await pyodide.loadPackage(["numpy", "pandas", "matplotlib", "micropip"]).catch(() => {});
    return pyodide;
  })();
  return pyLoading;
}
