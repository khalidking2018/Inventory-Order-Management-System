from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas

# ==========================================
# PRODUCT CRUD
# ==========================================

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).order_by(models.Product.id).offset(skip).limit(limit).all()

def create_product(db: Session, product_in: schemas.ProductCreate):
    db_product = models.Product(
        name=product_in.name,
        sku=product_in.sku,
        price=product_in.price,
        quantity=product_in.quantity
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, db_product: models.Product, product_in: schemas.ProductUpdate):
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    # Check if the product is associated with any order items
    order_item_exists = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if order_item_exists:
        raise ValueError("Product is linked to existing orders and cannot be deleted.")
        
    db.delete(db_product)
    db.commit()
    return db_product


# ==========================================
# CUSTOMER CRUD
# ==========================================

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).order_by(models.Customer.id).offset(skip).limit(limit).all()

def create_customer(db: Session, customer_in: schemas.CustomerCreate):
    db_customer = models.Customer(
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None
        
    # Check if customer has orders
    order_exists = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if order_exists:
        raise ValueError("Customer has active orders and cannot be deleted.")
        
    db.delete(db_customer)
    db.commit()
    return db_customer


# ==========================================
# ORDER CRUD (WITH TRANSACTION INTEGRITY)
# ==========================================

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    # Verify customer exists
    customer = get_customer(db, order_in.customer_id)
    if not customer:
        raise ValueError("Customer not found.")
        
    db_order_items = []
    total_amount = 0.0
    
    try:
        # Loop through order items, lock product records to prevent race conditions
        for item in order_in.items:
            # .with_for_update() locks the row until the transaction commits/rolls back
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise ValueError(f"Product with ID {item.product_id} not found.")
                
            if product.quantity < item.quantity:
                raise ValueError(
                    f"Insufficient stock for '{product.name}' (SKU: {product.sku}). "
                    f"Available: {product.quantity}, Requested: {item.quantity}."
                )
                
            # Deduct stock
            product.quantity -= item.quantity
            item_total = product.price * item.quantity
            total_amount += item_total
            
            # Create order item record
            db_order_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                price_at_order=product.price
            )
            db_order_items.append(db_order_item)
            
        # Create order
        db_order = models.Order(
            customer_id=order_in.customer_id,
            total_amount=total_amount
        )
        db.add(db_order)
        db.flush() # Fetch db_order.id
        
        # Link order items to order and add to db
        for db_order_item in db_order_items:
            db_order_item.order_id = db_order.id
            db.add(db_order_item)
            
        db.commit()
        db.refresh(db_order)
        return db_order
        
    except Exception as e:
        db.rollback()
        raise e

def delete_order(db: Session, order_id: int):
    db_order = get_order(db, order_id)
    if not db_order:
        return None
        
    try:
        # Restore stock for each item in the order
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if product:
                product.quantity += item.quantity
                
        # Delete order (cascades to order items)
        db.delete(db_order)
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise e


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

def get_dashboard_summary(db: Session, low_stock_limit: int = 10):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    low_stock_products = db.query(models.Product).filter(models.Product.quantity < low_stock_limit).all()
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_products": low_stock_products
    }
