(function () {
  "use strict";

  var PRODUCTS = window.PRODUCTS;
  var TRANSLATIONS = window.TRANSLATIONS;
  var MAX_QTY = 99;

  var KEYS = { cart: "plwc-cart", lang: "plwc-lang", theme: "plwc-theme" };

  /* ---------- Kalıcı depolama (localStorage kapalıysa da çalışır) ---------- */
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* depolama kullanılamıyor: sessizce devam et */
      }
    }
  };

  /* ---------- Durum ---------- */
  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  // Sepet: eklenme sırasını korumak için [{ id, qty }] dizisi
  function sanitizeCart(raw) {
    if (!Array.isArray(raw)) return [];
    var seen = {};
    return raw.filter(function (item) {
      var ok =
        item &&
        typeof item.id === "string" &&
        findProduct(item.id) &&
        !seen[item.id] &&
        Number.isInteger(item.qty) &&
        item.qty > 0 &&
        item.qty <= MAX_QTY;
      if (ok) seen[item.id] = true;
      return ok;
    });
  }

  var savedLang = storage.get(KEYS.lang, "tr");
  var state = {
    cart: sanitizeCart(storage.get(KEYS.cart, [])),
    lang: TRANSLATIONS[savedLang] ? savedLang : "tr",
    theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  };

  /* ---------- Yardımcılar ---------- */
  function t(key, params) {
    var str = TRANSLATIONS[state.lang][key];
    if (str === undefined) str = TRANSLATIONS.tr[key] || key;
    if (params) {
      Object.keys(params).forEach(function (p) {
        str = str.split("{" + p + "}").join(params[p]);
      });
    }
    return str;
  }

  var currencyFormatters = {};
  function formatPrice(value) {
    var locale = TRANSLATIONS[state.lang].locale;
    if (!currencyFormatters[locale]) {
      currencyFormatters[locale] = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "TRY",
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return currencyFormatters[locale].format(value);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getQty(id) {
    for (var i = 0; i < state.cart.length; i++) {
      if (state.cart[i].id === id) return state.cart[i].qty;
    }
    return 0;
  }

  function cartCount() {
    return state.cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function cartTotal() {
    // Kuruş hassasiyetinde topla (kayan nokta hatalarını önler)
    var cents = state.cart.reduce(function (sum, item) {
      return sum + Math.round(findProduct(item.id).price * 100) * item.qty;
    }, 0);
    return cents / 100;
  }

  function lineTotal(item) {
    return (Math.round(findProduct(item.id).price * 100) * item.qty) / 100;
  }

  function imgPath(id, variant) {
    return "assets/images/image-" + id + "-" + variant + ".jpg";
  }

  var liveRegion = document.getElementById("live-region");
  function announce(msg) {
    liveRegion.textContent = "";
    // Aynı mesajın tekrar okunması için küçük gecikme
    window.setTimeout(function () { liveRegion.textContent = msg; }, 50);
  }

  /* ---------- İkonlar ---------- */
  var ICONS = {
    cart:
      '<svg width="20" height="20" viewBox="0 0 21 20" fill="none" aria-hidden="true">' +
      '<path d="M1.5 1.5h2.3l2.2 11h10.3l2-7.5H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="cart-icon-body"/>' +
      '<circle cx="7.5" cy="16.5" r="1.4" fill="currentColor" class="cart-icon-fill"/>' +
      '<circle cx="15" cy="16.5" r="1.4" fill="currentColor" class="cart-icon-fill"/>' +
      '<path d="M11.5 6.5v4M9.5 8.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      "</svg>",
    plus:
      '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    minus:
      '<svg width="10" height="2" viewBox="0 0 10 2" aria-hidden="true"><path d="M1 1h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    remove:
      '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    tree:
      '<svg width="21" height="20" viewBox="0 0 21 20" fill="none" aria-hidden="true">' +
      '<path d="M10.5 18.5v-7M10.5 13.5l-2.5-2.5M10.5 12l2.5-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M6.2 14.5H5.6a3.8 3.8 0 0 1-.6-7.55A5.6 5.6 0 0 1 15.9 6a4.3 4.3 0 0 1-.6 8.5h-.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    emptyCart:
      '<svg class="cart-empty__img" width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden="true">' +
      '<ellipse cx="64" cy="112" rx="44" ry="6" fill="currentColor" opacity=".12"/>' +
      '<path d="M22 66c0-8 19-14 42-14s42 6 42 14v30c0 8-19 14-42 14s-42-6-42-14V66z" fill="#c9aea6"/>' +
      '<ellipse cx="64" cy="66" rx="42" ry="14" fill="#e8d9d4"/>' +
      '<path d="M22 80c0 8 19 14 42 14s42-6 42-14" stroke="#ad8a85" stroke-width="5"/>' +
      '<path d="M64 52l42 14v30c-6 5-18 9-42 14V52z" fill="#87635a" opacity=".35"/>' +
      '<path d="M70 36c0-5 12-8 26-8s26 3 26 8v18c0 5-12 8-26 8s-26-3-26-8V36z" fill="#c9aea6"/>' +
      '<ellipse cx="96" cy="36" rx="26" ry="8" fill="#e8d9d4"/>' +
      '<path d="M70 45c0 5 12 8 26 8s26-3 26-8" stroke="#ad8a85" stroke-width="4"/>' +
      '<circle cx="96" cy="31" r="4" fill="#c73b0f"/>' +
      "</svg>"
  };

  /* ---------- Ürün listesi ---------- */
  var grid = document.getElementById("product-grid");

  function controlsHtml(product) {
    var name = escapeHtml(product.name[state.lang]);
    var qty = getQty(product.id);

    if (qty === 0) {
      return (
        '<button type="button" class="add-btn" data-action="add" data-id="' + product.id + '" aria-label="' +
        escapeHtml(t("addToCartLabel", { name: product.name[state.lang] })) + '">' +
        ICONS.cart + "<span>" + escapeHtml(t("addToCart")) + "</span></button>"
      );
    }

    return (
      '<div class="qty-control" role="group" aria-label="' + name + '">' +
      '<button type="button" class="qty-btn" data-action="dec" data-id="' + product.id + '" aria-label="' +
      escapeHtml(t("decrement", { name: product.name[state.lang] })) + '">' + ICONS.minus + "</button>" +
      '<span class="qty-value" aria-label="' + escapeHtml(t("quantity", { n: qty })) + '">' + qty + "</span>" +
      '<button type="button" class="qty-btn" data-action="inc" data-id="' + product.id + '" aria-label="' +
      escapeHtml(t("increment", { name: product.name[state.lang] })) + '"' +
      (qty >= MAX_QTY ? " disabled" : "") + ">" + ICONS.plus + "</button>" +
      "</div>"
    );
  }

  function renderProducts() {
    grid.innerHTML = PRODUCTS.map(function (p) {
      var name = escapeHtml(p.name[state.lang]);
      var selected = getQty(p.id) > 0;
      return (
        '<li class="product' + (selected ? " is-selected" : "") + '" data-product="' + p.id + '">' +
        '<div class="product__media">' +
        "<picture>" +
        '<source media="(min-width: 1024px)" srcset="' + imgPath(p.id, "desktop") + '">' +
        '<source media="(min-width: 600px)" srcset="' + imgPath(p.id, "tablet") + '">' +
        '<img class="product__img" src="' + imgPath(p.id, "mobile") + '" alt="' + name + '" width="654" height="424" loading="lazy">' +
        "</picture>" +
        '<div class="product__controls">' + controlsHtml(p) + "</div>" +
        "</div>" +
        '<p class="product__category">' + escapeHtml(p.category[state.lang]) + "</p>" +
        '<h3 class="product__name">' + name + "</h3>" +
        '<p class="product__price">' + formatPrice(p.price) + "</p>" +
        "</li>"
      );
    }).join("");
  }

  // Tek kartı güncelle; odağı mantıklı yere taşı
  function updateProductCard(id, focusAction) {
    var card = grid.querySelector('[data-product="' + id + '"]');
    if (!card) return;
    var product = findProduct(id);
    var controls = card.querySelector(".product__controls");
    var hadFocus = controls.contains(document.activeElement);

    card.classList.toggle("is-selected", getQty(id) > 0);
    controls.innerHTML = controlsHtml(product);

    if (hadFocus || focusAction) {
      var target =
        (focusAction && controls.querySelector('[data-action="' + focusAction + '"]:not([disabled])')) ||
        controls.querySelector("button:not([disabled])");
      if (target) target.focus();
    }
  }

  /* ---------- Sepet ---------- */
  var cartTitle = document.getElementById("cart-title");
  var cartBody = document.getElementById("cart-body");

  function renderCart() {
    cartTitle.textContent = t("cartTitle", { n: cartCount() });

    if (state.cart.length === 0) {
      cartBody.innerHTML =
        '<div class="cart-empty">' + ICONS.emptyCart +
        '<p class="cart-empty__text">' + escapeHtml(t("cartEmpty")) + "</p></div>";
      return;
    }

    var items = state.cart.map(function (item) {
      var p = findProduct(item.id);
      var name = p.name[state.lang];
      return (
        '<li class="cart-item" data-cart-item="' + p.id + '">' +
        '<div class="cart-item__info">' +
        '<p class="cart-item__name">' + escapeHtml(name) + "</p>" +
        '<p class="cart-item__meta">' +
        '<span class="cart-item__qty">' + item.qty + "x</span>" +
        '<span class="cart-item__unit">@ ' + formatPrice(p.price) + "</span>" +
        '<span class="cart-item__total">' + formatPrice(lineTotal(item)) + "</span>" +
        "</p></div>" +
        '<button type="button" class="remove-btn" data-action="remove" data-id="' + p.id + '" aria-label="' +
        escapeHtml(t("remove", { name: name })) + '">' + ICONS.remove + "</button>" +
        "</li>"
      );
    }).join("");

    cartBody.innerHTML =
      '<ul class="cart-list" role="list">' + items + "</ul>" +
      '<div class="order-total"><span>' + escapeHtml(t("orderTotal")) + "</span>" +
      '<strong class="order-total__value">' + formatPrice(cartTotal()) + "</strong></div>" +
      '<p class="carbon-note">' + ICONS.tree + "<span>" + t("carbonNeutral") + "</span></p>" +
      '<button type="button" class="btn-primary" data-action="confirm">' + escapeHtml(t("confirmOrder")) + "</button>";
  }

  /* ---------- Sepet işlemleri ---------- */
  function save() {
    storage.set(KEYS.cart, state.cart);
  }

  function setQty(id, qty) {
    qty = Math.max(0, Math.min(MAX_QTY, qty));
    var index = -1;
    for (var i = 0; i < state.cart.length; i++) {
      if (state.cart[i].id === id) { index = i; break; }
    }
    if (qty === 0) {
      if (index > -1) state.cart.splice(index, 1);
    } else if (index > -1) {
      state.cart[index].qty = qty;
    } else {
      state.cart.push({ id: id, qty: qty });
    }
    save();
  }

  function addItem(id) {
    setQty(id, 1);
    updateProductCard(id, "inc");
    renderCart();
    announce(t("announceAdded", { name: findProduct(id).name[state.lang], n: 1 }));
  }

  function changeQty(id, delta) {
    var next = getQty(id) + delta;
    setQty(id, next);
    var name = findProduct(id).name[state.lang];
    if (next <= 0) {
      updateProductCard(id, "add");
      announce(t("announceRemoved", { name: name }));
    } else {
      updateProductCard(id, delta > 0 ? "inc" : "dec");
      announce(t("announceUpdated", { name: name, n: getQty(id) }));
    }
    renderCart();
  }

  function removeItem(id) {
    // Silinen satırdan sonra odak için bir sonraki "çıkar" butonunu bul
    var ids = state.cart.map(function (i) { return i.id; });
    var pos = ids.indexOf(id);
    var nextId = ids[pos + 1] || ids[pos - 1] || null;

    setQty(id, 0);
    updateProductCard(id);
    renderCart();
    announce(t("announceRemoved", { name: findProduct(id).name[state.lang] }));

    var nextBtn = nextId && cartBody.querySelector('[data-action="remove"][data-id="' + nextId + '"]');
    if (nextBtn) nextBtn.focus();
    else cartTitle.focus();
  }

  /* ---------- Modal ---------- */
  var modal = document.getElementById("order-modal");
  var modalList = document.getElementById("modal-list");
  var modalTotal = document.getElementById("modal-total");
  var newOrderBtn = document.getElementById("new-order-btn");
  var supportsDialog = typeof modal.showModal === "function";

  function renderModal() {
    modalList.innerHTML = state.cart.map(function (item) {
      var p = findProduct(item.id);
      var name = escapeHtml(p.name[state.lang]);
      return (
        '<li class="modal-item">' +
        '<img class="modal-item__img" src="' + imgPath(p.id, "thumbnail") + '" alt="" width="48" height="48">' +
        '<div class="modal-item__info">' +
        '<p class="modal-item__name" title="' + name + '">' + name + "</p>" +
        '<p class="modal-item__meta"><span class="cart-item__qty">' + item.qty + "x</span>" +
        '<span class="cart-item__unit">@ ' + formatPrice(p.price) + "</span></p>" +
        "</div>" +
        '<span class="modal-item__total">' + formatPrice(lineTotal(item)) + "</span>" +
        "</li>"
      );
    }).join("");
    modalTotal.textContent = formatPrice(cartTotal());
  }

  function isOpen(dialog) {
    return dialog.open || dialog.hasAttribute("open");
  }

  function showDialog(dialog, focusEl) {
    document.body.classList.add("modal-open");
    if (supportsDialog) dialog.showModal();
    else dialog.setAttribute("open", "");
    focusEl.focus();
  }

  function hideDialog(dialog) {
    if (supportsDialog && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    if (!isOpen(modal) && !isOpen(confirmModal)) {
      document.body.classList.remove("modal-open");
    }
  }

  /* "Siparişi onaylamak istiyor musunuz?" penceresi */
  var confirmModal = document.getElementById("confirm-modal");
  var confirmDesc = document.getElementById("confirm-desc");
  var confirmYesBtn = document.getElementById("confirm-yes-btn");
  var confirmCancelBtn = document.getElementById("confirm-cancel-btn");

  function renderConfirm() {
    confirmDesc.textContent = t("confirmSummary", { n: cartCount(), total: formatPrice(cartTotal()) });
  }

  function askConfirm() {
    if (state.cart.length === 0) return;
    renderConfirm();
    showDialog(confirmModal, confirmYesBtn);
  }

  function focusConfirmButton() {
    var btn = cartBody.querySelector('[data-action="confirm"]');
    if (btn) btn.focus();
  }

  function cancelConfirm() {
    hideDialog(confirmModal);
    focusConfirmButton();
  }

  function openModal() {
    hideDialog(confirmModal);
    if (state.cart.length === 0) return;
    renderModal();
    showDialog(modal, newOrderBtn);
  }

  function startNewOrder() {
    state.cart = [];
    save();
    hideDialog(modal);
    renderProducts();
    renderCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("page-title").focus({ preventScroll: true });
    announce(t("announceNewOrder"));
  }

  // ESC ile kapatıldığında da kaydırma kilidini kaldır
  modal.addEventListener("close", function () {
    if (!isOpen(confirmModal)) document.body.classList.remove("modal-open");
  });

  confirmModal.addEventListener("close", function () {
    if (!isOpen(modal)) {
      document.body.classList.remove("modal-open");
      focusConfirmButton();
    }
  });

  // Onay penceresinde boş alana (arka plana) tıklayınca vazgeç
  confirmModal.addEventListener("click", function (e) {
    if (e.target === confirmModal) cancelConfirm();
  });

  confirmYesBtn.addEventListener("click", openModal);
  confirmCancelBtn.addEventListener("click", cancelConfirm);

  /* ---------- Dil & Tema ---------- */
  var langToggle = document.getElementById("lang-toggle");
  var langLabel = document.getElementById("lang-label");
  var themeToggle = document.getElementById("theme-toggle");

  function applyStaticTexts() {
    document.documentElement.lang = state.lang;
    document.title = t("docTitle");
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    }
    langLabel.textContent = t("langLabel");
    langToggle.setAttribute("aria-label", t("langSwitch"));
    langToggle.title = t("langSwitch");
    updateThemeButton();
  }

  function updateThemeButton() {
    var label = state.theme === "dark" ? t("themeToLight") : t("themeToDark");
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
    themeToggle.setAttribute("aria-pressed", state.theme === "dark" ? "true" : "false");
  }

  function setLanguage(lang) {
    state.lang = lang;
    storage.set(KEYS.lang, lang);
    applyStaticTexts();
    renderProducts();
    renderCart();
    if (isOpen(modal)) renderModal();
    if (isOpen(confirmModal)) renderConfirm();
  }

  function setTheme(theme) {
    state.theme = theme;
    storage.set(KEYS.theme, theme);
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeButton();
  }

  /* ---------- Olay dinleyicileri ---------- */
  grid.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;
    var id = btn.getAttribute("data-id");
    if (!findProduct(id)) return;
    var action = btn.getAttribute("data-action");
    if (action === "add") addItem(id);
    else if (action === "inc") changeQty(id, 1);
    else if (action === "dec") changeQty(id, -1);
  });

  cartBody.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "remove") removeItem(btn.getAttribute("data-id"));
    else if (action === "confirm") askConfirm();
  });

  newOrderBtn.addEventListener("click", startNewOrder);

  langToggle.addEventListener("click", function () {
    setLanguage(state.lang === "tr" ? "en" : "tr");
  });

  themeToggle.addEventListener("click", function () {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  // Başka sekmede yapılan değişiklikleri eşitle
  window.addEventListener("storage", function (e) {
    if (e.key === KEYS.cart) {
      state.cart = sanitizeCart(storage.get(KEYS.cart, []));
      renderProducts();
      renderCart();
    }
  });

  /* ---------- Başlat ---------- */
  applyStaticTexts();
  renderProducts();
  renderCart();
})();
