// ═══════════════════════════════════════════════════════════════════════════
// Master Data Service - Brands, Stores, Season Types, Categories, SKU Catalog
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';

const extract = (response: any) => response.data?.data ?? response.data;

export const masterDataService = {
  // Get all brands (optionally limited)
  async getBrands(params?: { groupBrandId?: string; limit?: number }) {
    try {
      const response = await api.get('/master/brands', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getBrands]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all stores
  async getStores(params?: { limit?: number }) {
    try {
      const response = await api.get('/master/stores', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getStores]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all season types
  async getSeasonTypes() {
    try {
      const response = await api.get('/master/season-types');
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getSeasonTypes]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all genders
  async getGenders() {
    try {
      const response = await api.get('/master/genders');
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getGenders]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all categories (with hierarchy)
  async getCategories(params?: { genderId?: string; subCategoryLimit?: number }) {
    try {
      const response = await api.get('/master/categories', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getCategories]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get season groups with their seasons (SS, FW, etc.)
  async getSeasonGroups(params?: { year?: number }) {
    try {
      const response = await api.get('/master/season-groups', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getSeasonGroups]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get seasons configuration
  async getSeasons() {
    try {
      const response = await api.get('/master/seasons');
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getSeasons]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get SKU catalog with filters
  async getSkuCatalog(params: any = {}) {
    try {
      const response = await api.get('/master/sku-catalog', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getSkuCatalog]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all sub-categories (flatten from categories hierarchy — direct endpoint not yet implemented)
  async getSubCategories() {
    try {
      const categories: any = await this.getCategories();
      const list: any[] = Array.isArray(categories) ? categories : [];
      const subs: any[] = [];
      list.forEach((cat: any) => {
        (cat.subCategories || []).forEach((sub: any) => {
          subs.push({
            ...sub,
            parent: { id: cat.id, name: cat.name, code: cat.code }
          });
        });
      });
      return subs;
    } catch (err: any) {
      console.error('[masterDataService.getSubCategories]', err?.response?.status, err?.message);
      throw err;
    }
  }
};

export default masterDataService;
