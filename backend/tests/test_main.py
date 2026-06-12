import unittest
import os
import sys

# Add backend directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment database URL before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Product, Customer, Order, OrderItem

class TestInventoryAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create the tables in the test database
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop the tables in the test database and remove file
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
            except Exception as e:
                print(f"Warning: Could not remove test.db: {e}")

    def setUp(self):
        # Clear database between tests
        db = SessionLocal()
        db.query(OrderItem).delete()
        db.query(Order).delete()
        db.query(Product).delete()
        db.query(Customer).delete()
        db.commit()
        db.close()

    def test_create_product(self):
        # Test valid product creation
        response = self.client.post("/api/products/", json={
            "name": "Widget A",
            "sku": "WIDG-A-001",
            "price": 10.99,
            "quantity": 100
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Widget A")
        self.assertEqual(data["sku"], "WIDG-A-001")
        self.assertEqual(data["price"], 10.99)
        self.assertEqual(data["quantity"], 100)
        self.assertIn("id", data)

        # Test duplicate SKU error
        response2 = self.client.post("/api/products/", json={
            "name": "Widget B",
            "sku": "WIDG-A-001",
            "price": 5.0,
            "quantity": 50
        })
        self.assertEqual(response2.status_code, 400)
        self.assertIn("already exists", response2.json()["detail"])

        # Test negative price/quantity validation (handled by Pydantic)
        response3 = self.client.post("/api/products/", json={
            "name": "Widget C",
            "sku": "WIDG-C-003",
            "price": -1.0,
            "quantity": 10
        })
        self.assertEqual(response3.status_code, 422) # Unprocessable Entity

        response4 = self.client.post("/api/products/", json={
            "name": "Widget C",
            "sku": "WIDG-C-003",
            "price": 1.0,
            "quantity": -5
        })
        self.assertEqual(response4.status_code, 422)

    def test_get_and_update_product(self):
        # Create product
        post_response = self.client.post("/api/products/", json={
            "name": "Gadget A",
            "sku": "GADG-A-001",
            "price": 15.0,
            "quantity": 20
        })
        product_id = post_response.json()["id"]

        # Get product
        get_response = self.client.get(f"/api/products/{product_id}")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["name"], "Gadget A")

        # Update product
        put_response = self.client.put(f"/api/products/{product_id}", json={
            "name": "Updated Gadget A",
            "price": 17.5,
            "quantity": 25
        })
        self.assertEqual(put_response.status_code, 200)
        data = put_response.json()
        self.assertEqual(data["name"], "Updated Gadget A")
        self.assertEqual(data["price"], 17.5)
        self.assertEqual(data["quantity"], 25)
        self.assertEqual(data["sku"], "GADG-A-001") # remains unchanged

        # Delete product
        del_response = self.client.delete(f"/api/products/{product_id}")
        self.assertEqual(del_response.status_code, 200)

        # Confirm deletion
        get_deleted = self.client.get(f"/api/products/{product_id}")
        self.assertEqual(get_deleted.status_code, 404)

    def test_create_customer(self):
        # Create customer
        response = self.client.post("/api/customers/", json={
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "1234567890"
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "John Doe")
        self.assertEqual(data["email"], "john@example.com")
        self.assertIn("id", data)

        # Duplicate email test
        response2 = self.client.post("/api/customers/", json={
            "name": "Jane Doe",
            "email": "john@example.com",
            "phone": "0987654321"
        })
        self.assertEqual(response2.status_code, 400)
        self.assertIn("already exists", response2.json()["detail"])

        # Invalid email format (Pydantic validation)
        response3 = self.client.post("/api/customers/", json={
            "name": "Jane Doe",
            "email": "not-an-email",
            "phone": "0987654321"
        })
        self.assertEqual(response3.status_code, 422)

    def test_order_creation_and_stock_reduction(self):
        # Create product & customer
        prod_resp = self.client.post("/api/products/", json={
            "name": "Item A",
            "sku": "ITEM-A",
            "price": 100.0,
            "quantity": 10
        })
        product_id = prod_resp.json()["id"]

        cust_resp = self.client.post("/api/customers/", json={
            "name": "Customer A",
            "email": "cust_a@example.com",
            "phone": "111111"
        })
        customer_id = cust_resp.json()["id"]

        # Place order
        order_resp = self.client.post("/api/orders/", json={
            "customer_id": customer_id,
            "items": [
                {"product_id": product_id, "quantity": 3}
            ]
        })
        self.assertEqual(order_resp.status_code, 201)
        order_data = order_resp.json()
        self.assertEqual(order_data["total_amount"], 300.0)
        self.assertEqual(len(order_data["items"]), 1)
        self.assertEqual(order_data["items"][0]["quantity"], 3)
        self.assertEqual(order_data["items"][0]["price_at_order"], 100.0)

        # Verify stock decreased
        prod_get = self.client.get(f"/api/products/{product_id}")
        self.assertEqual(prod_get.json()["quantity"], 7)

        # Try to order more than available stock
        order_fail_resp = self.client.post("/api/orders/", json={
            "customer_id": customer_id,
            "items": [
                {"product_id": product_id, "quantity": 8}
            ]
        })
        self.assertEqual(order_fail_resp.status_code, 400)
        self.assertIn("Insufficient stock", order_fail_resp.json()["detail"])

        # Verify stock did not change
        prod_get = self.client.get(f"/api/products/{product_id}")
        self.assertEqual(prod_get.json()["quantity"], 7)

    def test_cancel_order_restores_stock(self):
        # Create product, customer, and order
        prod_resp = self.client.post("/api/products/", json={
            "name": "Item B",
            "sku": "ITEM-B",
            "price": 50.0,
            "quantity": 15
        })
        product_id = prod_resp.json()["id"]

        cust_resp = self.client.post("/api/customers/", json={
            "name": "Customer B",
            "email": "cust_b@example.com",
            "phone": "222222"
        })
        customer_id = cust_resp.json()["id"]

        order_resp = self.client.post("/api/orders/", json={
            "customer_id": customer_id,
            "items": [
                {"product_id": product_id, "quantity": 5}
            ]
        })
        order_id = order_resp.json()["id"]

        # Cancel/Delete the order
        del_resp = self.client.delete(f"/api/orders/{order_id}")
        self.assertEqual(del_resp.status_code, 200)

        # Check stock is restored to 15
        prod_get = self.client.get(f"/api/products/{product_id}")
        self.assertEqual(prod_get.json()["quantity"], 15)

    def test_delete_product_or_customer_with_orders_fails(self):
        # Create product, customer, and order
        prod_resp = self.client.post("/api/products/", json={
            "name": "Item C",
            "sku": "ITEM-C",
            "price": 50.0,
            "quantity": 15
        })
        product_id = prod_resp.json()["id"]

        cust_resp = self.client.post("/api/customers/", json={
            "name": "Customer C",
            "email": "cust_c@example.com",
            "phone": "333333"
        })
        customer_id = cust_resp.json()["id"]

        order_resp = self.client.post("/api/orders/", json={
            "customer_id": customer_id,
            "items": [
                {"product_id": product_id, "quantity": 2}
            ]
        })
        
        # Try deleting product, should fail
        del_prod = self.client.delete(f"/api/products/{product_id}")
        self.assertEqual(del_prod.status_code, 400)
        self.assertIn("linked to existing orders", del_prod.json()["detail"])

        # Try deleting customer, should fail
        del_cust = self.client.delete(f"/api/customers/{customer_id}")
        self.assertEqual(del_cust.status_code, 400)
        self.assertIn("active orders", del_cust.json()["detail"])

    def test_dashboard_summary(self):
        # Create product, customer, and order
        self.client.post("/api/products/", json={
            "name": "Low Stock Item",
            "sku": "LOW-001",
            "price": 10.0,
            "quantity": 3
        })
        self.client.post("/api/products/", json={
            "name": "High Stock Item",
            "sku": "HIGH-001",
            "price": 20.0,
            "quantity": 20
        })
        self.client.post("/api/customers/", json={
            "name": "Customer D",
            "email": "cust_d@example.com",
            "phone": "444444"
        })
        
        dash_resp = self.client.get("/api/dashboard")
        self.assertEqual(dash_resp.status_code, 200)
        data = dash_resp.json()
        self.assertEqual(data["total_products"], 2)
        self.assertEqual(data["total_customers"], 1)
        self.assertEqual(data["total_orders"], 0)
        self.assertEqual(len(data["low_stock_products"]), 1)
        self.assertEqual(data["low_stock_products"][0]["sku"], "LOW-001")

if __name__ == "__main__":
    unittest.main()
