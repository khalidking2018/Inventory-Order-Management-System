from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .routers import products, customers, orders
from . import crud, schemas

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend API for managing products, customers, and orders with strict stock transactions.",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local testing and container proxying
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(products.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

@app.get("/api/dashboard", response_model=schemas.DashboardSummary, tags=["dashboard"])
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Retrieve aggregated dashboard statistics: total products, customers, orders,
    and a list of items running low in stock.
    """
    return crud.get_dashboard_summary(db)

@app.get("/", tags=["root"])
def read_root():
    return {
        "project": "Inventory & Order Management System API",
        "status": "online",
        "documentation": "/docs"
    }
