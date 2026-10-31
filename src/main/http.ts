import { Main } from "@freelensapp/extensions";

export interface HttpResponse {
  status: number;
  contentType: string;
  body: Buffer;
}

export interface HttpOptions {
  accept?: string;
}

/** The GitHub API rejects requests without one. */
const userAgent = "freelens-sveltos-extension";

/**
 * GET from the main process with the HTTP client of Freelens, which follows its proxy and certificate settings, so
 * a TLS intercepting proxy needs nothing of the extension. Redirects are followed, as `fetch` does.
 */
export async function httpGet(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  const response = await Main.Util.fetch(url, {
    headers: {
      "user-agent": userAgent,
      ...(options.accept ? { accept: options.accept } : {}),
    },
  });

  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: Buffer.from(await response.arrayBuffer()),
  };
}
