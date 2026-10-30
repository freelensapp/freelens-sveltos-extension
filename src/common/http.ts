import { get as httpGetRequest } from "node:http";
import { get as httpsGetRequest } from "node:https";
import type { IncomingMessage } from "node:http";

export interface HttpResponse {
  status: number;
  contentType: string;
  body: Buffer;
}

export interface HttpOptions {
  accept?: string;
  maxBytes?: number;
  /** Skips certificate validation, needed behind a TLS intercepting corporate proxy. */
  insecureTls?: boolean;
}

const maxRedirects = 5;

/** The GitHub API rejects requests without one, `fetch` used to add it implicitly. */
const userAgent = "freelens-sveltos-extension";

/**
 * Minimal GET used by the main process. `fetch` cannot relax certificate
 * validation per request, and doing it globally would also affect the cluster
 * connections owned by Freelens.
 */
export function httpGet(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  return request(url, options, 0);
}

function request(url: string, options: HttpOptions, redirects: number): Promise<HttpResponse> {
  return new Promise<HttpResponse>((resolve, reject) => {
    const get = url.startsWith("http://") ? httpGetRequest : httpsGetRequest;
    const outgoing = get(
      url,
      {
        headers: {
          "user-agent": userAgent,
          ...(options.accept ? { accept: options.accept } : {}),
        },
        rejectUnauthorized: !options.insecureTls,
      },
      (response: IncomingMessage) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location) {
          response.resume();

          if (redirects >= maxRedirects) {
            reject(new Error(`too many redirects for ${url}`));
            return;
          }

          resolve(request(new URL(location, url).toString(), options, redirects + 1));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;

          if (options.maxBytes && size > options.maxBytes) {
            outgoing.destroy();
            reject(new Error(`response from ${url} is larger than ${options.maxBytes} bytes`));
            return;
          }

          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status,
            contentType: response.headers["content-type"] ?? "",
            body: Buffer.concat(chunks),
          }),
        );
      },
    );

    outgoing.on("error", reject);
  });
}
