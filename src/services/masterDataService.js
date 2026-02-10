// ═══════════════════════════════════════════════════════════════════════════
// Master Data Service - Brands, Stores, Collections, Categories, SKU Catalog
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

export const masterDataService = {
  // Get all brands
  async getBrands() {
    const response = await api.get('/master/brands');
    return response.data.data || response.data;
  },

  // Get all stores
  async getStores() {
    const response = await api.get('/master/stores');
    return response.data.data || response.data;
  },

  // Get all collections
  async getCollections() {
    const response = await api.get('/master/collections');
    return response.data.data || response.data;
  },

  // Get all genders
  async getGenders() {
    const response = await api.get('/master/genders');
    return response.data.data || response.data;
  },

  // Get all categories (with hierarchy)
  async getCategories() {
    const response = await api.get('/master/categories');
    return response.data.data || response.data;
  },

  // Get seasons configuration
  async getSeasons() {
    const response = await api.get('/master/seasons');
    return response.data.data || response.data;
  },

  // Get SKU catalog with filters
  async getSkuCatalog(params = {}) {
    const response = await api.get('/master/sku-catalog', { params });
    return response.data;
  },

  // Search SKU catalog
  async searchSku(search, productType = null, page = 1, pageSize = 50) {
    const params = { search, page, pageSize };
    if (productType) params.productType = productType;
    return this.getSkuCatalog(params);
  },

  // Get all sub-categories
  async getSubCategories() {
    try {
      const response = await api.get('/master/sub-categories');
      return response.data.data || response.data;
    } catch {
      // Fallback: flatten from categories hierarchy
      const categories = await this.getCategories();
      const list = Array.isArray(categories) ? categories : [];
      const subs = [];
      list.forEach(cat => {
        (cat.subCategories || []).forEach(sub => {
          subs.push({
            ...sub,
            parent: { id: cat.id, name: cat.name, code: cat.code }
          });
        });
      });
      return subs;
    }
  }
};

export default masterDataService;
