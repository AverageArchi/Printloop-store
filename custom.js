(function () {
  'use strict';

  var YML_URLS = [
    '/tstore/yml/9912592c705955c907f472521d03869b.yml',
    'https://printloop.store/tstore/yml/9912592c705955c907f472521d03869b.yml',
    'https://printloop.ru/tstore/yml/9912592c705955c907f472521d03869b.yml',
    '/store-13587701-202601200130.yml'
  ];
  var SLUG_TO_CATEGORY = {
    tshirts: 'Футболки',
    hoodies: 'Толстовки',
    popular: 'Популярное',
    new: 'Новинки',
    gift: 'В подарок',
    pairs: 'Парные',
    games: 'Игры',
    memes: 'Мемы',
    films: 'Кино',
    sport: 'Спорт'
  };

  function text(node, selector) {
    var el = node.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  function stripVariant(name) {
    return name.replace(/\s*-\s*(2XL|XS|S|M|L|XL|XXL|XXXL)(\s*-.*)?$/i, '').trim();
  }

  function parseYml(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    var categories = {};
    var categoriesByName = {};
    doc.querySelectorAll('category').forEach(function (cat) {
      var id = cat.getAttribute('id');
      var name = cat.textContent.trim();
      categories[id] = name;
      categoriesByName[name.toLowerCase()] = id;
    });

    var offersMap = {};
    doc.querySelectorAll('offer').forEach(function (offer) {
      var groupId = offer.getAttribute('group_id') || offer.getAttribute('id');
      if (offersMap[groupId]) {
        return;
      }
      offersMap[groupId] = {
        id: offer.getAttribute('id'),
        groupId: groupId,
        name: stripVariant(text(offer, 'name')),
        url: text(offer, 'url'),
        picture: text(offer, 'picture'),
        price: text(offer, 'price'),
        categoryId: text(offer, 'categoryId')
      };
    });

    return {
      categories: categories,
      categoriesByName: categoriesByName,
      offers: Object.keys(offersMap).map(function (key) { return offersMap[key]; })
    };
  }

  function getCategoryIdForPath(categoriesByName) {
    var path = window.location.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/') {
      return '';
    }
    if (path === '/catalog') {
      return '';
    }
    if (path.indexOf('/catalog/') === 0) {
      var slug = path.split('/').pop();
      var name = SLUG_TO_CATEGORY[slug];
      if (!name) {
        return '';
      }
      return categoriesByName[name.toLowerCase()] || '';
    }
    return '';
  }

  function getColClass(storeEl) {
    var preloaderCard = storeEl.querySelector('.t-store__card-preloader');
    if (!preloaderCard) {
      return 't-store__stretch-col t-store__stretch-col_25 t-col t-col_3';
    }
    var classes = Array.prototype.slice.call(preloaderCard.classList);
    return classes.filter(function (c) { return c !== 't-store__card-preloader'; }).join(' ');
  }

  function ensureGrid(storeEl) {
    var grid = storeEl.querySelector('.js-store-grid-cont');
    if (grid) {
      return grid;
    }
    var preloader = storeEl.querySelector('.js-store-grid-cont-preloader');
    grid = document.createElement('div');
    if (preloader) {
      grid.className = preloader.className.replace('js-store-grid-cont-preloader', 'js-store-grid-cont');
      preloader.parentNode.insertBefore(grid, preloader.nextSibling);
    } else {
      grid.className = 'js-store-grid-cont t-store__grid-cont t-container';
      storeEl.appendChild(grid);
    }
    return grid;
  }

  function hasCards(storeEl) {
    return !!storeEl.querySelector('.t-store__card');
  }

  function buildCard(offer, colClass) {
    var col = document.createElement('div');
    col.className = colClass;
    var price = parseFloat(offer.price);
    var priceText = isNaN(price) ? offer.price : Math.round(price).toString();
    col.innerHTML =
      '<div class="t-store__card__wrap_all">' +
        '<div class="t-store__card__imgwrapper">' +
          '<a class="t-store__card__imgwrapper_in" href="' + offer.url + '">' +
            '<div class="t-store__card__bgimg t-bgimg" style="background-image:url(\\'' + offer.picture + '\\')"></div>' +
            '<img class="t-store__card__img" src="' + offer.picture + '" alt="' + offer.name + '" />' +
          '</a>' +
        '</div>' +
        '<div class="t-store__card__textwrapper">' +
          '<div class="t-store__card__title">' + offer.name + '</div>' +
          '<div class="t-store__card__price">' + priceText + ' р.</div>' +
          '<div class="t-store__card__btns-wrapper">' +
            '<a class="t-btn t-btnflex t-btnflex_type_button t-btnflex_sm t-store__card__btn" href="' + offer.url + '">' +
              '<span class="t-btnflex__text t-store__card__btn-text">Подробнее</span>' +
            '</a>' +
            '<a class="t-btn t-btnflex t-btnflex_type_button2 t-btnflex_sm t-store__card__btn t-store__card__btn_second" href="' + offer.url + '#order">' +
              '<span class="t-btnflex__text t-store__card__btn-text">Купить</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    return col;
  }

  function renderStore(storeEl, data) {
    if (!data || !data.offers.length) {
      return;
    }
    var categoryId = getCategoryIdForPath(data.categoriesByName);
    var offers = data.offers.filter(function (offer) {
      return !categoryId || offer.categoryId === categoryId;
    });
    if (!offers.length) {
      return;
    }
    var limit = window.location.pathname.indexOf('/catalog') === 0 ? 24 : 8;
    var grid = ensureGrid(storeEl);
    grid.innerHTML = '';
    var colClass = getColClass(storeEl);
    offers.slice(0, limit).forEach(function (offer) {
      grid.appendChild(buildCard(offer, colClass));
    });
  }

  function init() {
    var stores = document.querySelectorAll('.t-store.js-store');
    if (!stores.length) {
      return;
    }
    fetchYml(0)
      .then(function (xmlText) {
        var data = parseYml(xmlText);
        setTimeout(function () {
          stores.forEach(function (storeEl) {
            if (!hasCards(storeEl)) {
              renderStore(storeEl, data);
            }
          });
        }, 700);
      })
      .catch(function () {});
  }

  function fetchYml(index) {
    if (index >= YML_URLS.length) {
      return Promise.reject();
    }
    return fetch(YML_URLS[index])
      .then(function (res) {
        if (!res.ok) {
          throw new Error('bad response');
        }
        return res.text();
      })
      .then(function (xmlText) {
        return xmlText;
      })
      .catch(function () {
        return fetchYml(index + 1);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
