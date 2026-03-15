'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { KeySquare, RefreshCw, Search, X } from 'lucide-react';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

interface Role {
  id: number;
  name: string;
  permissions?: string[];
}

interface PermissionEntry {
  permission: string;
  roles: string[];
}

export default function PermissionsScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate: permission → which roles have it
  const permissionMap = useMemo<PermissionEntry[]>(() => {
    const map: Record<string, Set<string>> = {};
    roles.forEach(role => {
      (role.permissions || []).forEach(perm => {
        if (!map[perm]) map[perm] = new Set();
        map[perm].add(role.name);
      });
    });
    return Object.entries(map)
      .map(([permission, roleSet]) => ({ permission, roles: Array.from(roleSet) }))
      .sort((a, b) => a.permission.localeCompare(b.permission));
  }, [roles]);

  const filtered = permissionMap.filter(p =>
    p.permission.toLowerCase().includes(search.toLowerCase())
  );

  // Group by namespace prefix (e.g. "budget:read" → "budget")
  const grouped = useMemo(() => {
    const groups: Record<string, PermissionEntry[]> = {};
    filtered.forEach(entry => {
      const ns = entry.permission.includes(':')
        ? entry.permission.split(':')[0]
        : entry.permission === '*' ? 'wildcard' : 'general';
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(entry);
    });
    return groups;
  }, [filtered]);

  const ROLE_COLORS: Record<string, string> = {
    admin:          'bg-purple-50 text-purple-700 border-purple-100',
    buyer:          'bg-blue-50 text-blue-700 border-blue-100',
    merchandiser:   'bg-amber-50 text-amber-700 border-amber-100',
    merch_manager:  'bg-orange-50 text-orange-700 border-orange-100',
    finance_director: 'bg-green-50 text-green-700 border-green-100',
  };
  const getRoleColor = (name: string) =>
    ROLE_COLORS[name] ?? 'bg-gray-100 text-gray-600 border-gray-200';

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
              <KeySquare size={14} className="text-[#6B4D30]" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-['Montserrat'] leading-tight text-[#0A0A0A]">Permissions</h1>
              <p className="text-[10px] font-['JetBrains_Mono'] text-[#999999]">
                {loading ? 'Loading...' : `${permissionMap.length} unique permissions across ${roles.length} roles`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999999]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions..."
                className="w-52 pl-8 pr-7 py-1 border rounded-md text-xs font-['Montserrat'] focus:outline-none focus:ring-1 focus:ring-[#D7B797] bg-white border-[#C4B5A5] text-[#0A0A0A] placeholder-[#999999]"
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
        className="flex-1 min-h-0 overflow-auto rounded-lg border border-[#C4B5A5]"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, rgba(215,183,151,0.03) 35%, rgba(215,183,151,0.08) 100%)' }}
      >
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#6B4D30]" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">Loading permissions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <KeySquare size={32} className="mx-auto mb-3 text-[#2E2E2E]/20" />
            <p className="text-xs font-['Montserrat'] text-[#999999]">No permissions found</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Role legend */}
            <div className="flex flex-wrap gap-2 pb-3 border-b border-[#D4C8BB]">
              <span className="text-[10px] font-['Montserrat'] text-[#999999] self-center">Roles:</span>
              {roles.map(r => (
                <span
                  key={r.id}
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium font-['Montserrat'] border capitalize ${getRoleColor(r.name)}`}
                >
                  {r.name}
                </span>
              ))}
            </div>

            {/* Groups */}
            {Object.entries(grouped).map(([ns, entries]) => (
              <div key={ns}>
                <div className="text-[10px] font-semibold font-['Montserrat'] text-[#999999] uppercase tracking-wider mb-2">
                  {ns}
                </div>
                <div className="rounded-lg border border-[#D4C8BB] overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {entries.map((entry, i) => (
                        <tr
                          key={entry.permission}
                          className={`${i > 0 ? 'border-t border-[#E8DFD4]' : ''} hover:bg-[rgba(215,183,151,0.04)] transition-colors`}
                        >
                          <td className="px-3 py-2 w-72">
                            <span className="text-xs font-['JetBrains_Mono'] font-medium text-[#0A0A0A]">
                              {entry.permission}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {entry.roles.map(roleName => (
                                <span
                                  key={roleName}
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium font-['Montserrat'] border capitalize ${getRoleColor(roleName)}`}
                                >
                                  {roleName}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
