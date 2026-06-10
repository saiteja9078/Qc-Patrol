import api from './axiosInstance'

export const patrolApi = {
  createRecord: (data) => api.post('/records/', data),
  listRecords: ({ date, page = 1, page_size = 20 } = {}) =>
    api.get('/records/', { params: { date, page, page_size } }),
  getDates: () => api.get('/records/dates'),
  getRecord: (id) => api.get(`/records/${id}`),
  updateRecord: (id, data) => api.put(`/records/${id}`, data),
  deleteRecord: (id) => api.delete(`/records/${id}`),
  exportPdf: (id) =>
    api.get(`/export/pdf/${id}`, { responseType: 'blob' }),
  exportBulkPdf: (date) =>
    api.get('/export/pdf/bulk', { params: { date }, responseType: 'blob' }),
}
