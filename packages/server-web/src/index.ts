export interface WebApplication {
  readonly fetch: (request: Request) => Response | Promise<Response>;
}

export interface WebFetchExport<Environment = unknown, Execution = unknown> {
  readonly fetch: (request: Request, environment: Environment, execution: Execution) => Promise<Response>;
}

/**
 * Exposes a CocoFrame application as a runtime-neutral Fetch handler.
 */
export function webHandler<Environment = unknown, Execution = unknown>(
  application: WebApplication,
): WebFetchExport<Environment, Execution> {
  return {
    fetch: async (request) => application.fetch(request),
  };
}
