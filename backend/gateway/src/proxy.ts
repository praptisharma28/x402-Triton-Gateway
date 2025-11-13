import axios, { AxiosError } from "axios";
import { JsonRpcRequest, JsonRpcResponse } from "@x402-gateway/types";
import config from "./config";

/**
 * Proxy JSON-RPC request to upstream (Old Faithful / ParaFi)
 */
export async function proxyToUpstream(
  request: JsonRpcRequest
): Promise<JsonRpcResponse> {
  const startTime = Date.now();

  try {
    console.log(`[PROXY] Forwarding ${request.method} to ${config.upstreamRpcUrl}`);

    const response = await axios.post<JsonRpcResponse>(
      config.upstreamRpcUrl,
      request,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 second timeout
      }
    );

    const latency = Date.now() - startTime;
    console.log(`[PROXY] Received response in ${latency}ms`);

    return response.data;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[PROXY] Error after ${latency}ms:`, error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Return upstream error as JSON-RPC error
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: axiosError.response?.status || -32603,
          message:
            axiosError.message || "Internal error proxying to upstream",
          data: axiosError.response?.data,
        },
      };
    }

    // Generic error response
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Validate JSON-RPC request format
 */
export function validateJsonRpcRequest(body: any): body is JsonRpcRequest {
  return (
    body &&
    body.jsonrpc === "2.0" &&
    typeof body.id !== "undefined" &&
    typeof body.method === "string"
  );
}
