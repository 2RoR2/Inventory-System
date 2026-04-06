const inventoryItems = [
  { category: "Tart", name: "Almond Egg Tart Original", price: 5.0, flavorClass: "flavor-almond" },
  { category: "Tart", name: "Almond Egg Tart Chocolate", price: 5.0, flavorClass: "flavor-chocolate" },
  { category: "Tart", name: "Hong Kong Egg Tart", price: 4.0, flavorClass: "flavor-hong-kong" },
  { category: "Tart", name: "Portuguese Egg Tart", price: 5.0, flavorClass: "flavor-portuguese" },
  { category: "Pie", name: "Chicken Pie", price: 5.0, flavorClass: "flavor-chicken" },
  { category: "Sandwich", name: "Tuna Sandwich", price: 5.0, flavorClass: "flavor-tuna" },
  { category: "Sandwich", name: "Egg Mayo Sandwich", price: 5.0, flavorClass: "flavor-egg" },
  { category: "Sandwich", name: "Ham & Cheese Sandwich", price: 5.0, flavorClass: "flavor-ham-cheese" },
  { category: "Sandwich", name: "Crab Meat Sandwich", price: 5.0, flavorClass: "flavor-crab" },
  { category: "Sandwich", name: "Sausage Sandwich", price: 5.0, flavorClass: "flavor-sausage" },
  { category: "Croissant", name: "Almond Croissant", price: 10.0, flavorClass: "flavor-almond" },
  { category: "Croissant", name: "Pistachio Croissant", price: 12.0, flavorClass: "flavor-pistachio" },
  { category: "Croissant", name: "Chocolate Croissant", price: 9.0, flavorClass: "flavor-chocolate" },
  { category: "Bomboloni", name: "Pistachio Bomboloni", price: 6.0, flavorClass: "flavor-pistachio" },
  { category: "Bomboloni", name: "Matcha Bomboloni", price: 6.0, flavorClass: "flavor-matcha" },
  { category: "Bomboloni", name: "Chocolate Bomboloni", price: 6.0, flavorClass: "flavor-chocolate" },
  { category: "Bomboloni", name: "Lotus Bomboloni", price: 6.0, flavorClass: "flavor-lotus" },
  { category: "Pastry", name: "Pain au Chocolat", price: 9.0, flavorClass: "flavor-pain" },
  { category: "Set", name: "Puff Set (Chocolate + Vanilla)", price: 16.0, flavorClass: "flavor-puff-duo" }
];

const defaultStockByItem = {
  "Chocolate Croissant": 10,
  "Almond Croissant": 8,
  "Pistachio Croissant": 8,
  "Pain au Chocolat": 8
};

const categoryMeta = {
  All: { icon: "AL", labelClass: "label-all" },
  Tart: { icon: "TR", labelClass: "label-tart" },
  Pie: { icon: "PI", labelClass: "label-pie" },
  Sandwich: { icon: "SW", labelClass: "label-sandwich" },
  Croissant: { icon: "CR", labelClass: "label-croissant" },
  Bomboloni: { icon: "BO", labelClass: "label-bomboloni" },
  Pastry: { icon: "PA", labelClass: "label-pastry" },
  Set: { icon: "ST", labelClass: "label-set" }
};

const salesStorageKey = "bakery-sales-history";
const stockStorageKey = "bakery-stock-levels";
const openingCashStorageKey = "bakery-opening-cash";

const catalog = document.getElementById("catalog");
const selectedItemsContainer = document.getElementById("selected-items");
const totalItemsElement = document.getElementById("total-items");
const orderTotalElement = document.getElementById("order-total");
const historyTable = document.getElementById("sales-history");
const mobileSalesHistory = document.getElementById("mobile-sales-history");
const paymentMethodInput = document.getElementById("payment-method");
const mobileTotalItemsElement = document.getElementById("mobile-total-items");
const mobileOrderTotalElement = document.getElementById("mobile-order-total");
const mobileTodaySalesElement = document.getElementById("mobile-today-sales");
const openingCashInput = document.getElementById("opening-cash");
const stockTypeSummary = document.getElementById("stock-type-summary");
const stockAdjustmentGroups = document.getElementById("stock-adjustment-groups");
const navTabs = document.querySelectorAll(".nav-tab");
const viewPanels = document.querySelectorAll(".view-panel");
const categoryNav = document.getElementById("category-nav");
const itemSearchInput = document.getElementById("item-search");
const salesSearchInput = document.getElementById("sales-search");
const salesPaymentFilter = document.getElementById("sales-payment-filter");
const exportCashPdfButton = document.getElementById("export-cash-pdf");
const exportQrPdfButton = document.getElementById("export-qr-pdf");
const toastElement = document.getElementById("toast");

let activeCategory = "All";
let selectedQuantities = {};
let editableStockLevels = {};
let itemSearchTerm = "";
let salesSearchTerm = "";
let activeSalesPaymentFilter = "All";
let toastTimer;

const priceFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2
});

function getSalesHistory() {
  const raw = localStorage.getItem(salesStorageKey);
  const records = raw ? JSON.parse(raw) : [];
  let changed = false;
  const normalized = records.map((record, index) => {
    if (!record.id) {
      changed = true;
      return {
        ...record,
        id: `sale-${Date.now()}-${index}`
      };
    }
    return record;
  });

  if (changed) {
    saveSalesHistory(normalized);
  }

  return normalized;
}

function saveSalesHistory(records) {
  localStorage.setItem(salesStorageKey, JSON.stringify(records));
}

function getStockLevels() {
  const saved = localStorage.getItem(stockStorageKey);
  const defaults = inventoryItems.reduce((stockMap, item) => {
    stockMap[item.name] = defaultStockByItem[item.name] ?? 20;
    return stockMap;
  }, {});

  if (saved) {
    const parsed = JSON.parse(saved);
    const merged = inventoryItems.reduce((stockMap, item) => {
      stockMap[item.name] = parsed[item.name] ?? defaults[item.name];
      return stockMap;
    }, {});
    localStorage.setItem(stockStorageKey, JSON.stringify(merged));
    return merged;
  }

  localStorage.setItem(stockStorageKey, JSON.stringify(defaults));
  return defaults;
}

function saveStockLevels(stockLevels) {
  localStorage.setItem(stockStorageKey, JSON.stringify(stockLevels));
}

function getOpeningCash() {
  return Number(localStorage.getItem(openingCashStorageKey) || 0);
}

function saveOpeningCash(amount) {
  localStorage.setItem(openingCashStorageKey, String(amount));
}

function showToast(message, type = "info") {
  if (!toastElement) {
    return;
  }

  toastElement.textContent = message;
  toastElement.className = `app-toast show ${type}`;

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastElement.className = "app-toast";
  }, 2600);
}

function renderCatalog() {
  const stockLevels = editableStockLevels;
  const quantityMap = selectedQuantities;
  const categories = ["All", ...new Set(inventoryItems.map((item) => item.category))];
  const normalizedItemSearch = itemSearchTerm.trim().toLowerCase();
  const visibleItems = inventoryItems
    .map((item, index) => ({ ...item, index }))
    .filter((item) => activeCategory === "All" || item.category === activeCategory)
    .filter((item) => {
      if (!normalizedItemSearch) {
        return true;
      }

      return `${item.name} ${item.category}`.toLowerCase().includes(normalizedItemSearch);
    });

  categoryNav.innerHTML = categories
    .map(
      (category) => `
        <button class="category-button ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">
          <span class="category-icon ${categoryMeta[category]?.labelClass || ""}">${categoryMeta[category]?.icon || "--"}</span>
          <span class="category-text">${category}</span>
        </button>
      `
    )
    .join("");

  catalog.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="catalog-card ${item.flavorClass} ${quantityMap[item.name] ? "selected" : ""}" data-card-index="${item.index}">
          ${quantityMap[item.name] ? `<span class="selection-badge">${quantityMap[item.name]}</span>` : ""}
          <span class="category-tag">${item.category}</span>
          <p class="item-name">${item.name}</p>
          <p class="item-price">${priceFormatter.format(item.price)} / pcs</p>
          <div class="item-stock-display">Available: ${stockLevels[item.name] ?? 0}</div>
          ${
            quantityMap[item.name]
              ? `
                <div class="card-actions">
                  <button class="mini-button" type="button" data-action="decrease" data-item-index="${item.index}">-1</button>
                  <button class="mini-button danger" type="button" data-action="clear" data-item-index="${item.index}">Remove</button>
                </div>
              `
              : ""
          }
        </article>
      `
    )
    .join("");

  if (!visibleItems.length) {
    catalog.innerHTML = `<div class="catalog-empty-state">No matching items found.</div>`;
  }

  document.getElementById("product-count").textContent = inventoryItems.length;
  updateInventoryMetrics();
}

function renderStockAdjustmentView() {
  const groupedItems = inventoryItems.reduce((groups, item, index) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push({ ...item, index, stock: Number(editableStockLevels[item.name] ?? 0) });
    return groups;
  }, {});

  stockTypeSummary.innerHTML = Object.entries(groupedItems)
    .map(([category, items]) => {
      const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
      return `
        <article class="stock-summary-card">
          <span class="stock-summary-label">${category}</span>
          <strong class="stock-summary-value">${totalStock}</strong>
          <span class="stock-summary-unit">pcs in stock</span>
        </article>
      `;
    })
    .join("");

  stockAdjustmentGroups.innerHTML = Object.entries(groupedItems)
    .map(([category, items]) => {
      const totalStock = items.reduce((sum, item) => sum + item.stock, 0);

      return `
        <section class="stock-group-card">
          <div class="stock-group-header">
            <div>
              <p class="section-label">${category}</p>
              <h3>${category} Items</h3>
            </div>
            <strong class="stock-group-total">${totalStock} pcs</strong>
          </div>
          <div class="stock-group-list">
            ${items
              .map(
                (item) => `
                  <div class="stock-adjust-item">
                    <div class="stock-adjust-copy">
                      <p class="stock-adjust-name">${item.name}</p>
                      <p class="stock-adjust-price">${priceFormatter.format(item.price)}</p>
                    </div>
                    <input
                      class="stock-adjust-input"
                      type="number"
                      min="0"
                      value="${item.stock}"
                      data-stock-adjust-name="${item.name}"
                    >
                  </div>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function getSelectedItems() {
  return inventoryItems
    .map((item) => ({
      ...item,
      quantity: Number(selectedQuantities[item.name] || 0),
      subtotal: item.price * Number(selectedQuantities[item.name] || 0)
    }))
    .filter((item) => item.quantity > 0);
}

function calculateOrder() {
  const stockLevels = editableStockLevels;
  const selectedItems = getSelectedItems();
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  if (!selectedItems.length) {
    selectedItemsContainer.className = "selected-items empty-state";
    selectedItemsContainer.textContent = "Select quantities from the menu to see the order summary.";
  } else {
    selectedItemsContainer.className = "selected-items";
    selectedItemsContainer.innerHTML = selectedItems
      .map(
        (item) => `
          <div class="selected-item">
            <div>
              <strong>${item.name}</strong>
              <div>${item.quantity} x ${priceFormatter.format(item.price)} | Stock left: ${stockLevels[item.name] ?? 0}</div>
            </div>
            <strong>${priceFormatter.format(item.subtotal)}</strong>
          </div>
        `
      )
      .join("");
  }

  totalItemsElement.textContent = String(totalItems);
  document.getElementById("selected-quantity-total").textContent = String(totalItems);
  orderTotalElement.textContent = priceFormatter.format(totalAmount);
  mobileTotalItemsElement.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"}`;
  mobileOrderTotalElement.textContent = priceFormatter.format(totalAmount);

  return {
    selectedItems,
    totalItems,
    totalAmount
  };
}

function updateInventoryMetrics() {
  const stockLevels = editableStockLevels;
  const inventoryValue = inventoryItems.reduce((sum, item) => {
    return sum + ((stockLevels[item.name] ?? 0) * item.price);
  }, 0);

  document.getElementById("inventory-value").textContent = priceFormatter.format(inventoryValue);
  renderStockAdjustmentView();
}

function notifyOneLeftStock(stockLevels) {
  const oneLeftItems = inventoryItems.filter((item) => Number(stockLevels[item.name] ?? 0) === 1);

  if (!oneLeftItems.length) {
    return;
  }

  const itemNames = oneLeftItems.map((item) => item.name).join(", ");
  showToast(`Low stock alert: only 1 left for ${itemNames}.`, "warning");
}

function getFilteredSalesRecords(records = getSalesHistory()) {
  const normalizedSalesSearch = salesSearchTerm.trim().toLowerCase();

  return records.filter((record) => {
    const paymentMatches = activeSalesPaymentFilter === "All" || record.paymentMethod === activeSalesPaymentFilter;

    if (!paymentMatches) {
      return false;
    }

    if (!normalizedSalesSearch) {
      return true;
    }

    const itemsText = record.items
      .map((item) => `${item.name} ${item.quantity}`)
      .join(" ");
    const dateText = new Date(record.createdAt).toLocaleDateString("en-MY");
    const timeText = new Date(record.createdAt).toLocaleTimeString("en-MY");
    const amountText = priceFormatter.format(record.totalAmount);
    const searchText = `${itemsText} ${record.paymentMethod} ${dateText} ${timeText} ${amountText}`.toLowerCase();

    return searchText.includes(normalizedSalesSearch);
  });
}

function buildSalesReportMarkup(paymentMethod, records, totalAmount, reportDate) {
  const rows = records
    .slice()
    .reverse()
    .map((record, index) => {
      const items = record.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${new Date(record.createdAt).toLocaleDateString("en-MY")}</td>
          <td>${new Date(record.createdAt).toLocaleTimeString("en-MY")}</td>
          <td>${items}</td>
          <td>${priceFormatter.format(record.totalAmount)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="print-report-sheet">
      <h1>${paymentMethod} Sales Report</h1>
      <div class="print-report-meta">Generated on ${reportDate.toLocaleDateString("en-MY")} ${reportDate.toLocaleTimeString("en-MY")}</div>
      <div class="print-report-summary">
        <strong>Total ${paymentMethod} Sales:</strong> ${priceFormatter.format(totalAmount)}<br>
        <strong>Transactions:</strong> ${records.length}
      </div>
      <table class="print-report-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Time</th>
            <th>Items</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function clearPrintReport() {
  document.body.classList.remove("printing-report");
  document.getElementById("print-report-root")?.remove();
}

function exportSalesPdf(paymentMethod) {
  const records = getSalesHistory().filter((record) => record.paymentMethod === paymentMethod);

  if (!records.length) {
    showToast(`No ${paymentMethod} sales available to export.`, "warning");
    return;
  }

  const totalAmount = records.reduce((sum, record) => sum + record.totalAmount, 0);
  const reportDate = new Date();
  clearPrintReport();

  const reportRoot = document.createElement("div");
  reportRoot.id = "print-report-root";
  reportRoot.className = "print-report-root";
  reportRoot.innerHTML = buildSalesReportMarkup(paymentMethod, records, totalAmount, reportDate);
  document.body.appendChild(reportRoot);
  document.body.classList.add("printing-report");

  const handleAfterPrint = () => {
    clearPrintReport();
    window.removeEventListener("afterprint", handleAfterPrint);
  };

  window.addEventListener("afterprint", handleAfterPrint);

  window.setTimeout(() => {
    window.print();
  }, 120);
}

function renderSalesHistory() {
  const records = getSalesHistory();
  const openingCash = getOpeningCash();
  const cashTotal = records
    .filter((record) => record.paymentMethod === "Cash")
    .reduce((sum, record) => sum + record.totalAmount, 0);
  const qrTotal = records
    .filter((record) => record.paymentMethod === "QR")
    .reduce((sum, record) => sum + record.totalAmount, 0);
  const today = new Date().toDateString();
  const todaySales = records
    .filter((record) => new Date(record.createdAt).toDateString() === today)
    .reduce((sum, record) => sum + record.totalAmount, 0);

  document.getElementById("cash-total").textContent = priceFormatter.format(cashTotal);
  document.getElementById("qr-total").textContent = priceFormatter.format(qrTotal);
  document.getElementById("opening-cash-total").textContent = priceFormatter.format(openingCash);
  document.getElementById("cash-drawer-total").textContent = priceFormatter.format(openingCash + cashTotal);
  document.getElementById("transaction-count").textContent = String(records.length);
  document.getElementById("today-sales").textContent = priceFormatter.format(todaySales);
  mobileTodaySalesElement.textContent = priceFormatter.format(todaySales);
  openingCashInput.value = openingCash ? String(openingCash) : "";

  const filteredRecords = getFilteredSalesRecords(records);

  if (!records.length) {
    historyTable.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">No sales recorded yet.</td>
      </tr>
    `;
    mobileSalesHistory.innerHTML = `<div class="empty-sales-cards">No sales recorded yet.</div>`;
    return;
  }

  if (!filteredRecords.length) {
    historyTable.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">No matching sales found.</td>
      </tr>
    `;
    mobileSalesHistory.innerHTML = `<div class="empty-sales-cards">No matching sales found.</div>`;
    return;
  }

  historyTable.innerHTML = filteredRecords
    .slice()
    .reverse()
    .map((record) => {
      const items = record.items
        .map((item) => `${item.name} (${item.quantity})`)
        .join(", ");
      const paymentClass = record.paymentMethod === "Cash" ? "payment-cash" : "payment-qr";

      return `
        <tr>
          <td>
            <div>${new Date(record.createdAt).toLocaleDateString("en-MY")}</div>
            <div class="record-time">${new Date(record.createdAt).toLocaleTimeString("en-MY")}</div>
          </td>
          <td>${items}</td>
          <td>
            <div class="record-payment-cell">
              <span class="payment-badge ${paymentClass}">${record.paymentMethod}</span>
              <select class="record-payment-select" data-sale-id="${record.id}">
                <option value="Cash" ${record.paymentMethod === "Cash" ? "selected" : ""}>Cash</option>
                <option value="QR" ${record.paymentMethod === "QR" ? "selected" : ""}>QR</option>
              </select>
            </div>
          </td>
          <td>${priceFormatter.format(record.totalAmount)}</td>
          <td><button class="mini-button danger record-delete-button" type="button" data-sale-id="${record.id}">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  mobileSalesHistory.innerHTML = filteredRecords
    .slice()
    .reverse()
    .map((record) => {
      const items = record.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");
      const paymentClass = record.paymentMethod === "Cash" ? "payment-cash" : "payment-qr";

      return `
        <article class="sales-card">
          <div class="sales-card-top">
            <div>
              <strong>Sale Record</strong>
              <div class="record-time">${new Date(record.createdAt).toLocaleDateString("en-MY")} ${new Date(record.createdAt).toLocaleTimeString("en-MY")}</div>
            </div>
            <div class="record-payment-cell">
              <span class="payment-badge ${paymentClass}">${record.paymentMethod}</span>
              <select class="record-payment-select" data-sale-id="${record.id}">
                <option value="Cash" ${record.paymentMethod === "Cash" ? "selected" : ""}>Cash</option>
                <option value="QR" ${record.paymentMethod === "QR" ? "selected" : ""}>QR</option>
              </select>
            </div>
          </div>
          <p class="sales-card-items">${items}</p>
          <div class="sales-card-total">${priceFormatter.format(record.totalAmount)}</div>
          <div class="record-actions">
            <button class="mini-button danger record-delete-button" type="button" data-sale-id="${record.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateSalePaymentMethod(saleId, nextPaymentMethod) {
  const records = getSalesHistory();
  const targetRecord = records.find((record) => record.id === saleId);

  if (!targetRecord || targetRecord.paymentMethod === nextPaymentMethod) {
    renderSalesHistory();
    return;
  }

  const confirmed = window.confirm(`Are you sure you want to change the payment method to ${nextPaymentMethod}?`);

  if (!confirmed) {
    renderSalesHistory();
    return;
  }

  const updatedRecords = records.map((record) => {
    if (record.id !== saleId) {
      return record;
    }

    return {
      ...record,
      paymentMethod: nextPaymentMethod
    };
  });

  saveSalesHistory(updatedRecords);
  renderSalesHistory();
  showToast("Payment method updated.", "success");
}

function deleteSaleRecord(saleId) {
  const confirmed = window.confirm("Are you sure you want to delete this recorded sale?");

  if (!confirmed) {
    return;
  }

  const records = getSalesHistory();
  const recordToDelete = records.find((record) => record.id === saleId);
  const updatedRecords = records.filter((record) => record.id !== saleId);

  if (recordToDelete) {
    const currentStockLevels = getStockLevels();
    recordToDelete.items.forEach((item) => {
      currentStockLevels[item.name] = Math.max(
        0,
        Number(currentStockLevels[item.name] || 0) + Number(item.quantity || 0)
      );
    });
    saveStockLevels(currentStockLevels);
    editableStockLevels = { ...currentStockLevels };
    renderCatalog();
    updateInventoryMetrics();
  }

  saveSalesHistory(updatedRecords);
  renderSalesHistory();
}

function resetQuantities() {
  selectedQuantities = {};
  paymentMethodInput.value = "Cash";
  renderCatalog();
  calculateOrder();
}

function persistStockInputs() {
  saveStockLevels(editableStockLevels);
  calculateOrder();
  updateInventoryMetrics();
}

function setActiveView(targetId) {
  navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.viewTarget === targetId);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });
}

document.getElementById("calculate-total").addEventListener("click", calculateOrder);

document.getElementById("reset-quantities").addEventListener("click", resetQuantities);

document.getElementById("save-all-stock").addEventListener("click", () => {
  saveStockLevels(editableStockLevels);
  renderCatalog();
  renderStockAdjustmentView();
  notifyOneLeftStock(editableStockLevels);
  showToast("All stock quantities saved.", "success");
});

document.getElementById("clear-history").addEventListener("click", () => {
  localStorage.removeItem(salesStorageKey);
  renderSalesHistory();
});

document.getElementById("save-opening-cash").addEventListener("click", () => {
  const amount = Math.max(0, Number(openingCashInput.value || 0));
  saveOpeningCash(amount);
  renderSalesHistory();
  showToast("Opening cash saved.", "success");
});

itemSearchInput.addEventListener("input", () => {
  itemSearchTerm = itemSearchInput.value || "";
  renderCatalog();
});

salesSearchInput.addEventListener("input", () => {
  salesSearchTerm = salesSearchInput.value || "";
  renderSalesHistory();
});

salesPaymentFilter.addEventListener("change", () => {
  activeSalesPaymentFilter = salesPaymentFilter.value;
  renderSalesHistory();
});

exportCashPdfButton.addEventListener("click", () => {
  exportSalesPdf("Cash");
});

exportQrPdfButton.addEventListener("click", () => {
  exportSalesPdf("QR");
});

categoryNav.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");

  if (!categoryButton) {
    return;
  }

  activeCategory = categoryButton.dataset.category;
  renderCatalog();
});

document.getElementById("checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const { selectedItems, totalAmount } = calculateOrder();
  const stockLevels = getStockLevels();

  if (!selectedItems.length) {
    window.alert("Please add at least one item before recording the sale.");
    return;
  }

  const insufficientStock = selectedItems.find((item) => item.quantity > (stockLevels[item.name] ?? 0));

  if (insufficientStock) {
    window.alert(`Not enough stock for ${insufficientStock.name}.`);
    return;
  }

  const salesHistory = getSalesHistory();
  salesHistory.push({
    id: `sale-${Date.now()}`,
    paymentMethod: paymentMethodInput.value,
    totalAmount,
    items: selectedItems.map(({ name, quantity, price, subtotal }) => ({
      name,
      quantity,
      price,
      subtotal
    })),
    createdAt: new Date().toISOString()
  });

  selectedItems.forEach((item) => {
    stockLevels[item.name] = Math.max(0, (stockLevels[item.name] ?? 0) - item.quantity);
  });

  saveSalesHistory(salesHistory);
  saveStockLevels(stockLevels);
  editableStockLevels = { ...stockLevels };
  renderCatalog();
  renderSalesHistory();
  notifyOneLeftStock(stockLevels);
  resetQuantities();
  showToast("Sale recorded successfully.", "success");
});

mobileSalesHistory.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".record-delete-button");

  if (!deleteButton) {
    return;
  }

  deleteSaleRecord(deleteButton.dataset.saleId);
});

mobileSalesHistory.addEventListener("change", (event) => {
  const paymentSelect = event.target.closest(".record-payment-select");

  if (!paymentSelect) {
    return;
  }

  updateSalePaymentMethod(paymentSelect.dataset.saleId, paymentSelect.value);
});

historyTable.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".record-delete-button");

  if (!deleteButton) {
    return;
  }

  deleteSaleRecord(deleteButton.dataset.saleId);
});

historyTable.addEventListener("change", (event) => {
  const paymentSelect = event.target.closest(".record-payment-select");

  if (!paymentSelect) {
    return;
  }

  updateSalePaymentMethod(paymentSelect.dataset.saleId, paymentSelect.value);
});

catalog.addEventListener("input", (event) => {
  return;
});

catalog.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");

  if (actionButton) {
    event.stopPropagation();
    const itemIndex = Number(actionButton.dataset.itemIndex);
    const item = inventoryItems[itemIndex];
    const currentValue = Number(selectedQuantities[item.name] || 0);

    if (actionButton.dataset.action === "decrease") {
      selectedQuantities[item.name] = Math.max(0, currentValue - 1);
    }

    if (actionButton.dataset.action === "clear") {
      selectedQuantities[item.name] = 0;
    }

    calculateOrder();
    renderCatalog();
    return;
  }

  const card = event.target.closest("[data-card-index]");

  if (!card) {
    return;
  }

  const itemIndex = Number(card.dataset.cardIndex);
  const item = inventoryItems[itemIndex];
  const currentValue = Number(selectedQuantities[item.name] || 0);
  const stockValue = Number(editableStockLevels[item.name] || 0);

  if (currentValue >= stockValue) {
    window.alert("Cannot add more than the stock available.");
    return;
  }

  selectedQuantities[item.name] = currentValue + 1;
  calculateOrder();
  renderCatalog();
});

stockAdjustmentGroups.addEventListener("input", (event) => {
  const input = event.target.closest("[data-stock-adjust-name]");

  if (!input) {
    return;
  }

  const itemName = input.dataset.stockAdjustName;
  editableStockLevels[itemName] = Math.max(0, Number(input.value || 0));
  updateInventoryMetrics();
  renderCatalog();
});

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.viewTarget);
  });
});

editableStockLevels = getStockLevels();
renderCatalog();
calculateOrder();
renderSalesHistory();
setActiveView("checkout-view");
