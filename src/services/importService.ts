import api from './api';
import { extract } from './serviceUtils';

export const importService = {
  batchImport: (data: any) => api.post('/import/batch', data).then(extract),
  queryData: (params: any) => api.get('/import/data', { params }).then(extract),
  getStats: (target: string) => api.get('/import/stats', { params: { target } }).then(extract),
  getAllStats: () => api.get('/import/all-stats').then(extract),
  deleteData: (data: any) => api.delete('/import/data', { data }).then(extract),
  deleteSession: (target: string, sessionId: string) => api.delete(`/import/session/${sessionId}`, { params: { target } }).then(extract),
  clearTarget: (target: string) => api.delete(`/import/clear/${target}`).then(extract),
};
