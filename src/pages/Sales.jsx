import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { getCurrentUser } from "../lib/auth";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

const METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

const STATUS_LABELS = {
  paid: "Paid",
  partial: "Part paid",
  unpaid: "Unpaid",
  voided: "Voided",
};

const STATUS_STYLES = {
  paid: "bg-green-500/10 text-green-400",
  partial: "bg-yellow-500/10 text-yellow-400",
  unpaid: "bg-red-500/10 text-red-400",
  voided: "bg-gray-500/10 text-gray-400",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0b0d12] px-3 py-2.5 text-sm outline-none transition focus:border-blue-500";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-60";

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function money(value) {
  return `K${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(iso) {
  const date = new Date(iso);

  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusOf(sale) {
  return sale.status === "voided" ? "voided" : sale.payment_status;
}

function StatusBadge({ sale }) {
  const status = statusOf(sale);

  return (
    <span className={`rounded-full px-3 py-1 text-xs ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function Modal({ title, onClose, children, size = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <div
        className={`w-full ${size} rounded-2xl border border-white/10 bg-[#171a21] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Alert({ children }) {
  return (
    <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// New sale
// ---------------------------------------------------------------------

function NewSaleModal({ onClose, onCreated }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [lines, setLines] = useState([]);
  const [productSearch, setProductSearch] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([api.get("/products"), api.get("/customers")])
      .then(([productRows, customerRows]) => {
        if (!active) return;
        setProducts(productRows);
        setCustomers(customerRows);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load products.");
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return [];

    return products
      .filter(
        (product) =>
          Number(product.quantity) > 0 &&
          (product.name.toLowerCase().includes(term) ||
            String(product.sku).toLowerCase().includes(term))
      )
      .slice(0, 6);
  }, [products, productSearch]);

  function addProduct(product) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);

      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? {
                ...line,
                quantity: String(
                  Math.min(Number(line.quantity || 0) + 1, line.available)
                ),
              }
            : line
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          available: Number(product.quantity),
          quantity: "1",
          unitPrice: String(Number(product.selling_price)),
        },
      ];
    });

    setProductSearch("");
  }

  function updateLine(productId, patch) {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, ...patch } : line
      )
    );
  }

  function removeLine(productId) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  function lineIsValid(line) {
    const quantity = Number(line.quantity);

    return (
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= line.available &&
      Number(line.unitPrice) >= 0 &&
      line.unitPrice !== ""
    );
  }

  const subtotal = round2(
    lines.reduce(
      (sum, line) =>
        sum + round2((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)),
      0
    )
  );
  const discountValue = round2(discount);
  const total = round2(Math.max(subtotal - discountValue, 0));
  const paid = paidTouched ? round2(amountPaid) : total;
  const balance = round2(total - paid);

  let problem = "";

  if (lines.length === 0) {
    problem = "Add at least one product to start a sale.";
  } else if (!lines.every(lineIsValid)) {
    problem = "Check the quantities and prices. You cannot sell more than is in stock.";
  } else if (discountValue > subtotal) {
    problem = "The discount is more than the sale total.";
  } else if (paid > total) {
    problem = "The amount received is more than the total.";
  } else if (balance > 0 && !customerId) {
    problem = "Choose or add a customer to sell on credit or part-payment.";
  }

  async function addCustomer() {
    if (!newCustomer.name.trim()) {
      setError("Enter the customer's name.");
      return;
    }

    setError("");
    setSavingCustomer(true);

    try {
      const created = await api.post("/customers", {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
      });

      setCustomers((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(created.id);
      setShowNewCustomer(false);
      setNewCustomer({ name: "", phone: "" });
    } catch (err) {
      setError(err.message || "Unable to add the customer.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function submit() {
    setError("");
    setSubmitting(true);

    try {
      const sale = await api.post("/sales", {
        customer_id: customerId || null,
        items: lines.map((line) => ({
          product_id: line.productId,
          quantity: Number(line.quantity),
          unit_price: Number(line.unitPrice),
        })),
        discount: discountValue,
        payment_method: method,
        amount_paid: paid,
        notes: notes.trim(),
      });

      onCreated(sale);
    } catch (err) {
      setError(err.message || "Unable to record the sale. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New sale" onClose={onClose} size="max-w-5xl">
      {error && <Alert>{error}</Alert>}

      {loadingData ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="mr-3 animate-spin" />
          Loading products...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Products and cart */}
          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm text-gray-300">
              Add a product
            </label>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Type a product name or SKU"
                className={`${inputClass} pl-10`}
              />
            </div>

            {productSearch.trim() && (
              <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#0b0d12]">
                {suggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    No matching product in stock.
                  </p>
                ) : (
                  suggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-white/5"
                    >
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {product.sku}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-gray-400">
                        {money(product.selling_price)} · {product.quantity} in stock
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center text-sm text-gray-500">
                  <ShoppingCart size={26} className="mb-3 text-gray-600" />
                  No products added yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-3 py-3">Product</th>
                        <th className="px-3 py-3">Qty</th>
                        <th className="px-3 py-3">Price</th>
                        <th className="px-3 py-3 text-right">Total</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const valid = lineIsValid(line);

                        return (
                          <tr key={line.productId} className="border-t border-white/5">
                            <td className="px-3 py-3">
                              <p className="font-medium">{line.name}</p>
                              <p className="text-xs text-gray-500">
                                {line.available} in stock
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="1"
                                max={line.available}
                                step="1"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(line.productId, {
                                    quantity: e.target.value,
                                  })
                                }
                                className={`w-20 rounded-lg border bg-[#0b0d12] px-2 py-2 text-sm outline-none focus:border-blue-500 ${
                                  valid ? "border-white/10" : "border-red-500/60"
                                }`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) =>
                                  updateLine(line.productId, {
                                    unitPrice: e.target.value,
                                  })
                                }
                                className="w-24 rounded-lg border border-white/10 bg-[#0b0d12] px-2 py-2 text-sm outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              {money(
                                round2(
                                  (Number(line.quantity) || 0) *
                                    (Number(line.unitPrice) || 0)
                                )
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeLine(line.productId)}
                                aria-label={`Remove ${line.name}`}
                                className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Customer, payment and totals */}
          <div className="space-y-5 lg:col-span-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-gray-300">Customer</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer((value) => !value)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showNewCustomer ? "Cancel" : "+ New customer"}
                </button>
              </div>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
              >
                <option value="">Walk-in customer (no credit)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {Number(customer.balance_owed) > 0
                      ? ` (owes ${money(customer.balance_owed)})`
                      : ""}
                  </option>
                ))}
              </select>

              {showNewCustomer && (
                <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-[#0b0d12] p-3">
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    placeholder="Customer name"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    placeholder="Phone (optional)"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addCustomer}
                    disabled={savingCustomer}
                    className={`${primaryButton} w-full`}
                  >
                    {savingCustomer ? "Saving..." : "Save customer"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Discount (K)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Payment method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Amount received (K)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidTouched ? amountPaid : total ? String(total) : ""}
                  onChange={(e) => {
                    setPaidTouched(true);
                    setAmountPaid(e.target.value);
                  }}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Note (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-white/10 bg-[#0b0d12] p-4 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Discount</span>
                  <span>- {money(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Received</span>
                <span>{money(paid)}</span>
              </div>
              <div
                className={`flex justify-between font-semibold ${
                  balance > 0 ? "text-yellow-400" : "text-green-400"
                }`}
              >
                <span>{balance > 0 ? "Left on credit" : "Fully paid"}</span>
                <span>{balance > 0 ? money(balance) : ""}</span>
              </div>
            </div>

            {problem && lines.length > 0 && (
              <p className="text-xs text-yellow-400">{problem}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || Boolean(problem)}
              className={`${primaryButton} w-full py-3`}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving sale...
                </>
              ) : (
                `Complete sale · ${money(total)}`
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Sale details, payments and voiding
// ---------------------------------------------------------------------

function SaleDetailModal({ saleId, onClose, onChanged }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const user = getCurrentUser();
  const canVoid = user && (user.role === "owner" || user.role === "manager");

  const load = useCallback(async () => {
    try {
      setSale(await api.get(`/sales/${saleId}`));
    } catch (err) {
      setError(err.message || "Unable to load this sale.");
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    load();
  }, [load]);

  const balance = sale ? round2(Number(sale.total) - Number(sale.amount_paid)) : 0;

  async function recordPayment() {
    setError("");
    setBusy(true);

    try {
      const amount = payAmount === "" ? balance : round2(payAmount);

      await api.post(`/sales/${saleId}/payments`, { amount, method: payMethod });

      setPayAmount("");
      await load();
      onChanged();
    } catch (err) {
      setError(err.message || "Unable to record the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function voidSale() {
    const confirmed = window.confirm(
      "Void this sale? The products will be returned to stock. Any money already paid must be refunded by hand."
    );

    if (!confirmed) return;

    setError("");
    setBusy(true);

    try {
      await api.post(`/sales/${saleId}/void`, {});
      await load();
      onChanged();
    } catch (err) {
      setError(err.message || "Unable to void the sale.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={sale ? sale.sale_number : "Sale"} onClose={onClose}>
      {error && <Alert>{error}</Alert>}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={20} className="mr-3 animate-spin" />
          Loading...
        </div>
      )}

      {sale && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-sm">
              <p className="text-gray-400">{formatDateTime(sale.sold_at)}</p>
              <p className="mt-1">
                Customer:{" "}
                <span className="font-medium">
                  {sale.customer_name || "Walk-in customer"}
                </span>
              </p>
              {sale.notes && (
                <p className="mt-1 whitespace-pre-line text-gray-400">
                  {sale.notes}
                </p>
              )}
            </div>
            <StatusBadge sale={sale} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-medium">{item.product_name}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{money(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right">{money(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{money(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Discount</span>
                <span>- {money(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(sale.total)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Paid</span>
              <span>{money(sale.amount_paid)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between font-semibold text-yellow-400">
                <span>Balance owed</span>
                <span>{money(balance)}</span>
              </div>
            )}
          </div>

          {sale.payments.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Payments</h4>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 text-sm">
                {sale.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="text-gray-400">
                      {formatDateTime(payment.paid_at)} ·{" "}
                      {METHOD_LABELS[payment.method] || payment.method}
                    </span>
                    <span className="font-medium">{money(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sale.status === "completed" && balance > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#0b0d12] p-4">
              <h4 className="mb-3 text-sm font-semibold">Record a payment</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Amount (max ${balance.toFixed(2)})`}
                  className={inputClass}
                />
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={recordPayment}
                  disabled={busy}
                  className={primaryButton}
                >
                  {busy ? "Saving..." : payAmount === "" ? "Pay full balance" : "Add payment"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
            {sale.status === "completed" && canVoid ? (
              <button
                type="button"
                onClick={voidSale}
                disabled={busy}
                className="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
              >
                Void sale
              </button>
            ) : (
              <span />
            )}

            <button type="button" onClick={onClose} className={secondaryButton}>
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Sales page
// ---------------------------------------------------------------------

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewSale, setShowNewSale] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const loadSales = useCallback(async () => {
    try {
      setSales(await api.get("/sales?limit=200"));
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load sales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const visibleSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter((sale) => {
      if (statusFilter !== "all" && statusOf(sale) !== statusFilter) return false;
      if (!term) return true;

      return [sale.sale_number, sale.customer_name, sale.items_summary]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(term));
    });
  }, [sales, search, statusFilter]);

  const owedTotal = useMemo(
    () =>
      sales
        .filter((sale) => sale.status === "completed")
        .reduce((sum, sale) => sum + Number(sale.total) - Number(sale.amount_paid), 0),
    [sales]
  );

  function handleCreated(sale) {
    setShowNewSale(false);
    setMessage(`Sale ${sale.sale_number} recorded successfully.`);
    loadSales();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sales</h2>
          <p className="mt-2 text-sm text-gray-400">
            Record sales and track what customers still owe.
            {owedTotal > 0 && (
              <span className="ml-2 text-yellow-400">
                Owed by customers: {money(owedTotal)}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setShowNewSale(true);
          }}
          className={primaryButton}
        >
          <Plus size={18} />
          New sale
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sale number, customer or product"
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} w-auto`}
        >
          <option value="all">All sales</option>
          <option value="paid">Paid</option>
          <option value="partial">Part paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#171a21]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="mr-3 animate-spin" />
            Loading sales...
          </div>
        ) : visibleSales.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 rounded-xl bg-blue-500/10 p-4 text-blue-400">
              <ShoppingCart size={28} />
            </div>
            <h3 className="font-semibold">
              {sales.length === 0 ? "No sales yet" : "No sales match your search"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-400">
              {sales.length === 0
                ? "Click New sale to record your first sale. Stock will update automatically."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-4">Sale</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-right">Paid</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {visibleSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setDetailId(sale.id)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-medium">
                      {sale.sale_number}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-400">
                      {formatDateTime(sale.sold_at)}
                    </td>
                    <td className="px-5 py-4">
                      {sale.customer_name || (
                        <span className="text-gray-500">Walk-in</span>
                      )}
                    </td>
                    <td className="max-w-[240px] truncate px-5 py-4 text-gray-400">
                      {sale.items_summary}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {money(sale.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-gray-400">
                      {money(sale.amount_paid)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge sale={sale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showNewSale && (
        <NewSaleModal
          onClose={() => setShowNewSale(false)}
          onCreated={handleCreated}
        />
      )}

      {detailId && (
        <SaleDetailModal
          saleId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={loadSales}
        />
      )}
    </div>
  );
}
