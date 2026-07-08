import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import inventoryService from "../services/InventoryService.js";
import AuditService from "../services/AuditService.js";
import { Types } from "mongoose";

// ── helper: build actor from req.user ────────────────────────────────────────
const toActor = (user) => ({
  userId: user?._id ?? user?.id ?? null,
  name:   user?.name ?? user?.email ?? 'Unknown',
  role:   user?.role ?? 'unknown',
})

// ─── Super Admin: Get all inventory across all branches ───────────────────
const getAllInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getAllInventory();
  return res.status(200).json(new ApiResponse(200, inventory, "Inventory fetched successfully"));
});

// ─── Branch Admin: Get inventory for their branch ─────────────────────────
const getBranchInventory = asyncHandler(async (req, res) => {
  const branchId = req.user.id;
  const inventory = await inventoryService.getBranchInventory(branchId);
  return res.status(200).json(new ApiResponse(200, inventory, "Branch inventory fetched successfully"));
});

// ─── Super Admin: Get inventory for a specific branch (by param) ──────────
const getBranchInventoryById = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getBranchInventory(req.params.branchId);
  return res.status(200).json(new ApiResponse(200, inventory, "Branch inventory fetched successfully"));
});

// ─── Public: Get in-stock product IDs for a branch ────────────────────────
const getInStockProductIds = asyncHandler(async (req, res) => {
  const { branchId } = req.params

  if (!Types.ObjectId.isValid(branchId)) {
    return res.status(200).json(new ApiResponse(200, { inStockIds: [] }, 'Invalid branchId'))
  }

  const inventory = await inventoryService.getBranchInventory(branchId)

  const inStockIds = inventory
    .filter(i => i.quantity > 0 && (i.productId?._id || i.productId) != null)
    .map(i => (i.productId?._id || i.productId).toString())

  return res.status(200).json(new ApiResponse(200, { inStockIds }, 'OK'))
})

// ─── Branch Admin / Super Admin: Set stock for a product ─────────────────
const setStock = asyncHandler(async (req, res) => {
  const { productId, quantity, lowStockThreshold } = req.body;
  const branchId = req.user.role === "admin" ? req.body.branchId : req.user.id;
  if (!branchId)  throw new ApiError(400, "branchId is required");
  if (!productId) throw new ApiError(400, "productId is required");
  if (quantity === undefined || quantity === null) throw new ApiError(400, "quantity is required");

  // ── snapshot before ──────────────────────────────────────────
  const existing = await inventoryService.getBranchInventory(branchId)
  const before   = existing.find(i => (i.productId?._id || i.productId)?.toString() === productId)
  const beforeSnapshot = before ? { quantity: before.quantity, lowStockThreshold: before.lowStockThreshold } : null
  // ────────────────────────────────────────────────────────────

  const inventory = await inventoryService.setStock(branchId, productId, quantity, lowStockThreshold);

  // ── AUDIT ────────────────────────────────────────────────────
  await AuditService.logInventoryUpdated(
    toActor(req.user),
    { _id: productId, name: inventory?.productId?.name ?? productId },
    beforeSnapshot,
    { quantity, lowStockThreshold },
    branchId
  )
  // ────────────────────────────────────────────────────────────

  return res.status(200).json(new ApiResponse(200, inventory, "Inventory updated successfully"));
});

// ─── Branch Admin: Restock (add to existing quantity) ─────────────────────
const restock = asyncHandler(async (req, res) => {
  const { productId, addQuantity } = req.body;
  const branchId = req.user.id;
  if (!productId || addQuantity === undefined) throw new ApiError(400, "productId and addQuantity are required");
  if (addQuantity <= 0) throw new ApiError(400, "addQuantity must be greater than 0");

  // ── snapshot before ──────────────────────────────────────────
  const existing = await inventoryService.getBranchInventory(branchId)
  const before   = existing.find(i => (i.productId?._id || i.productId)?.toString() === productId)
  const beforeQty = before?.quantity ?? null
  // ────────────────────────────────────────────────────────────

  const inventory = await inventoryService.restock(branchId, productId, addQuantity);
  if (!inventory) throw new ApiError(404, "Inventory record not found — use set stock to create it first");

  // ── AUDIT ────────────────────────────────────────────────────
  await AuditService.logInventoryUpdated(
    toActor(req.user),
    { _id: productId, name: inventory?.productId?.name ?? productId },
    { quantity: beforeQty },
    { quantity: inventory.quantity, addQuantity },
    branchId
  )
  // ────────────────────────────────────────────────────────────

  return res.status(200).json(new ApiResponse(200, inventory, "Inventory restocked successfully"));
});

// ─── Internal: Deduct inventory (called from AppointmentService) ──────────
const deduct = asyncHandler(async (req, res) => {
  const { branchId, productId, quantity } = req.body;
  if (!branchId || !productId || !quantity) throw new ApiError(400, "branchId, productId, and quantity are required");
  const inventory = await inventoryService.deduct(branchId, productId, quantity);
  if (!inventory) throw new ApiError(404, "Inventory record not found");
  return res.status(200).json(new ApiResponse(200, inventory, "Inventory deducted successfully"));
});

// ─── Get low stock items for a branch ─────────────────────────────────────
const getLowStock = asyncHandler(async (req, res) => {
  const branchId = req.user.role === "admin" ? req.params.branchId || null : req.user.id;
  const items = await inventoryService.getLowStock(branchId);
  return res.status(200).json(new ApiResponse(200, items, "Low stock items fetched successfully"));
});

// ─── Remove product from branch inventory ─────────────────────────────────
const removeFromBranch = asyncHandler(async (req, res) => {
  const branchId = req.user.role === "admin" ? req.query.branchId || req.user.id : req.user.id;

  // ── snapshot before ──────────────────────────────────────────
  const existing = await inventoryService.getBranchInventory(branchId)
  const item = existing.find(i => (i.productId?._id || i.productId)?.toString() === req.params.productId)
  // ────────────────────────────────────────────────────────────

  const inventory = await inventoryService.removeFromBranch(branchId, req.params.productId);

  // ── AUDIT ────────────────────────────────────────────────────
  if (item) {
    await AuditService.logInventoryDeleted(
      toActor(req.user),
      { _id: req.params.productId, name: item?.productId?.name ?? req.params.productId },
      branchId
    )
  }
  // ────────────────────────────────────────────────────────────

  return res.status(200).json(new ApiResponse(200, inventory, "Product removed from branch inventory"));
});

export {
  getAllInventory,
  getBranchInventory,
  getBranchInventoryById,
  getInStockProductIds,
  setStock,
  restock,
  deduct,
  getLowStock,
  removeFromBranch,
};