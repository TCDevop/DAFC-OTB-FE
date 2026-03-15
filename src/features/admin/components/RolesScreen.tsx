'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Crown, RefreshCw, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
}

export default function RolesScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const PERM_COLOR: Record<string, string> = {
    '*': 'bg-purple-50 text-purple-700 border-purple-100',
    'admin': 'bg-red-50 text-red-700 border-red-100',
    'read': 'bg-blue-50 text-blue-700 border-blue-100',
    'write': 'bg-amber-50 text-amber-700 border-amber-100',
    'approve': 'bg-green-50 text-green-700 border-green-100',
  };

  const getPermColor = (perm: string) => {
    const key = Object.keys(PERM_COLOR).find(k => perm.includes(k));
    return key ? PERM_COLOR[key] : 'bg-[rgba(160,120,75,0.08)] text-[#6B4D30] border-[rgba(160,120,75,0.2)]';
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header card */}
      <div
        className="rounded-lg border overflow-hidden border-[#C4B5A5]"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.05) 35%, rgba(215,183,151,0.14) 100%)' }}
      >
        <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(160,120,75,0.12) 0%, rgba(160,120,75,0.22) 100%)' }}
            >
              <Crown size={14} className="text-[#6B4D30]" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-['Montserrat'] leading-tight text-[#0A0A0A]">Roles</h1>
              <p className="text-[10px] font-['JetBrains_Mono'] text-[#999999]">
                {loading ? 'Loading...' : `${roles.length} roles`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999999]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-44 pl-8 pr-7 py-1 border rounded-md text-xs font-['Montserrat'] focus:outline-none focus:ring-1 focus:ring-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999]">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-['Montserrat'] text-[#666666] hover:text-[#6B4D30] hover:bg-[rgba(160,120,75,0.12)] border border-[#C4B5A5] transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden border-[#C4B5A5]"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)' }}
      >
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#6B4D30]" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">Loading roles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Crown size={32} className="mx-auto mb-3 text-[#2E2E2E]/20" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">No roles found</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[rgba(160,120,75,0.08)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-10">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-36">Role</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold font-['Montserrat'] text-[#999999]">Permissions</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold font-['Montserrat'] text-[#999999] w-20">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((role, index) => {
                  const isOpen = expanded === role.id;
                  const perms: string[] = role.permissions || [];
                  const preview = perms.slice(0, 4);
                  const rest = perms.length - 4;

                  return (
                    <React.Fragment key={role.id}>
                      <tr
                        className="border-t transition-colors border-[#D4C8BB] hover:bg-[rgba(215,183,151,0.05)]"
                      >
                        <td className="px-3 py-2 text-xs font-['JetBrains_Mono'] text-[#BBBBBB]">{index + 1}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-['Montserrat'] font-semibold text-[#0A0A0A] capitalize">{role.name}</span>
                          {role.description && (
                            <div className="text-[10px] font-['Montserrat'] text-[#999999] mt-0.5">{role.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {preview.map(p => (
                              <span
                                key={p}
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] border ${getPermColor(p)}`}
                              >
                                {p}
                              </span>
                            ))}
                            {rest > 0 && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-['Montserrat'] bg-gray-100 text-gray-500">
                                +{rest} more
                              </span>
                            )}
                            {perms.length === 0 && (
                              <span className="text-[10px] font-['Montserrat'] text-[#BBBBBB]">No permissions</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {perms.length > 4 && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : role.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-['Montserrat'] rounded-md bg-[rgba(160,120,75,0.08)] text-[#6B4D30] hover:bg-[rgba(160,120,75,0.16)] transition-colors"
                            >
                              {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {isOpen ? 'Hide' : 'All'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && perms.length > 4 && (
                        <tr className="border-t border-[#D4C8BB] bg-[rgba(215,183,151,0.03)]">
                          <td />
                          <td colSpan={3} className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {perms.map(p => (
                                <span
                                  key={p}
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] border ${getPermColor(p)}`}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
