import { Router } from "express";

import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import {
  findOrderById,
  listAllOrders,
  listOrderItems,
  listOrdersForUser,
} from "../orders/index.ts";
import { type OrderItem } from "../orders/index.ts";
import { listPublicProducts } from "../products.ts";
import { type Product } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts";
import { type Order } from "../orders/index.ts";
import {
  sendApiKeyQuotaExhausted,
  setApiKeyQuotaHeaders,
  toApiKeyQuotaResponse,
} from "./apiKeyQuota.ts";
import { consumeApiKeyQuota } from "../auth/apiKeyUsage.ts";

type ProductResponse = {
  id: number;
  name: string;
  description: string;
  image_path: string;
  price_cents: number;
};

type OrderResponse = {
  id: number;
  status: Order["status"];
  total_cents: number;
  created_at: string;
};

type OrderItemResponse = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
};

const toProductResponse = (product: Product): ProductResponse => {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image_path: product.image_path,
    price_cents: product.price_cents,
  };
};

const toOrderResponse = (order: Order): OrderResponse => {
  return {
    id: order.id,
    status: order.status,
    total_cents: order.total_cents,
    created_at: order.created_at,
  };
};

const toOrderItemResponse = (orderItem: OrderItem): OrderItemResponse => {
  return {
    product_id: orderItem.product_id,
    product_name: orderItem.product_name,
    quantity: orderItem.quantity,
    price_cents: orderItem.price_cents,
  };
};

export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({
      orders: listOrdersForUser(db, current.user.id).map((order) =>
        toOrderResponse(order),
      ),
    });
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
    if (!order || order.user_id !== current.user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({
      order: toOrderResponse(order),
      items: listOrderItems(db, order.id).map((orderItem) =>
        toOrderItemResponse(orderItem),
      ),
    });
  });

  router.get("/api/products", (_req, res) => {
    res.json({
      products: listPublicProducts(db, deps.maxPublicProductResults).map(
        (product) => toProductResponse(product),
      ),
    });
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

    const apiKeyQuota = consumeApiKeyQuota(db, apiKey.id);

    if (apiKeyQuota.allowed) {
      const orders = listAllOrders(db).map((order) => ({
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        created_at: order.created_at,
      }));

      setApiKeyQuotaHeaders(res, apiKeyQuota);

      return res.json({
        integration: "Warehouse Fulfillment Integration",
        orders,
        quota: toApiKeyQuotaResponse(apiKeyQuota),
      });
    } else {
      sendApiKeyQuotaExhausted(res, apiKeyQuota);
      return;
    }
  });

  return router;
}
