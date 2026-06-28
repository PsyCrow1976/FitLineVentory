from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import admin, auth, inventory, products, sources

app = FastAPI(
    title="FitLineVentory API",
    description="Personal inventory for FitLine and other product sources",
    version="0.3.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

image_dir = Path(settings.image_storage_path)
image_dir.mkdir(parents=True, exist_ok=True)

api = FastAPI()
api.include_router(auth.router)
api.include_router(sources.router)
api.include_router(products.router)
api.include_router(inventory.router)
api.include_router(admin.router)
api.mount("/media/products", StaticFiles(directory=str(image_dir)), name="product-images")

app.mount("/api/v1", api)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}