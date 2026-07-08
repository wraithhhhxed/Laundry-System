import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import productService from "../services/ProductService.js";

// ─── Super Admin: Create Product ───────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category } = req.body;

  if (!name || !price || !category) {
    throw new ApiError(400, "Name, price, and category are required");
  }

  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.buffer, "products");
  }

  const product = await productService.createProduct({
    name,
    description,
    price,
    category,
    image: imageUrl,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

// ─── Super Admin: Get All Products ────────────────────────────────────────
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products fetched successfully"));
});

// ─── Public / User: Get Active Products ───────────────────────────────────
const getActiveProducts = asyncHandler(async (req, res) => {
  const products = await productService.getActiveProducts();

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products fetched successfully"));
});

// ─── Super Admin: Get Single Product ──────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});

// ─── Super Admin: Update Product ──────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, isActive } = req.body;

  const updateData = { name, description, price, category, isActive };

  if (req.file) {
    updateData.image = await uploadToCloudinary(req.file.buffer, "products");
  }

  const product = await productService.updateProduct(req.params.id, updateData);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

// ─── Super Admin: Toggle isActive ─────────────────────────────────────────
const toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await productService.toggleActive(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const msg = product.isActive ? "Product activated" : "Product deactivated";
  return res.status(200).json(new ApiResponse(200, product, msg));
});

// ─── Super Admin: Delete Product ──────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

export {
  createProduct,
  getAllProducts,
  getActiveProducts,
  getProductById,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
};