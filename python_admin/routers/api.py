"""
=============================================================================
Lumively — API Router (v1)
=============================================================================
Handles all REST API endpoints for:
  - Product CRUD operations
  - CJ Dropshipping integration (query, import, bulk import, fulfillment)
  - AI copy rewriting
  - Chatbot (consolidated from former ai_chat.py)

All endpoints are authenticated via JWT cookie/Bearer token.
All endpoints use request.app.state.prisma (no standalone Prisma instances).
=============================================================================
"""

from __future__ import annotations

import json
import shutil
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from loguru import logger
from pydantic import BaseModel, Field

from auth import verify_credentials
from services.ai_service import generate_product_copy
from services.chat_agent import chat_with_agent
from services.cj_service import (
    bulk_import_from_text,
    calculate_prices,
    create_cj_order,
    get_cj_order_status,
    query_cj_product,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["API"],
    dependencies=[Depends(verify_credentials)],
)


# =============================================================================
# Request/Response Models
# =============================================================================
class StandardResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None


class ProductUpdate(BaseModel):
    """Request model for updating a product."""
    productName: Optional[str] = None
    sellPrice: Optional[float] = None
    originalPrice: Optional[float] = None
    costPrice: Optional[float] = None
    inventory: Optional[int] = None
    categoryName: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    productImage: Optional[str] = None
    productImages: Optional[List[str]] = None
    productVideo: Optional[str] = None
    uploadedVideo: Optional[str] = None
    tagline: Optional[str] = None


class ReorderRequest(BaseModel):
    """Request model for moving a product up or down."""
    direction: str = Field(..., description="'up' or 'down'")


class ImportRequest(BaseModel):
    """Request model for single CJ product import."""
    spu: str = Field(..., description="CJ SPU/PID code to import")


class BulkImportRequest(BaseModel):
    """Request model for bulk CJ product import from raw text."""
    raw_text: str = Field(
        ...,
        description="Raw text containing CJ SPU codes in any format",
    )


class FulfillmentRequest(BaseModel):
    """Request model for triggering CJ order fulfillment."""
    order_id: str = Field(..., description="Internal order ID to fulfill")


class RewriteRequest(BaseModel):
    """Request model for AI product copy rewrite."""
    title: str
    description: str


class ChatRequest(BaseModel):
    """Request model for the AI chatbot."""
    messages: List[Dict[str, Any]] = Field(
        ..., description="Conversation messages array"
    )


# =============================================================================
# Upload Endpoints
# =============================================================================
from fastapi.responses import Response
import base64

@router.post("/upload-media", response_model=StandardResponse)
async def upload_media(request: Request, file: UploadFile = File(...)) -> StandardResponse:
    """Upload a video or image file to the database (Media table)."""
    try:
        prisma = request.app.state.prisma
        file_bytes = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        
        # Prisma Python expects Base64 encoded strings for Bytes fields
        encoded_data = base64.b64encode(file_bytes).decode('utf-8')
        
        media_record = await prisma.media.create(
            data={
                "filename": file.filename or "uploaded_media",
                "mimeType": mime_type,
                "data": encoded_data
            }
        )
        return StandardResponse(success=True, data={"url": f"/api/v1/media/{media_record.id}"})
    except Exception as e:
        logger.error(f"Failed to upload media: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/media/{media_id}")
async def get_media(media_id: str, request: Request):
    """Retrieve media from the database."""
    prisma = request.app.state.prisma
    media_record = await prisma.media.find_unique(where={"id": media_id})
    if not media_record:
        raise HTTPException(status_code=404, detail="Media not found")
        
    # Decode the Base64 string back to bytes for the response
    decoded_data = base64.b64decode(media_record.data)
    
    return Response(content=decoded_data, media_type=media_record.mimeType)

# =============================================================================
# Product Endpoints
# =============================================================================
@router.get("/products/{pid}", response_model=StandardResponse)
async def get_product(pid: str, request: Request) -> StandardResponse:
    """Get a single product by its PID (CJ product identifier)."""
    prisma = request.app.state.prisma
    product = await prisma.product.find_unique(where={"pid": pid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return StandardResponse(success=True, data=product.model_dump())


@router.put("/products/{pid}", response_model=StandardResponse)
async def update_product(
    pid: str, data: ProductUpdate, request: Request
) -> StandardResponse:
    """Update a product by its PID."""
    prisma = request.app.state.prisma
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    try:
        updated = await prisma.product.update(
            where={"pid": pid},
            data=update_data,
        )
        return StandardResponse(success=True, data=updated.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/products/{pid}", response_model=StandardResponse)
async def delete_product(pid: str, request: Request) -> StandardResponse:
    """Delete a product by its PID."""
    prisma = request.app.state.prisma
    try:
        await prisma.product.delete(where={"pid": pid})
        return StandardResponse(success=True, message="Product deleted")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/products/{pid}/reorder", response_model=StandardResponse)
async def reorder_product(
    pid: str, req: ReorderRequest, request: Request
) -> StandardResponse:
    """Move a product up or down the catalog."""
    prisma = request.app.state.prisma
    
    # Fetch all products sorted
    all_products = await prisma.product.find_many(
        order=[
            {"manualSortOrder": "asc"},
            {"listCount": "desc"}
        ]
    )
    
    if not all_products:
        return StandardResponse(success=False, message="No products found")

    # Initialize manualSortOrder for products that don't have it
    needs_update = False
    for idx, p in enumerate(all_products):
        if p.manualSortOrder is None or p.manualSortOrder != idx:
            p.manualSortOrder = idx
            needs_update = True
            
    if needs_update:
        for p in all_products:
            await prisma.product.update(
                where={"id": p.id},
                data={"manualSortOrder": p.manualSortOrder}
            )

    curr_idx = next((i for i, p in enumerate(all_products) if p.pid == pid), -1)
    if curr_idx == -1:
        raise HTTPException(status_code=404, detail="Product not found")

    swap_idx = curr_idx - 1 if req.direction == "up" else curr_idx + 1
    
    if 0 <= swap_idx < len(all_products):
        curr_p = all_products[curr_idx]
        swap_p = all_products[swap_idx]
        
        await prisma.product.update(
            where={"id": curr_p.id},
            data={"manualSortOrder": swap_p.manualSortOrder}
        )
        await prisma.product.update(
            where={"id": swap_p.id},
            data={"manualSortOrder": curr_p.manualSortOrder}
        )
        
        return StandardResponse(success=True, message="Reordered successfully")
    else:
        return StandardResponse(success=False, message="Cannot move further")


# =============================================================================
# CJ Dropshipping Endpoints
# =============================================================================
@router.get("/cj/query_spu", response_model=StandardResponse)
async def query_spu_api(spu: str, request: Request) -> StandardResponse:
    """Query a CJ product by SPU/PID code (read-only, no import)."""
    res = await query_cj_product(spu)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return StandardResponse(success=True, data=res.get("product"))


@router.post("/cj/import", response_model=StandardResponse)
async def import_cj_product_api(
    req: ImportRequest, request: Request
) -> StandardResponse:
    """
    Import a single CJ product by SPU code.

    Workflow:
    1. Query CJ for product data
    2. Run AI rewrite on title/description
    3. Apply dynamic pricing: (cost + $15) × 2.0 retail, × 3.0 strikethrough
    4. Save to database (create or update)
    """
    prisma = request.app.state.prisma
    spu = req.spu

    # Step 1: Query CJ for the raw product data
    res = await query_cj_product(spu)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))

    cj_prod = res["product"]

    # Step 2: AI rewrite of title and description
    ai_copy = await generate_product_copy(
        cj_prod.get("productName", ""),
        cj_prod.get("description", ""),
        spu,
    )

    # Step 3: Dynamic pricing engine
    cj_cost = float(cj_prod.get("sellPrice", cj_prod.get("productPriceMin", 12.0)))
    prices = calculate_prices(cj_cost)

    # Step 4: Extract media arrays properly
    product_images: list[str] = []
    if cj_prod.get("productImageSet"):
        product_images = [
            img.get("imageUrl", "")
            for img in cj_prod["productImageSet"]
            if img.get("imageUrl")
        ]
    elif cj_prod.get("productImage"):
        product_images = [cj_prod["productImage"]]

    video_list: list[str] = []
    if cj_prod.get("videoList"):
        video_list = [
            v.get("videoUrl", "")
            for v in cj_prod["videoList"]
            if v.get("videoUrl")
        ]

    # Build the product data for database
    prod_data: dict[str, Any] = {
        "pid": cj_prod.get("pid", spu),
        "cjSpuCode": spu,
        "productName": ai_copy.get("title", cj_prod.get("productName", "")),
        "productSku": cj_prod.get("productSku", f"LV-CJ-{spu}"),
        "sellPrice": prices["retail"],
        "originalPrice": prices["strikethrough"],
        "costPrice": prices["cost"],
        "inventory": int(cj_prod.get("inventory", 100)),
        "categoryName": cj_prod.get("categoryName", "General"),
        "productImage": cj_prod.get("productImage", ""),
        "productImages": product_images,  # Proper String[] array
        "productVideo": video_list[0] if video_list else None,
        "cjVideoList": video_list,  # Proper String[] array
        "description": ai_copy.get("description", cj_prod.get("description", "")),
        "highlights": ai_copy.get(
            "highlights",
            ["Clinically tested", "Fast shipping", "Premium quality", "Guaranteed"],
        ),
        "tagline": ai_copy.get("tagline", ""),
    }

    # Create or update in database
    existing = await prisma.product.find_first(where={"pid": cj_prod.get("pid", spu)})
    if existing:
        saved = await prisma.product.update(
            where={"pid": cj_prod.get("pid", spu)},
            data=prod_data,
        )
    else:
        saved = await prisma.product.create(data=prod_data)

    logger.info(
        f"✓ CJ product imported: {spu} → {prod_data['productName']} "
        f"(${prices['cost']} → ${prices['retail']} retail)"
    )
    return StandardResponse(success=True, data=saved.model_dump())


@router.post("/cj/bulk-import", response_model=StandardResponse)
async def bulk_import_cj_products(
    req: BulkImportRequest, request: Request
) -> StandardResponse:
    """
    The Magic Bulk SPU Importer.

    Accepts raw text containing CJ SPU codes in any format. Uses regex to
    extract codes, queries CJ for each, applies dynamic pricing, and saves
    all products to the database.

    The AI rewrite is NOT applied during bulk import to avoid rate limiting.
    Use the /gemini/rewrite endpoint separately for AI copy generation.
    """
    prisma = request.app.state.prisma

    # Extract and query all SPU codes from the raw text
    results = await bulk_import_from_text(req.raw_text)

    if not results:
        return StandardResponse(
            success=False,
            message="No SPU codes found in the provided text",
        )

    # Save each successful product to the database
    saved: list[dict] = []
    errors: list[dict] = []

    for item in results:
        if not item["success"]:
            errors.append({"spu": item["spu"], "error": item["error"]})
            continue

        prod_data = item["product"]
        try:
            existing = await prisma.product.find_first(
                where={"pid": prod_data["pid"]}
            )
            if existing:
                saved_product = await prisma.product.update(
                    where={"pid": prod_data["pid"]},
                    data=prod_data,
                )
            else:
                saved_product = await prisma.product.create(data=prod_data)
            saved.append(saved_product.model_dump())
        except Exception as e:
            errors.append({"spu": item["spu"], "error": str(e)})

    return StandardResponse(
        success=len(saved) > 0,
        message=f"Imported {len(saved)} products, {len(errors)} errors",
        data={"imported": saved, "errors": errors},
    )


@router.post("/cj/fulfill/{order_id}", response_model=StandardResponse)
async def fulfill_order_via_cj(
    order_id: str, request: Request
) -> StandardResponse:
    """
    Trigger CJ Dropshipping fulfillment for a pending order.

    Creates the order on CJ with payType=2 (wallet auto-deduction).
    Updates the internal order status to 'Fulfilled' and stores the CJ order ID.
    """
    prisma = request.app.state.prisma

    # Fetch the order with its items
    order = await prisma.order.find_unique(
        where={"id": order_id},
        include={"items": True},
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.cjOrderId:
        return StandardResponse(
            success=True,
            message=f"Order already fulfilled. CJ Order ID: {order.cjOrderId}",
        )

    # Build CJ-compatible shipping info
    shipping_info = {
        "firstName": order.customerName.split()[0] if order.customerName else "",
        "lastName": (
            " ".join(order.customerName.split()[1:])
            if order.customerName
            else ""
        ),
        "phone": order.shippingPhone or "",
        "address": order.shippingAddress,
        "city": order.shippingCity,
        "province": order.shippingState,
        "zip": order.shippingZip,
        "country": order.shippingCountry,
    }

    # Build line items (only items with CJ variant IDs)
    line_items = [
        {"vid": item.vid, "quantity": item.quantity}
        for item in order.items
        if item.vid
    ]

    if not line_items:
        raise HTTPException(
            status_code=400,
            detail="No items with CJ variant IDs (vid) on this order",
        )

    # Create the CJ order
    result = await create_cj_order(
        order_id=order.orderNumber,
        shipping_info=shipping_info,
        line_items=line_items,
    )

    if result["success"]:
        # Update our order record
        await prisma.order.update(
            where={"id": order_id},
            data={
                "cjOrderId": result["cj_order_id"],
                "status": "Fulfilled",
            },
        )
        return StandardResponse(
            success=True,
            message="Order fulfilled via CJ Dropshipping",
            data={
                "cj_order_id": result["cj_order_id"],
                "payment_method": "Wallet auto-deduction (payType=2)",
            },
        )

    raise HTTPException(
        status_code=500,
        detail=f"CJ fulfillment failed: {result['error']}",
    )


@router.get("/cj/order-status/{cj_order_id}", response_model=StandardResponse)
async def check_cj_order_status(
    cj_order_id: str, request: Request
) -> StandardResponse:
    """Check the status of a CJ order by its CJ order ID."""
    result = await get_cj_order_status(cj_order_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return StandardResponse(success=True, data=result["order"])


# =============================================================================
# AI Endpoints
# =============================================================================
@router.post("/gemini/rewrite", response_model=StandardResponse)
async def rewrite_product_api(req: RewriteRequest) -> StandardResponse:
    """
    Run AI rewrite on raw product title and description.
    Returns premium e-commerce copy with title, description, highlights, tagline.
    """
    ai_copy = await generate_product_copy(req.title, req.description)
    return StandardResponse(success=True, data=ai_copy)


# =============================================================================
# Chatbot Endpoint (Consolidated — replaces former ai_chat.py router)
# =============================================================================
@router.post("/chat", response_model=StandardResponse)
async def chat_api(req: ChatRequest, request: Request) -> StandardResponse:
    """
    AI Chatbot with LLM tool calling.

    Accepts a conversation history and returns the assistant's response.
    The chatbot can autonomously execute backend tools (search products,
    post social ads, send emails, trigger fulfillment, etc.) based on
    natural language queries.
    """
    prisma = request.app.state.prisma
    response_message = await chat_with_agent(req.messages, prisma)
    return StandardResponse(success=True, data=response_message)
