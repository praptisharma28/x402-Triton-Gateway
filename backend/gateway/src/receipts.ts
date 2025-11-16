import { Receipt, UsageStats } from "@x402-gateway/types";
import fs from "fs/promises";
import path from "path";

/**
 * In-memory receipt storage (for demo purposes)
 * In production, use a proper database (PostgreSQL, MongoDB, etc.)
 */
class ReceiptStore {
  private receipts: Receipt[] = [];
  private storePath: string;

  constructor() {
    this.storePath = path.resolve(__dirname, "../../../data/receipts.json");
  }

  /**
   * Initialize store (load from disk if exists)
   */
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.storePath, "utf-8");
      this.receipts = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      this.receipts = [];
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    }
  }

  /**
   * Save receipt
   */
  async save(receipt: Receipt): Promise<void> {
    this.receipts.push(receipt);
    await this.persist();
  }

  /**
   * Update receipt status
   */
  async update(id: string, updates: Partial<Receipt>): Promise<void> {
    const index = this.receipts.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.receipts[index] = { ...this.receipts[index], ...updates };
      await this.persist();
    }
  }

  /**
   * Get receipt by ID
   */
  get(id: string): Receipt | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  /**
   * Get receipt by invoice ID
   */
  getByInvoiceId(invoiceId: string): Receipt | undefined {
    return this.receipts.find((r) => r.invoiceId === invoiceId);
  }

  /**
   * Get all receipts
   */
  getAll(): Receipt[] {
    return [...this.receipts];
  }

  /**
   * Get recent receipts
   */
  getRecent(limit: number = 50): Receipt[] {
    return this.receipts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get usage statistics
   */
  getStats(): UsageStats {
    const totalRequests = this.receipts.length;
    const totalRevenue = this.receipts
      .filter((r) => r.status === "settled")
      .reduce((sum, r) => sum + r.amountUSD, 0);

    const methodBreakdown: Record<
      string,
      { count: number; revenue: number }
    > = {};

    for (const receipt of this.receipts) {
      if (!methodBreakdown[receipt.method]) {
        methodBreakdown[receipt.method] = { count: 0, revenue: 0 };
      }
      methodBreakdown[receipt.method].count++;
      if (receipt.status === "settled") {
        methodBreakdown[receipt.method].revenue += receipt.amountUSD;
      }
    }

    const averageLatency =
      this.receipts.reduce((sum, r) => sum + r.latencyMs, 0) /
        totalRequests || 0;

    const failedRequests = this.receipts.filter(
      (r) => r.status === "failed"
    ).length;
    const failureRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    return {
      totalRequests,
      totalRevenue,
      methodBreakdown,
      averageLatency,
      failureRate,
    };
  }

  /**
   * Persist receipts to disk
   */
  private async persist(): Promise<void> {
    try {
      await fs.writeFile(
        this.storePath,
        JSON.stringify(this.receipts, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("[RECEIPTS] Failed to persist to disk:", error);
    }
  }
}

export const receiptStore = new ReceiptStore();
