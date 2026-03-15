'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, KeyRound, Search, RefreshCw, X, Eye, EyeOff, ShieldCheck, Mail, Chrome } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  roleId: number;
  roleName: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

// Detect Microsoft/SSO users by email domain
// Adjust this to your organisation's Microsoft tenant domain(s)
const SSO_DOMAINS = ['dafc.com.vn'];
const isSSOEmail = (email: string) => SSO_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`));

const EMPTY_FORM = { email: '', name: '', roleId: 0, password: '', isActive: true, loginMethod: 'sso' as 'sso' | 'password' };

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ userId: number; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([adminService.getUsers(), adminService.getRoles()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ email: user.email, name: user.name, roleId: user.roleId, password: '', isActive: user.isActive, loginMethod: isSSOEmail(user.email) ? 'sso' : 'password' });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.roleId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, { name: form.name, roleId: form.roleId, isActive: form.isActive });
        toast.success('User updated');
      } else {
        await adminService.createUser({ email: form.email, name: form.name, roleId: form.roleId, password: form.password || undefined, isActive: form.isActive });
        toast.success('User created');
      }
      setIsModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}" (${user.email})?`)) return;
    try {
      await adminService.deleteUser(user.id);
      toast.success('User deleted');
      await load();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for "${user.name}"?`)) return;
    try {
      const result = await adminService.resetPassword(user.id);
      setResetResult({ userId: user.id, password: result.password });
      toast.success('Password reset — copy it now');
    } catch {
      toast.error('Failed to reset password');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.roleName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* ── Header card ── */}
      <div
        className="rounded-lg border overflow-hidden border-[#C4B5A5]"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.05) 35%, rgba(215,183,151,0.14) 100%)',
          boxShadow: 'inset 0 -1px 0 rgba(215,183,151,0.08)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(160,120,75,0.12) 0%, rgba(160,120,75,0.22) 100%)' }}
            >
              <ShieldCheck size={14} className="text-[#6B4D30]" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-['Montserrat'] leading-tight text-[#0A0A0A]">
                User Management
              </h1>
              <p className="text-[10px] font-['JetBrains_Mono'] text-[#999999]">
                {loading ? 'Loading...' : `${users.length} accounts`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999999]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-52 pl-8 pr-7 py-1 border rounded-md text-xs font-['Montserrat'] transition-all focus:outline-none focus:ring-1 focus:ring-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#666666]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs font-['Montserrat'] transition-all text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)] border border-[#C4B5A5]"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {/* Add */}
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-white text-xs font-medium font-['Montserrat'] transition-colors"
              style={{ background: 'linear-gradient(135deg, #D7B797 0%, #C49A6C 100%)' }}
            >
              <Plus size={13} />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div
        className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden border-[#C4B5A5]"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)' }}
      >
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#6B4D30]" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="mx-auto mb-3 text-[#2E2E2E]/30" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">
              {search ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[rgba(160,120,75,0.08)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-10">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999]">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999]">Email</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-20">Login</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-32">Role</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-24">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-t transition-colors border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.05)]"
                  >
                    <td className="px-3 py-1.5 text-xs font-['JetBrains_Mono'] text-[#BBBBBB]">{index + 1}</td>
                    <td className="px-3 py-1.5 text-xs font-['Montserrat'] font-medium text-[#0A0A0A]">{user.name}</td>
                    <td className="px-3 py-1.5 text-xs font-['JetBrains_Mono'] text-[#666666]">{user.email}</td>
                    <td className="px-3 py-1.5">
                      {isSSOEmail(user.email) ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium font-['Montserrat'] bg-blue-50 text-blue-600 border border-blue-100">
                          <svg width="10" height="10" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                          SSO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium font-['Montserrat'] bg-gray-100 text-gray-500 border border-gray-200">
                          <Mail size={9} />
                          Pass
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium font-['Montserrat'] bg-[rgba(160,120,75,0.1)] text-[#6B4D30]">
                        {user.roleName}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium font-['Montserrat'] ${
                        user.isActive
                          ? 'bg-[rgba(18,119,73,0.1)] text-[#127749]'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-[#2A9E6A]' : 'bg-red-400'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {resetResult?.userId === user.id && (
                          <span className="text-[10px] text-green-700 font-['JetBrains_Mono'] mr-1.5 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                            {resetResult.password}
                          </span>
                        )}
                        <button
                          onClick={() => handleResetPassword(user)}
                          title="Reset password"
                          className="p-1.5 rounded-md hover:bg-[rgba(59,130,246,0.08)] text-[#BBBBBB] hover:text-blue-500 transition-colors"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit"
                          className="p-1.5 rounded-md hover:bg-[rgba(160,120,75,0.12)] text-[#BBBBBB] hover:text-[#6B4D30] transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          title="Delete"
                          className="p-1.5 rounded-md hover:bg-red-50 text-[#BBBBBB] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[rgba(215,183,151,0.3)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.04)]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#6B4D30]" />
                <h2 className="text-sm font-bold font-['Montserrat'] text-[#0A0A0A]">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[rgba(160,120,75,0.1)] transition-colors"
              >
                <X size={15} className="text-[#999999]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-3.5">
              {/* Login Method (create only) */}
              {!editingUser && (
                <div>
                  <label className="block text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide mb-1.5">
                    Login Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, loginMethod: 'sso', password: '' })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        form.loginMethod === 'sso'
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-[#C4B5A5] bg-white hover:bg-gray-50'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 21 21" fill="none" className="shrink-0"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                      <div>
                        <div className={`text-[11px] font-bold font-['Montserrat'] ${form.loginMethod === 'sso' ? 'text-blue-700' : 'text-[#0A0A0A]'}`}>Microsoft SSO</div>
                        <div className="text-[9px] font-['Montserrat'] text-[#999999]">Azure AD account</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, loginMethod: 'password' })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        form.loginMethod === 'password'
                          ? 'border-[#C49A6C] bg-[rgba(215,183,151,0.08)]'
                          : 'border-[#C4B5A5] bg-white hover:bg-gray-50'
                      }`}
                    >
                      <Mail size={15} className={`shrink-0 ${form.loginMethod === 'password' ? 'text-[#6B4D30]' : 'text-[#999999]'}`} />
                      <div>
                        <div className={`text-[11px] font-bold font-['Montserrat'] ${form.loginMethod === 'password' ? 'text-[#6B4D30]' : 'text-[#0A0A0A]'}`}>Email & Password</div>
                        <div className="text-[9px] font-['Montserrat'] text-[#999999]">Manual login</div>
                      </div>
                    </button>
                  </div>
                  {form.loginMethod === 'sso' && (
                    <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                      <svg width="12" height="12" viewBox="0 0 21 21" fill="none" className="shrink-0 mt-0.5"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                      <p className="text-[10px] font-['Montserrat'] text-blue-700">
                        User will sign in via <strong>Sign in with Microsoft</strong>. Enter their Microsoft work email exactly as registered in Azure AD.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide mb-1.5">
                  Email <span className="text-red-400 normal-case">*</span>
                  {!editingUser && form.loginMethod === 'sso' && (
                    <span className="ml-1.5 normal-case font-normal text-blue-500">— must match Azure AD email</span>
                  )}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!editingUser}
                  placeholder={form.loginMethod === 'sso' ? 'username@dafc.com.vn' : 'user@example.com'}
                  className="w-full px-3 py-2 text-xs border rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#D7B797] border-[#C4B5A5] font-['Montserrat'] text-[#0A0A0A] placeholder-[#BBBBBB] disabled:bg-[rgba(160,120,75,0.04)] disabled:text-[#999999]"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide mb-1.5">
                  Full Name <span className="text-red-400 normal-case">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-xs border rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#D7B797] border-[#C4B5A5] font-['Montserrat'] text-[#0A0A0A] placeholder-[#BBBBBB]"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide mb-1.5">
                  Role <span className="text-red-400 normal-case">*</span>
                </label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#D7B797] border-[#C4B5A5] font-['Montserrat'] text-[#0A0A0A] bg-white"
                >
                  <option value={0}>Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Password (create only, email/password method only) */}
              {!editingUser && form.loginMethod === 'password' && (
                <div>
                  <label className="block text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide mb-1.5">
                    Password{' '}
                    <span className="text-[#BBBBBB] font-normal normal-case tracking-normal">(leave blank to auto-generate)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 pr-9 text-xs border rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#D7B797] border-[#C4B5A5] font-['Montserrat'] text-[#0A0A0A] placeholder-[#BBBBBB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-[#666666] transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between pt-1 pb-0.5">
                <span className="text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wide">
                  Account Status
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-['Montserrat'] ${form.isActive ? 'text-[#127749]' : 'text-[#999999]'}`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-[#2A9E6A]' : 'bg-[#D4C8BB]'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[rgba(215,183,151,0.2)] bg-[rgba(160,120,75,0.02)]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium font-['Montserrat'] text-[#666666] hover:bg-[rgba(160,120,75,0.08)] rounded-lg transition-colors border border-[#C4B5A5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim() || !form.roleId}
                className="px-4 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 font-['Montserrat'] transition-colors"
                style={{ background: 'linear-gradient(135deg, #D7B797 0%, #C49A6C 100%)' }}
              >
                {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
