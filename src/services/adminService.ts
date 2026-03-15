import api from './api';

const extract = (res: any) => res.data?.data ?? res.data;

export const adminService = {
  async getUsers() {
    const res = await api.get('/admin/users');
    return extract(res);
  },

  async getRoles() {
    const res = await api.get('/admin/roles');
    return extract(res);
  },

  async createUser(data: {
    email: string;
    name: string;
    roleId: number;
    password?: string;
    isActive?: boolean;
  }) {
    const res = await api.post('/admin/users', data);
    return extract(res);
  },

  async updateUser(id: number, data: { name?: string; roleId?: number; isActive?: boolean }) {
    const res = await api.patch(`/admin/users/${id}`, data);
    return extract(res);
  },

  async deleteUser(id: number) {
    const res = await api.delete(`/admin/users/${id}`);
    return extract(res);
  },

  async resetPassword(id: number): Promise<{ password: string }> {
    const res = await api.post(`/admin/users/${id}/reset-password`);
    return extract(res);
  },
};
