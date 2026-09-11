import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import {
  findOrderById,
  listAllOrders,
  listOrderItems,
  listOrdersForUser,
} from "../orders/index.ts";
import { listAllProducts } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts";

export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({ orders: listOrdersForUser(db, current.user.id) });
  });

  router.get("/api/orders/:id", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = findOrderById(db, orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order, items: listOrderItems(db, order.id) });
  });

  router.get("/api/products", (_req, res) => {
    res.json({ products: listAllProducts(db) });
  });

  router.get("/api/integrations/warehouse/orders", (req, res) => {
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

    if (!apiKeyHeader) {
      return res.status(401).json({
        error: "unauthorised!",
      });
    }

    const apiKey = findApiKey(db, apiKeyHeader);

    if (!apiKey) {
      return res.status(401).json({
        error: "unauthorised!",
      });
    }

    if (!apiKey.scope.includes("orders:read")) {
      return res.status(403).json({
        error: "forbidden!",
      });
    }

    const orders = listAllOrders(db).map((order) => ({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }));

    return res.json({
      integration: "Warehouse Fulfillment Integration",
      orders,
    });
  });

  return router;
}
