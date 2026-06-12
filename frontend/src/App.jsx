import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  X, 
  DollarSign, 
  Calendar, 
  Info,
  Layers
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_products: []
  });

  // Search terms
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchOrder, setSearchOrder] = useState('');

  // Toast notification
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', data: null });
  const [customerModal, setCustomerModal] = useState({ open: false, data: null });
  const [orderModal, setOrderModal] = useState({ open: false });
  const [orderDetailModal, setOrderDetailModal] = useState({ open: false, data: null });

  // Form states
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', quantity: '' });
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [orderForm, setOrderForm] = useState({ customer_id: '', items: [{ product_id: '', quantity: 1 }] });

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchData = async () => {
    try {
      const [dashRes, prodRes, custRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/products/`),
        fetch(`${API_BASE}/customers/`),
        fetch(`${API_BASE}/orders/`)
      ]);

      if (dashRes.ok) setDashboard(await dashRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch (err) {
      addToast('Error fetching database data', 'danger');
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Product Actions
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const url = productModal.mode === 'create' 
      ? `${API_BASE}/products/` 
      : `${API_BASE}/products/${productModal.data.id}`;
    const method = productModal.mode === 'create' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          sku: productForm.sku,
          price: parseFloat(productForm.price),
          quantity: parseInt(productForm.quantity)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to save product');

      addToast(`Product successfully ${productModal.mode === 'create' ? 'created' : 'updated'}!`);
      setProductModal({ open: false, mode: 'create', data: null });
      setProductForm({ name: '', sku: '', price: '', quantity: '' });
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  const handleEditProduct = (product) => {
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: product.quantity
    });
    setProductModal({ open: true, mode: 'edit', data: product });
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to delete product');
      addToast('Product successfully deleted.');
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  // Customer Actions
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/customers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create customer');

      addToast('Customer successfully created!');
      setCustomerModal({ open: false, data: null });
      setCustomerForm({ name: '', email: '', phone: '' });
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const response = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to delete customer');
      addToast('Customer successfully deleted.');
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  // Order Actions
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    // Validate order entries
    if (!orderForm.customer_id) {
      addToast('Please select a customer', 'danger');
      return;
    }
    const cleanItems = orderForm.items.filter(item => item.product_id && item.quantity > 0);
    if (cleanItems.length === 0) {
      addToast('Please add at least one valid product item', 'danger');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(orderForm.customer_id),
          items: cleanItems.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity) }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to place order');

      addToast('Order placed successfully!');
      setOrderModal({ open: false });
      setOrderForm({ customer_id: '', items: [{ product_id: '', quantity: 1 }] });
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  const handleCancelOrder = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this order? This will restock the products.')) return;
    try {
      const response = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to cancel order');
      addToast('Order cancelled and inventory restored.');
      fetchData();
    } catch (err) {
      addToast(err.message, 'danger');
    }
  };

  const addOrderItemField = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1 }]
    }));
  };

  const removeOrderItemField = (index) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateOrderItemField = (index, key, value) => {
    setOrderForm(prev => {
      const newItems = [...prev.items];
      newItems[index][key] = value;
      return { ...prev, items: newItems };
    });
  };

  // Filtering lists
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.email.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.id.toString().includes(searchOrder) ||
    o.customer.name.toLowerCase().includes(searchOrder.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"><Layers size={22} /></div>
          <div className="logo-text">IMS Pro</div>
        </div>
        <nav>
          <ul className="nav-links">
            <li>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
              >
                <Layers size={18} />
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('products')}
                className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
              >
                <Package size={18} />
                Products
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('customers')}
                className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
              >
                <Users size={18} />
                Customers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
              >
                <ShoppingCart size={18} />
                Orders
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Dashboard Overview</h1>
                <p className="page-subtitle">Real-time status of your inventory and sales operations.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Products</div>
                  <div className="stat-value">{dashboard.total_products}</div>
                </div>
                <div className="stat-icon primary">
                  <Package size={24} />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Customers</div>
                  <div className="stat-value">{dashboard.total_customers}</div>
                </div>
                <div className="stat-icon success">
                  <Users size={24} />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Orders</div>
                  <div className="stat-value">{dashboard.total_orders}</div>
                </div>
                <div className="stat-icon primary">
                  <ShoppingCart size={24} />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Low Stock Alerts</div>
                  <div className="stat-value" style={{ color: dashboard.low_stock_products.length > 0 ? 'var(--warning)' : 'inherit' }}>
                    {dashboard.low_stock_products.length}
                  </div>
                </div>
                <div className="stat-icon warning">
                  <AlertTriangle size={24} />
                </div>
              </div>
            </div>

            <div className="data-card">
              <div className="data-card-title">
                <span>Low Stock Items Alert</span>
                <span className="badge badge-warning">Threshold &lt; 10 units</span>
              </div>
              
              <div className="table-container">
                {dashboard.low_stock_products.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>All product stocks are healthy!</p>
                ) : (
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Qty in Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.low_stock_products.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><code>{p.sku}</code></td>
                          <td>${p.price.toFixed(2)}</td>
                          <td style={{ color: p.quantity === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>{p.quantity}</td>
                          <td>
                            <span className={p.quantity === 0 ? 'badge badge-danger' : 'badge badge-warning'}>
                              {p.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Products Directory</h1>
                <p className="page-subtitle">Add, edit, or delete items from the product catalog.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setProductModal({ open: true, mode: 'create', data: null })}>
                <Plus size={16} /> Add Product
              </button>
            </div>

            <div className="data-card">
              <div className="filters-bar">
                <input 
                  type="text" 
                  placeholder="Search by product name or SKU..." 
                  className="form-control search-input"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                />
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>In Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No products found.</td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><code>{p.sku}</code></td>
                          <td>${p.price.toFixed(2)}</td>
                          <td style={{ color: p.quantity < 10 ? 'var(--warning)' : 'inherit', fontWeight: p.quantity < 10 ? 700 : 400 }}>
                            {p.quantity}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="action-btn edit" onClick={() => handleEditProduct(p)} title="Edit"><Edit size={16} /></button>
                              <button className="action-btn delete" onClick={() => handleDeleteProduct(p.id)} title="Delete"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Customer Relationship</h1>
                <p className="page-subtitle">Manage registered customers and purchase privileges.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setCustomerModal({ open: true, data: null })}>
                <Plus size={16} /> Add Customer
              </button>
            </div>

            <div className="data-card">
              <div className="filters-bar">
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  className="form-control search-input"
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                />
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td>
                      </tr>
                    ) : (
                      filteredCustomers.map(c => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.email}</td>
                          <td>{c.phone}</td>
                          <td>
                            <div className="table-actions">
                              <button className="action-btn delete" onClick={() => handleDeleteCustomer(c.id)} title="Delete"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Orders Management</h1>
                <p className="page-subtitle">Track, review, or void sales orders.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setOrderModal({ open: true })}>
                <Plus size={16} /> Create Order
              </button>
            </div>

            <div className="data-card">
              <div className="filters-bar">
                <input 
                  type="text" 
                  placeholder="Search by Order ID or Customer Name..." 
                  className="form-control search-input"
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                />
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Name</th>
                      <th>Order Date</th>
                      <th>Total Items</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found.</td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td>#{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.customer.name}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} className="text-muted" />
                              {new Date(o.created_at).toLocaleString()}
                            </span>
                          </td>
                          <td>{o.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            ${o.total_amount.toFixed(2)}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="action-btn edit" onClick={() => setOrderDetailModal({ open: true, data: o })} title="View Details"><Info size={16} /></button>
                              <button className="action-btn delete" onClick={() => handleCancelOrder(o.id)} title="Cancel Order"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal (Create/Edit) */}
      {productModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{productModal.mode === 'create' ? 'Add New Product' : 'Edit Product'}</h3>
              <button className="action-btn" onClick={() => setProductModal({ open: false, mode: 'create', data: null })}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control"
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU Code</label>
                  <input 
                    type="text" 
                    required 
                    disabled={productModal.mode === 'edit'}
                    className="form-control"
                    value={productForm.sku} 
                    onChange={e => setProductForm({...productForm, sku: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                    className="form-control"
                    value={productForm.price} 
                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity in Stock</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    className="form-control"
                    value={productForm.quantity} 
                    onChange={e => setProductForm({...productForm, quantity: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProductModal({ open: false, mode: 'create', data: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {customerModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Customer</h3>
              <button className="action-btn" onClick={() => setCustomerModal({ open: false, data: null })}><X size={18} /></button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control"
                    value={customerForm.name} 
                    onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    className="form-control"
                    value={customerForm.email} 
                    onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control"
                    value={customerForm.phone} 
                    onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCustomerModal({ open: false, data: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {orderModal.open && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h3 className="modal-title">Create Sales Order</h3>
              <button className="action-btn" onClick={() => setOrderModal({ open: false })}><X size={18} /></button>
            </div>
            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer</label>
                  <select 
                    required 
                    className="form-control"
                    value={orderForm.customer_id}
                    onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value })}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Order Line Items</span>
                    <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={addOrderItemField}>
                      + Add Item
                    </button>
                  </label>
                  
                  {orderForm.items.map((item, index) => (
                    <div key={index} className="order-item-row">
                      <div>
                        <select 
                          required 
                          className="form-control"
                          value={item.product_id}
                          onChange={e => updateOrderItemField(index, 'product_id', e.target.value)}
                        >
                          <option value="">Select Product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                              {p.name} - ${p.price.toFixed(2)} ({p.quantity} in stock)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input 
                          type="number" 
                          min="1" 
                          required
                          placeholder="Qty" 
                          className="form-control"
                          value={item.quantity}
                          onChange={e => updateOrderItemField(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <button 
                          type="button" 
                          className="btn btn-danger" 
                          style={{ padding: '10px' }}
                          disabled={orderForm.items.length === 1}
                          onClick={() => removeOrderItemField(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOrderModal({ open: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {orderDetailModal.open && orderDetailModal.data && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h3 className="modal-title">Order #{orderDetailModal.data.id} Details</h3>
              <button className="action-btn" onClick={() => setOrderDetailModal({ open: false, data: null })}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="order-details-grid" style={{ marginBottom: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Customer Info</h4>
                  <p style={{ fontWeight: 600 }}>{orderDetailModal.data.customer.name}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{orderDetailModal.data.customer.email}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{orderDetailModal.data.customer.phone}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Order Metadata</h4>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} className="text-muted" />
                    Ordered on: {new Date(orderDetailModal.data.created_at).toLocaleString()}
                  </p>
                  <p style={{ marginTop: '8px', fontWeight: 600 }}>
                    Status: <span className="badge badge-success">Processed</span>
                  </p>
                </div>
              </div>

              <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Products Ordered</h4>
              <table className="custom-table" style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Price per Unit</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetailModal.data.items.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.product.name}</td>
                      <td><code>{item.product.sku}</code></td>
                      <td>${item.price_at_order.toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 600 }}>${(item.price_at_order * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, paddingRight: '20px' }}>Total Amount:</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: '16px' }}>
                      ${orderDetailModal.data.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setOrderDetailModal({ open: false, data: null })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification area */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
