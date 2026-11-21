
// ========================================
// GEOVANT BUSINESS MANAGER
// ========================================

// LOAD SAVED INFORMATION

function loadData(key) {
    try {
        const savedData = localStorage.getItem(key);
        const parsedData = savedData ? JSON.parse(savedData) : [];

        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        return [];
    }
}

let products = loadData("geovantProducts");
let transactions = loadData("geovantTransactions");

// CLEAN SAVED PRODUCTS

products = products.filter(function(product) {
    return product &&
        typeof product.name === "string" &&
        Number.isFinite(Number(product.price)) &&
        Number.isInteger(Number(product.quantity)) &&
        Number(product.price) > 0 &&
        Number(product.quantity) >= 0;
});

products.forEach(function(product) {
    product.price = Number(product.price);
    product.quantity = Number(product.quantity);
    product.lowStockLevel = Number(product.lowStockLevel) || 0;

    if (!product.id) {
        product.id = Date.now().toString() +
            Math.random().toString(16).slice(2);
    }
});

// CLEAN SAVED TRANSACTIONS

transactions = transactions.filter(function(transaction) {
    return transaction &&
        (transaction.type === "Sale" ||
         transaction.type === "Expense") &&
        Number.isFinite(Number(transaction.amount)) &&
        Number(transaction.amount) >= 0;
});

transactions.forEach(function(transaction) {
    transaction.amount = Number(transaction.amount);
});

// SAVE INFORMATION

function saveData() {
    try {
        localStorage.setItem(
            "geovantProducts",
            JSON.stringify(products)
        );

        localStorage.setItem(
            "geovantTransactions",
            JSON.stringify(transactions)
        );

        return true;

    } catch (error) {
        alert("Unable to save information. Check your browser storage.");
        return false;
    }
}

// ========================================
// NAVIGATION
// ========================================

const pageTitles = {
    "page-dashboard": "Dashboard",
    "page-sales": "Sales Management",
    "page-inventory": "Inventory Management",
    "page-expenses": "Expense Management",
    "page-customers": "Customer Management",
    "page-suppliers": "Supplier Management",
    "page-reports": "Business Reports",
    "page-settings": "Settings"
};

function showPage(pageName) {
    const selectedPage = document.getElementById(pageName);

    if (!selectedPage || !selectedPage.classList.contains("page")) {
        return;
    }

    document.querySelectorAll(".page").forEach(function(page) {
        page.classList.remove("active");
    });

    selectedPage.classList.add("active");

    document.querySelectorAll(".nav-link[data-page]").forEach(
        function(button) {
            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );
        }
    );

    document.getElementById("pageTitle").textContent =
        pageTitles[pageName] || "Dashboard";

    closeMobileMenu();
    window.scrollTo(0, 0);
}

// SIDEBAR BUTTONS

document.querySelectorAll(".nav-link[data-page]").forEach(
    function(button) {
        button.addEventListener("click", function() {
            showPage(button.dataset.page);
        });
    }
);

// BUTTONS THAT OPEN OTHER PAGES

document.querySelectorAll("[data-go]").forEach(function(button) {
    button.addEventListener("click", function() {
        showPage(button.dataset.go);
    });
});

// ========================================
// MOBILE MENU
// ========================================

const sidebar = document.getElementById("sidebar");
const mobileOverlay = document.getElementById("mobileOverlay");
const menuToggle = document.getElementById("menuToggle");

function closeMobileMenu() {
    sidebar.classList.remove("open");
    mobileOverlay.classList.remove("show");
}

menuToggle.addEventListener("click", function() {
    sidebar.classList.toggle("open");
    mobileOverlay.classList.toggle("show");
});

mobileOverlay.addEventListener("click", closeMobileMenu);

// ========================================
// CALCULATE BUSINESS TOTALS
// ========================================

function calculateTotals() {
    let totalSales = 0;
    let totalExpenses = 0;

    transactions.forEach(function(transaction) {
        if (transaction.type === "Sale") {
            totalSales += transaction.amount;
        }

        if (transaction.type === "Expense") {
            totalExpenses += transaction.amount;
        }
    });

    const totalStock = products.reduce(function(total, product) {
        return total + product.quantity;
    }, 0);

    return {
        totalSales: totalSales,
        totalExpenses: totalExpenses,
        totalStock: totalStock,
        profit: totalSales - totalExpenses
    };
}

// ========================================
// UPDATE DASHBOARD AND REPORTS
// ========================================

function updateDashboard() {
    const totals = calculateTotals();

    document.getElementById("sales").textContent =
        "K" + totals.totalSales.toFixed(2);

    document.getElementById("expenses").textContent =
        "K" + totals.totalExpenses.toFixed(2);

    document.getElementById("stock").textContent =
        totals.totalStock;

    document.getElementById("profit").textContent =
        "K" + totals.profit.toFixed(2);

    document.getElementById("reportSales").textContent =
        "K" + totals.totalSales.toFixed(2);

    document.getElementById("reportExpenses").textContent =
        "K" + totals.totalExpenses.toFixed(2);

    document.getElementById("reportStock").textContent =
        totals.totalStock;

    document.getElementById("reportProfit").textContent =
        "K" + totals.profit.toFixed(2);
}

// ========================================
// TRANSACTION HISTORY
// ========================================

function createTransactionRow(transaction) {
    const row = document.createElement("tr");

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent =
        transaction.description || "Transaction";

    const typeCell = document.createElement("td");
    typeCell.textContent = transaction.type;

    typeCell.className =
        transaction.type === "Sale" ? "sale-type" : "expense-type";

    const amountCell = document.createElement("td");
    amountCell.textContent =
        "K" + Number(transaction.amount).toFixed(2);

    const dateCell = document.createElement("td");

    const date = new Date(transaction.date);

    dateCell.textContent = Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString();

    row.appendChild(descriptionCell);
    row.appendChild(typeCell);
    row.appendChild(amountCell);
    row.appendChild(dateCell);

    return row;
}

function displayTransactionTable(elementId, records) {
    const tableBody = document.getElementById(elementId);

    tableBody.innerHTML = "";

    if (records.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No transactions recorded yet.";
        cell.className = "empty-message";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    records.forEach(function(transaction) {
        tableBody.appendChild(createTransactionRow(transaction));
    });
}

function displayTransactions() {
    const recent = [...transactions].reverse();

    const salesRecords = recent.filter(function(transaction) {
        return transaction.type === "Sale";
    });

    const expenseRecords = recent.filter(function(transaction) {
        return transaction.type === "Expense";
    });

    displayTransactionTable(
        "recentTransactions",
        recent.slice(0, 5)
    );

    displayTransactionTable("salesHistory", salesRecords);

    displayTransactionTable("expenseHistory", expenseRecords);
}

// ========================================
// ADD NEW PRODUCT
// ========================================

const productForm = document.getElementById("productForm");

productForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();

    const price = Number(
        document.getElementById("productPrice").value
    );

    const quantity = Number(
        document.getElementById("productQuantity").value
    );

    const lowStockLevel = Number(
        document.getElementById("lowStockLevel").value
    );

    if (
        !name ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        !Number.isInteger(lowStockLevel) ||
        lowStockLevel < 0
    ) {
        alert("Please enter valid product information.");
        return;
    }

    const duplicate = products.some(function(product) {
        return product.name.toLowerCase() === name.toLowerCase();
    });

    if (duplicate) {
        alert("This product already exists. Use the Restock button.");
        return;
    }

    const product = {
        id: Date.now().toString() +
            Math.random().toString(16).slice(2),
        name: name,
        price: price,
        quantity: quantity,
        lowStockLevel: lowStockLevel
    };

    products.push(product);

    if (!saveData()) {
        products.pop();
        return;
    }

    updateDashboard();
    displayInventory();
    updateProductOptions();

    productForm.reset();

    document.getElementById("lowStockLevel").value = 5;

    alert("Product added successfully!");
});

// ========================================
// DISPLAY INVENTORY
// ========================================

function displayInventory() {
    const inventoryList = document.getElementById("inventoryList");

    inventoryList.innerHTML = "";

    if (products.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No products added yet.";
        cell.className = "empty-message";

        row.appendChild(cell);
        inventoryList.appendChild(row);

        return;
    }

    products.forEach(function(product) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = product.name;

        const priceCell = document.createElement("td");
        priceCell.textContent = "K" + product.price.toFixed(2);

        const quantityCell = document.createElement("td");
        quantityCell.textContent = product.quantity;

        const statusCell = document.createElement("td");

        if (product.quantity === 0) {
            statusCell.textContent = "Out of Stock";
            statusCell.className = "out-of-stock";

        } else if (product.quantity <= product.lowStockLevel) {
            statusCell.textContent = "Low Stock";
            statusCell.className = "low-stock";

        } else {
            statusCell.textContent = "In Stock";
            statusCell.className = "in-stock";
        }

        const actionCell = document.createElement("td");

        const restockButton = document.createElement("button");

        restockButton.textContent = "Restock";
        restockButton.className = "restock-button";

        restockButton.addEventListener("click", function() {
            restockProduct(product.id);
        });

        actionCell.appendChild(restockButton);

        row.appendChild(nameCell);
        row.appendChild(priceCell);
        row.appendChild(quantityCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);

        inventoryList.appendChild(row);
    });
}

// ========================================
// RESTOCK PRODUCT
// ========================================

function restockProduct(productId) {
    const product = products.find(function(item) {
        return item.id === productId;
    });

    if (!product) return;

    const answer = prompt(
        "How many units are you adding to " + product.name + "?"
    );

    if (answer === null || answer.trim() === "") {
        return;
    }

    const quantityToAdd = Number(answer);

    if (
        !Number.isSafeInteger(quantityToAdd) ||
        quantityToAdd <= 0 ||
        !Number.isSafeInteger(product.quantity + quantityToAdd)
    ) {
        alert("Please enter a valid whole number.");
        return;
    }

    product.quantity += quantityToAdd;

    if (!saveData()) {
        product.quantity -= quantityToAdd;
        return;
    }

    updateDashboard();
    displayInventory();
    updateProductOptions();

    alert("Stock updated successfully!");
}

// ========================================
// PRODUCT SELECTION FOR SALES
// ========================================

function updateProductOptions() {
    const saleProduct = document.getElementById("saleProduct");

    const previousSelection = saleProduct.value;

    saleProduct.innerHTML = "";

    const defaultOption = document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "Select a product";

    saleProduct.appendChild(defaultOption);

    products.forEach(function(product) {
        if (product.quantity > 0) {
            const option = document.createElement("option");

            option.value = product.id;

            option.textContent =
                product.name + " (Available: " + product.quantity + ")";

            saleProduct.appendChild(option);
        }
    });

    const productStillAvailable = products.some(function(product) {
        return product.id === previousSelection &&
            product.quantity > 0;
    });

    if (productStillAvailable) {
        saleProduct.value = previousSelection;
    }

    updateSalePreview();
}

// ========================================
// CALCULATE SALE AMOUNT
// ========================================

function updateSalePreview() {
    const productId = document.getElementById("saleProduct").value;

    const quantity = Number(
        document.getElementById("saleQuantity").value
    );

    const product = products.find(function(item) {
        return item.id === productId;
    });

    const preview = document.getElementById("salePreview");

    if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        preview.textContent = "K0.00";
        return;
    }

    preview.textContent =
        "K" + (product.price * quantity).toFixed(2);
}

document.getElementById("saleProduct").addEventListener(
    "change",
    updateSalePreview
);

document.getElementById("saleQuantity").addEventListener(
    "input",
    updateSalePreview
);

// ========================================
// RECORD COMPLETED SALE
// ========================================

const saleForm = document.getElementById("saleForm");

saleForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const productId = document.getElementById("saleProduct").value;

    const quantity = Number(
        document.getElementById("saleQuantity").value
    );

    const product = products.find(function(item) {
        return item.id === productId;
    });

    if (!product) {
        alert("Please select a product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }

    if (quantity > product.quantity) {
        alert("Not enough stock available.");
        return;
    }

    const totalAmount = product.price * quantity;

    const confirmed = confirm(
        "Confirm this completed sale?\n\n" +
        "Product: " + product.name +
        "\nQuantity: " + quantity +
        "\nTotal: K" + totalAmount.toFixed(2)
    );

    if (!confirmed) return;

    const previousQuantity = product.quantity;

    // Reduce stock
    product.quantity -= quantity;

    // Create sale record
    const sale = {
        description: product.name + " x " + quantity,
        amount: totalAmount,
        type: "Sale",
        productId: product.id,
        quantity: quantity,
        date: new Date().toISOString()
    };

    transactions.push(sale);

    if (!saveData()) {
        product.quantity = previousQuantity;
        transactions.pop();
        return;
    }

    updateDashboard();
    displayInventory();
    displayTransactions();
    updateProductOptions();

    saleForm.reset();

    document.getElementById("saleQuantity").value = 1;

    updateSalePreview();

    alert("Sale recorded and stock updated successfully!");
});

// ========================================
// RECORD EXPENSE
// ========================================

const expenseForm = document.getElementById("expenseForm");

expenseForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const description = document
        .getElementById("expenseDescription")
        .value.trim();

    const amount = Number(
        document.getElementById("expenseAmount").value
    );

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        alert("Please enter valid expense information.");
        return;
    }

    const expense = {
        description: description,
        amount: amount,
        type: "Expense",
        date: new Date().toISOString()
    };

    transactions.push(expense);

    if (!saveData()) {
        transactions.pop();
        return;
    }

    updateDashboard();
    displayTransactions();

    expenseForm.reset();

    alert("Expense recorded successfully!");
});

// ========================================
// START THE SYSTEM
// ========================================

updateDashboard();
displayInventory();
displayTransactions();
updateProductOptions();

showPage("page-dashboard");
