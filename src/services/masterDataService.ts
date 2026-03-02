// ═══════════════════════════════════════════════════════════════════════════
// Master Data Service - Brands, Stores, Season Types, Categories, SKU Catalog
// ═══════════════════════════════════════════════════════════════════════════
import api from './api';
import { extract } from './serviceUtils';

export const masterDataService = {
  // Get all brands
  async getBrands(params?: { groupBrandId?: string }) {
    try {
      const response = await api.get('/master/brands', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getBrands]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get all stores
  async getStores() {
    try {
      const response = await api.get('/master/stores');
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
  async getCategories(params?: { genderId?: string }) {
    try {
      const response = await api.get('/master/categories', { params });
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getCategories]', err?.response?.status, err?.message);
      throw err;
    }
  },

  // Get season groups with their seasons (SS, FW, etc.)
  async getSeasonGroups(params?: { year?: number }, opts?: { signal?: AbortSignal }) {
    try {
      const response = await api.get('/master/season-groups', { params, signal: opts?.signal });
      return extract(response);
    } catch (err: any) {
      // Don't log cancelled/aborted requests
      if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') throw err;
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

  // Get all sub-categories (flatten from categories hierarchy — legacy fallback)
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
  },

  // Get all sub-categories directly from backend endpoint (with category + gender)
  async getSubCategoriesDirect() {
    try {
      const response = await api.get('/master/sub-categories');
      return extract(response);
    } catch (err: any) {
      console.error('[masterDataService.getSubCategoriesDirect]', err?.response?.status, err?.message);
      throw err;
    }
  }
};

export default masterDataService;
