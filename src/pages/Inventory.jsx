import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Boxes,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  PackagePlus,
  Filter,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "geovantProducts";

const emptyForm = {
  name: "",
  sku: "",
  category: "General",
  costPrice: "",
  sellingPrice: "",
  quantity: "",
  lowStockLevel: "5",
};

const emptyMovementForm = {
  type: "stock_in",
  quantity: "",
  reason: "",
};

function money(value) {
  return new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getStatus(product) {
  if (Number(product.quantity) <= 0) return "Out of Stock";
  if (Number(product.quantity) <= Number(product.lowStockLevel))
    return "Low Stock";
  return "In Stock";
}

function mapFromDatabase(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category || "General",
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    quantity: Number(row.quantity),
    lowStockLevel: Number(row.low_stock_level),
  };
}

function mapToDatabase(product, userId) {
  return {
    user_id: userId,
    name: product.name,
    sku: product.sku,
    category: product.category || "General",
    cost_price: product.costPrice,
    selling_price: product.sellingPrice,
    quantity: product.quantity,
    low_stock_level: product.lowStockLevel,
  };
}

function FormField({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    orange: "bg-orange-500/10 text-orange-400",
    red: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#171a21] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>

        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>

      <h3 className="mt-5 break-words text-2xl font-bold">{value}</h3>
    </div>
  );
}

const inputClass = "form-input";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [userId, setUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Stock movement states
  const [movementProduct, setMovementProduct] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [movementSaving, setMovementSaving] = useState(false);
  const [movementError, setMovementError] = useState("");

  // Stock history states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [movements, setMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    loadInventory();
  }, []);

  // Load products from Supabase
  async function loadInventory() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userResult?.user;

      if (!user) {
        setError("Your session has expired. Please log in again.");
        setProducts([]);
        return;
      }

      setUserId(user.id);

      const { data, error: dbError } = await supabase
        .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      // Import older local products if the database is empty
      const saved = localStorage.getItem(STORAGE_KEY);
      let localProducts = [];

      try {
        localProducts = saved ? JSON.parse(saved) : [];
      } catch {
        localProducts = [];
      }

      if (
        Array.isArray(localProducts) &&
        localProducts.length &&
        (!data || !data.length)
      ) {
        const rows = localProducts.map((p) =>
          mapToDatabase(
            {
              name: p.name,
              sku: p.sku,
              category: p.category,
              costPrice: Number(p.costPrice) || 0,
              sellingPrice: Number(p.sellingPrice) || 0,
              quantity: Number(p.quantity) || 0,
              lowStockLevel: Number(p.lowStockLevel) || 0,
            },
            user.id
          )
        );

        const { data: imported, error: importError } = await supabase
          .from("products")
          .insert(rows)
          .select();

        if (importError) throw importError;

        setProducts((imported || []).map(mapFromDatabase));

        setNotice(
          `Imported ${imported?.length || 0} existing product(s) into the database.`
        );

        return;
      }

      setProducts((data || []).map(mapFromDatabase));
    } catch (err) {
      console.error("Inventory loading error:", err);
      setError(err.message || "Unable to load inventory from the database.");
    } finally {
      setLoading(false);
    }
  }

  // Summary calculations
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);

  const lowStock = products.filter(
    (p) => getStatus(p) === "Low Stock"
  ).length;

  const outOfStock = products.filter(
    (p) => getStatus(p) === "Out of Stock"
  ).length;

  const stockValue = products.reduce(
    (sum, p) => sum + p.costPrice * p.quantity,
    0
  );

  // Search and filter
  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const q = search.toLowerCase();

        return (
          (p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)) &&
          (filter === "All" || getStatus(p) === filter)
        );
      }),
    [products, search, filter]
  );

  // Product form
  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (p) => {
    setEditingId(p.id);

    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      quantity: String(p.quantity),
      lowStockLevel: String(p.lowStockLevel),
    });

    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // Save product
  async function saveProduct(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    const name = form.name.trim();
    const sku = form.sku.trim();

    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);
    const quantity = Number(form.quantity);
    const lowStockLevel = Number(form.lowStockLevel);

    if (!name || !sku) {
      setError("Please enter the product name and SKU.");
      return;
    }

    if (
      ![costPrice, sellingPrice].every(
        (n) => Number.isFinite(n) && n >= 0
      ) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isInteger(lowStockLevel) ||
      lowStockLevel < 0
    ) {
      setError("Please enter valid prices and whole-number quantities.");
      return;
    }

    if (
      products.some(
        (p) =>
          p.sku.toLowerCase() === sku.toLowerCase() &&
          p.id !== editingId
      )
    ) {
      setError("That SKU already exists. Please use another SKU.");
      return;
    }

    if (!userId) {
      setError("User session not found. Please log in again.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        sku,
        category: form.category,
        costPrice,
        sellingPrice,
        quantity: editingId
          ? products.find((p) => p.id === editingId)?.quantity ?? quantity
          : quantity,
        lowStockLevel,
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("products")
          .update(mapToDatabase(payload, userId))
          .eq("id", editingId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) throw updateError;

        const updated = mapFromDatabase(data);

        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p))
        );

        setNotice("Product updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("products")
          .insert(mapToDatabase(payload, userId))
          .select()
          .single();

        if (insertError) throw insertError;

        setProducts((prev) => [mapFromDatabase(data), ...prev]);

        setNotice("Product added successfully.");
      }

      closeForm();
    } catch (err) {
      console.error("Product save error:", err);

      setError(
        err.code === "23505"
          ? "This SKU already exists in your inventory."
          : err.message || "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete product
  async function deleteProduct(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setProducts((prev) => prev.filter((p) => p.id !== id));

      setNotice("Product deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete product.");
    }
  }

  // Open stock movement modal
  function openMovement(product) {
    setMovementProduct(product);
    setMovementForm(emptyMovementForm);
    setMovementError("");
    setNotice("");
  }

  // Save stock movement through Supabase RPC
  async function saveMovement(e) {
    e.preventDefault();
    setMovementError("");

    const quantity = Number(movementForm.quantity);

    if (!movementProduct) return;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setMovementError("Enter a whole number greater than zero.");
      return;
    }

    if (
      movementForm.type === "stock_out" &&
      quantity > movementProduct.quantity
    ) {
      setMovementError("You cannot remove more stock than is available.");
      return;
    }

    setMovementSaving(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "adjust_product_stock",
        {
          p_product_id: movementProduct.id,
          p_movement_type: movementForm.type,
          p_quantity: quantity,
          p_reason: movementForm.reason.trim(),
        }
      );

      if (rpcError) throw rpcError;

      const newQty = Number(data?.new_quantity);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === movementProduct.id ? { ...p, quantity: newQty } : p
        )
      );

      setNotice(
        `Stock updated. ${movementProduct.name}: ${data.previous_quantity} → ${newQty}.`
      );

      setMovementProduct(null);

      if (historyOpen) await loadMovements();
    } catch (err) {
      console.error("Stock movement error:", err);
      setMovementError(err.message || "Stock movement could not be saved.");
    } finally {
      setMovementSaving(false);
    }
  }

  // Load stock movement history
  async function loadMovements() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      const productById = new Map(products.map((p) => [p.id, p]));

      setMovements(
        (data || []).map((m) => ({
          ...m,
          productName:
            productById.get(m.product_id)?.name || "Deleted product",
          sku: productById.get(m.product_id)?.sku || "—",
        }))
      );
    } catch (err) {
      setHistoryError(
        err.message || "Could not load stock movement history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);

    if (next && userId) {
      await loadMovements();
    }
  }

  const statusStyle = (status) =>
    status === "In Stock"
      ? "bg-green-500/10 text-green-400"
      : status === "Low Stock"
      ? "bg-orange-500/10 text-orange-400"
      : "bg-red-500/10 text-red-400";

  const movementLabel = (type) =>
    type === "stock_in"
      ? "Stock In"
      : type === "stock_out"
      ? "Stock Out"
      : "Adjustment";

  const movementStyle = (type) =>
    type === "stock_in"
      ? "text-green-400"
      : type === "stock_out"
      ? "text-red-400"
      : "text-blue-400";

  return (
    <div className="space-y-7">
      {/* Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="mt-2 text-sm text-gray-400">
            Manage products, prices and stock movements.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadInventory}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={toggleHistory}
            disabled={!userId}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              historyOpen
                ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                : "border-white/10 text-gray-300 hover:bg-white/5"
            }`}
          >
            <History size={17} />
            Movement History
          </button>

          <button
            onClick={openAddForm}
            disabled={loading || !userId}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400">
          {notice}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Products"
          value={products.length}
          icon={Package}
          color="blue"
        />

        <SummaryCard
          title="Total Units"
          value={totalUnits.toLocaleString()}
          icon={Boxes}
          color="green"
        />

        <SummaryCard
          title="Low Stock"
          value={lowStock}
          icon={AlertTriangle}
          color="orange"
        />

        <SummaryCard
          title="Stock Value"
          value={money(stockValue)}
          icon={PackagePlus}
          color="blue"
        />
      </div>

      {outOfStock > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          <AlertTriangle size={20} />
          {outOfStock} product(s) currently have no stock available.
        </div>
      )}

      {/* Stock Movement History */}
      {historyOpen && (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#171a21]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h3 className="font-semibold">Stock Movement History</h3>
              <p className="mt-1 text-xs text-gray-400">
                Latest 200 movements
              </p>
            </div>

            <button
              onClick={loadMovements}
              disabled={historyLoading}
              className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/5"
            >
              <RefreshCw
                size={16}
                className={historyLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {historyError && (
            <p className="p-4 text-sm text-red-300">{historyError}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Before</th>
                  <th className="px-4 py-3">After</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>

              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">
                      Loading movement history…
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                        {new Date(m.created_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium">{m.productName}</span>
                        <p className="text-xs text-gray-500">{m.sku}</p>
                      </td>

                      <td
                        className={`px-4 py-3 font-medium ${movementStyle(
                          m.movement_type
                        )}`}
                      >
                        {movementLabel(m.movement_type)}
                      </td>

                      <td className="px-4 py-3">{m.quantity}</td>
                      <td className="px-4 py-3">{m.previous_quantity}</td>
                      <td className="px-4 py-3 font-semibold">
                        {m.new_quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {m.reason || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#171a21] p-4 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />

          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#101217] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={17} className="text-gray-400" />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#101217] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          >
            <option>All</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Product List */}
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#171a21]">
        <div className="border-b border-white/10 p-5">
          <h3 className="font-semibold">Product List</h3>

          <p className="mt-1 text-xs text-gray-400">
            {loading
              ? "Loading products from database…"
              : `${filteredProducts.length} product(s) displayed`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">SKU</th>
                <th className="px-5 py-4">Cost Price</th>
                <th className="px-5 py-4">Selling Price</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-16 text-center">
                    <RefreshCw
                      size={28}
                      className="mx-auto mb-3 animate-spin text-blue-400"
                    />
                    <p className="text-gray-400">Connecting to database…</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const status = getStatus(p);

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">{p.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {p.category}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-400">{p.sku}</td>
                      <td className="px-5 py-4">{money(p.costPrice)}</td>
                      <td className="px-5 py-4">{money(p.sellingPrice)}</td>
                      <td className="px-5 py-4 font-semibold">{p.quantity}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${statusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openMovement(p)}
                          title="Manage stock"
                          className="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-2 text-blue-300 hover:bg-blue-500/20"
                        >
                          <SlidersHorizontal size={15} />
                          <span className="text-xs">Manage</span>
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(p)}
                            title="Edit product"
                            className="rounded-lg bg-blue-500/10 p-2 text-blue-400 hover:bg-blue-500/20"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => deleteProduct(p.id)}
                            title="Delete product"
                            className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-5 py-16 text-center">
                    <Package
                      size={35}
                      className="mx-auto mb-3 text-gray-600"
                    />
                    <p className="font-medium text-gray-300">
                      No products found
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Add a product or change your search filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <div className="my-auto w-full max-w-2xl rounded-xl border border-white/10 bg-[#171a21] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h3 className="text-lg font-bold">
                  {editingId ? "Edit Product" : "Add New Product"}
                </h3>

                <p className="mt-1 text-xs text-gray-400">
                  {editingId
                    ? "Quantity is managed through stock movements."
                    : "Enter product details and starting quantity."}
                </p>
              </div>

              <button
                onClick={closeForm}
                aria-label="Close form"
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Product Name">
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="e.g. Cooking Oil"
                    required
                    className={inputClass}
                  />
                </FormField>

                <FormField label="SKU / Product Code">
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={updateField}
                    placeholder="e.g. CO-001"
                    required
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Category">
                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                    className={inputClass}
                  >
                    <option>General</option>
                    <option>Food and Beverages</option>
                    <option>Electronics</option>
                    <option>Clothing</option>
                    <option>Household</option>
                    <option>Stationery</option>
                    <option>Other</option>
                  </select>
                </FormField>

                {!editingId && (
                  <FormField label="Starting Quantity">
                    <input
                      type="number"
                      name="quantity"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={updateField}
                      placeholder="0"
                      required
                      className={inputClass}
                    />
                  </FormField>
                )}

                {editingId && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-300 sm:col-span-2">
                    Current quantity:{" "}
                    <strong>
                      {products.find((p) => p.id === editingId)?.quantity ?? 0}
                    </strong>
                    . Use Manage Stock to record any quantity changes.
                  </div>
                )}

                <FormField label="Cost Price (K)">
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={updateField}
                    placeholder="0.00"
                    required
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Selling Price (K)">
                  <input
                    type="number"
                    name="sellingPrice"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={updateField}
                    placeholder="0.00"
                    required
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Low Stock Alert Level">
                  <input
                    type="number"
                    name="lowStockLevel"
                    min="0"
                    step="1"
                    value={form.lowStockLevel}
                    onChange={updateField}
                    required
                    className={inputClass}
                  />
                </FormField>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-5 py-3 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}
                  {saving
                    ? "Saving…"
                    : editingId
                    ? "Save Changes"
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Stock Modal */}
      {movementProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <div className="my-auto w-full max-w-lg rounded-xl border border-white/10 bg-[#171a21] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h3 className="text-lg font-bold">Manage Stock</h3>

                <p className="mt-1 text-sm text-gray-400">
                  {movementProduct.name} · SKU {movementProduct.sku}
                </p>

                <p className="mt-1 text-sm">
                  Available stock: <strong>{movementProduct.quantity}</strong>
                </p>
              </div>

              <button
                onClick={() => setMovementProduct(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveMovement} className="space-y-4 p-5">
              <FormField label="Movement Type">
                <select
                  value={movementForm.type}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="stock_in">Stock In — add stock</option>
                  <option value="stock_out">Stock Out — remove stock</option>
                  <option value="adjustment">
                    Adjustment — set actual count
                  </option>
                </select>
              </FormField>

              <FormField
                label={
                  movementForm.type === "adjustment"
                    ? "Actual Count (physical stock)"
                    : "Quantity"
                }
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder={
                    movementForm.type === "adjustment"
                      ? "Enter actual quantity counted"
                      : "Enter quantity"
                  }
                  required
                  className={inputClass}
                />
              </FormField>

              <FormField label="Reason (optional)">
                <textarea
                  rows="3"
                  value={movementForm.reason}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="e.g. Supplier delivery, damaged items, stock count"
                  className={inputClass}
                />
              </FormField>

              {movementError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                  {movementError}
                </div>
              )}

              <p className="text-xs text-gray-500">
                {movementForm.type === "adjustment"
                  ? "Adjustment quantity is the actual count on hand, not the change amount."
                  : movementForm.type === "stock_in"
                  ? "This quantity will be added to current stock."
                  : "This quantity will be removed from stock. The app will prevent removing more than available."}
              </p>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setMovementProduct(null)}
                  disabled={movementSaving}
                  className="rounded-lg border border-white/10 px-5 py-3 text-sm text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={movementSaving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {movementSaving && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}
                  {movementSaving ? "Updating…" : "Save Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}