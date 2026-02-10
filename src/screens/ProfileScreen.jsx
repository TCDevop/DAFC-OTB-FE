'use client';

import React, { useState } from 'react';
import {
  User, Mail, Phone, Building2, Shield, Calendar,
  Camera, Edit3, Save, X, CheckCircle, Key, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const ProfileScreen = ({ user: propUser, darkMode = true, onUpdateUser }) => {
  const { user: authUser } = useAuth();
  const { t } = useLanguage();
  // Use prop user, then auth context user
  const user = propUser || authUser || {};
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      onUpdateUser && await onUpdateUser(formData);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
    });
    setIsEditing(false);
  };

  const InfoCard = ({ icon: Icon, label, value, field, editable = true }) => (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${
      darkMode
        ? 'bg-[#121212] border-[#2E2E2E] hover:border-[rgba(215,183,151,0.2)]'
        : 'bg-white border-gray-200 hover:border-[rgba(215,183,151,0.3)]'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'
        }`}>
          <Icon size={18} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${
            darkMode ? 'text-[#666666]' : 'text-gray-700'
          }`}>
            {label}
          </div>
          {isEditing && editable ? (
            <input
              type={field === 'email' ? 'email' : 'text'}
              value={formData[field] || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                darkMode
                  ? 'bg-[#0A0A0A] border-[#2E2E2E] text-[#F2F2F2] focus:border-[#D7B797]'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#8A6340]'
              }`}
            />
          ) : (
            <div className={`text-sm font-medium ${
              darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
            }`}>
              {value || '-'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-lg font-semibold font-['Montserrat'] ${
            darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
          }`}>
            {t('profile.title')}
          </h1>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
            {t('profile.subtitle')}
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              darkMode
                ? 'bg-[rgba(215,183,151,0.1)] text-[#D7B797] border border-[rgba(215,183,151,0.2)] hover:bg-[rgba(215,183,151,0.15)]'
                : 'bg-[rgba(215,183,151,0.15)] text-[#8A6340] border border-[rgba(215,183,151,0.3)] hover:bg-[rgba(215,183,151,0.2)]'
            }`}
          >
            <Edit3 size={16} />
            {t('profile.editProfile')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                darkMode
                  ? 'bg-[#1A1A1A] text-[#999999] border border-[#2E2E2E] hover:text-[#F2F2F2]'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:text-gray-900'
              }`}
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                darkMode
                  ? 'bg-[#127749] text-white hover:bg-[#0d5c38]'
                  : 'bg-[#127749] text-white hover:bg-[#0d5c38]'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {t('profile.saveChanges')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className={`rounded-xl border overflow-hidden ${
        darkMode ? 'bg-[#0A0A0A] border-[#1A1A1A]' : 'bg-gray-50 border-gray-200'
      }`}>
        {/* Header with Avatar */}
        <div className={`p-6 border-b ${
          darkMode
            ? 'bg-gradient-to-r from-[rgba(215,183,151,0.08)] to-[rgba(18,119,73,0.08)] border-[#1A1A1A]'
            : 'bg-gradient-to-r from-[rgba(215,183,151,0.15)] to-[rgba(18,119,73,0.1)] border-gray-200'
        }`}>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold font-['Montserrat'] border-3 ${
                darkMode
                  ? 'border-[#D7B797] text-[#D7B797]'
                  : 'border-[#8A6340] text-[#8A6340]'
              }`}
              style={{ borderWidth: '3px' }}
              >
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              {/* Online indicator */}
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#2A9E6A] border-2 ${
                darkMode ? 'border-[#0A0A0A]' : 'border-gray-50'
              }`} />
              {/* Camera overlay on hover */}
              <div className={`absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                darkMode ? 'bg-black/50' : 'bg-black/40'
              }`}>
                <Camera size={24} className="text-white" />
              </div>
            </div>

            {/* Name & Role */}
            <div className="flex-1">
              <h2 className={`text-xl font-bold font-['Montserrat'] ${
                darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
              }`}>
                {user?.name || 'User'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Shield size={14} className={darkMode ? 'text-[#D7B797]' : 'text-[#8A6340]'} />
                <span className={`text-sm ${darkMode ? 'text-[#999999]' : 'text-gray-600'}`}>
                  {user?.role?.name || 'User'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  darkMode
                    ? 'bg-[rgba(42,158,106,0.15)] text-[#2A9E6A]'
                    : 'bg-green-100 text-green-700'
                }`}>
                  <CheckCircle size={12} />
                  Active
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  darkMode ? 'bg-[#1A1A1A] text-[#666666]' : 'bg-gray-200 text-gray-600'
                }`}>
                  <Calendar size={12} />
                  Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard icon={User} label={t('profile.fullName')} value={user?.name} field="name" />
            <InfoCard icon={Mail} label={t('profile.emailAddress')} value={user?.email} field="email" />
            <InfoCard icon={Phone} label={t('profile.phoneNumber')} value={user?.phone || t('profile.notSet')} field="phone" />
            <InfoCard icon={Building2} label={t('profile.department')} value={user?.department || t('profile.notSet')} field="department" />
            <InfoCard icon={Shield} label={t('profile.role')} value={user?.role?.name} field="role" editable={false} />
            <InfoCard icon={Key} label={t('profile.userId')} value={user?.id || 'N/A'} field="id" editable={false} />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className={`rounded-xl border p-6 ${
        darkMode ? 'bg-[#121212] border-[#2E2E2E]' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-base font-semibold font-['Montserrat'] mb-4 ${
          darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'
        }`}>
          {t('profile.security')}
        </h3>
        <div className="space-y-3">
          <button className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
            darkMode
              ? 'bg-[#0A0A0A] border-[#2E2E2E] hover:border-[rgba(215,183,151,0.2)]'
              : 'bg-gray-50 border-gray-200 hover:border-[rgba(215,183,151,0.3)]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                <Key size={18} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
              </div>
              <div className="text-left">
                <div className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'}`}>
                  {t('profile.changePassword')}
                </div>
                <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                  {t('profile.updatePasswordRegularly')}
                </div>
              </div>
            </div>
            <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
              →
            </div>
          </button>

          <button className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
            darkMode
              ? 'bg-[#0A0A0A] border-[#2E2E2E] hover:border-[rgba(215,183,151,0.2)]'
              : 'bg-gray-50 border-gray-200 hover:border-[rgba(215,183,151,0.3)]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                <Bell size={18} className={darkMode ? 'text-[#999999]' : 'text-gray-700'} />
              </div>
              <div className="text-left">
                <div className={`text-sm font-medium ${darkMode ? 'text-[#F2F2F2]' : 'text-gray-900'}`}>
                  {t('profile.notificationPreferences')}
                </div>
                <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-700'}`}>
                  {t('profile.manageNotifications')}
                </div>
              </div>
            </div>
            <div className={`text-xs ${darkMode ? 'text-[#666666]' : 'text-gray-600'}`}>
              →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
