
const workerCode = `
  self.onmessage = (event) => {
    const { code, args } = event.data;
    try {
      // Find the function name from the code string to call it dynamically.
      // Supports:
      // 1. function funcName(...)
      // 2. const/let/var funcName = (...) =>
      // 3. async function funcName(...)
      
      const funcNameMatch = 
        code.match(/function\\s+([a-zA-Z0-9_]+)\\s*\\(/) || 
        code.match(/(?:var|let|const)\\s+([a-zA-Z0-9_]+)\\s*=\\s*(?:async\\s*)?(?:function\\s*)?(?:\\(|[^=]+=>)/);

      if (!funcNameMatch || !funcNameMatch[1]) {
        throw new Error("Could not find a valid function declaration in the skill's code.");
      }
      
      const funcName = funcNameMatch[1];
      
      // Construct a new function that encapsulates the skill's code and calls the correct function.
      // This is safer than eval() as it runs in the worker's restricted scope.
      // We build the function body using string concatenation to avoid issues with nested template literals.
      const functionBody = code +
        '\\nif (typeof ' + funcName + ' !== "function") {' +
        '  throw new Error("Function \'" + funcName + "\' is not defined in the skill code.");' +
        '}' +
        'return ' + funcName + '(...args);';

      const executor = new Function('...args', functionBody);

      // Handle both async and sync results
      const result = executor(...args);
      
      if (result instanceof Promise) {
          result.then(res => self.postMessage({ success: true, result: res }))
                .catch(err => self.postMessage({ success: false, error: err instanceof Error ? err.message : String(err) }));
      } else {
          self.postMessage({ success: true, result });
      }

    } catch (error) {
      self.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
`;

let worker: Worker | null = null;

const getWorker = (): Worker => {
  if (!worker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url);
  }
  return worker;
};

/**
 * Executes a skill's code in a secure Web Worker sandbox.
 * @param code The JavaScript code of the skill.
 * @param args An array of arguments to pass to the function.
 * @returns A promise that resolves with the result of the function.
 */
export const executeSkillInSandbox = (code: string, args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const sandboxWorker = getWorker();

    let messageHandler: (event: MessageEvent) => void;
    let errorHandler: (event: ErrorEvent) => void;

    const cleanup = () => {
        sandboxWorker.removeEventListener('message', messageHandler);
        sandboxWorker.removeEventListener('error', errorHandler);
    };

    messageHandler = (event: MessageEvent) => {
      cleanup();
      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };

    errorHandler = (event: ErrorEvent) => {
       cleanup();
       reject(new Error(`Sandbox worker error: ${event.message}`));
    };

    sandboxWorker.addEventListener('message', messageHandler);
    sandboxWorker.addEventListener('error', errorHandler);
    
    sandboxWorker.postMessage({ code, args });
  });
};
