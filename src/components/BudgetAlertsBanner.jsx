'use client';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronRight, ShieldAlert, Bell } from 'lucide-react';
import { aiService } from '../services/aiService';

const SEVERITY_THEMES = {
  critical: {
    color: '#F85149',
    gradDark: 'linear-gradient(135deg, rgba(248,81,73,0.08) 0%, rgba(248,81,73,0.02) 50%, rgba(248,81,73,0.12) 100%)',
    gradLight: 'linear-gradient(135deg, rgba(220,50,47,0.06) 0%, rgba(255,255,255,0.9) 40%, rgba(220,50,47,0.10) 100%)',
    borderDark: 'rgba(248,81,73,0.25)',
    borderLight: 'rgba(200,50,50,0.25)',
    glowDark: '0 0 20px rgba(248,81,73,0.08), 0 4px 16px rgba(0,0,0,0.2)',
    glowLight: '0 0 20px rgba(220,50,47,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    Icon: AlertCircle,
    WatermarkIcon: ShieldAlert,
    iconBgDark: 'rgba(248,81,73,0.15)',
    iconBgLight: 'rgba(220,50,47,0.10)',
    textDark: '#FF7B72',
    textLight: '#C53030',
    subDark: 'rgba(255,123,114,0.75)',
    subLight: '#9B2C2C',
    badgeBg: 'linear-gradient(135deg, #F85149 0%, #DC2626 100%)',
    badgeText: '#FFFFFF',
  },
  warning: {
    color: '#E3B341',
    gradDark: 'linear-gradient(135deg, rgba(215,183,151,0.08) 0%, rgba(215,183,151,0.02) 50%, rgba(227,179,65,0.10) 100%)',
    gradLight: 'linear-gradient(135deg, rgba(180,140,50,0.05) 0%, rgba(255,255,255,0.9) 40%, rgba(200,160,60,0.10) 100%)',
    borderDark: 'rgba(215,183,151,0.25)',
    borderLight: 'rgba(180,140,50,0.25)',
    glowDark: '0 0 20px rgba(215,183,151,0.08), 0 4px 16px rgba(0,0,0,0.2)',
    glowLight: '0 0 20px rgba(180,140,50,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    Icon: AlertTriangle,
    WatermarkIcon: Bell,
    iconBgDark: 'rgba(215,183,151,0.15)',
    iconBgLight: 'rgba(180,140,50,0.10)',
    textDark: '#D7B797',
    textLight: '#92600A',
    subDark: 'rgba(215,183,151,0.75)',
    subLight: '#7C4F0A',
    badgeBg: 'linear-gradient(135deg, #D7B797 0%, #C49A6C 100%)',
    badgeText: '#1A1A1A',
  },
  info: {
    color: '#818CF8',
    gradDark: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 50%, rgba(99,102,241,0.10) 100%)',
    gradLight: 'linear-gradient(135deg, rgba(80,90,220,0.05) 0%, rgba(255,255,255,0.9) 40%, rgba(80,90,220,0.08) 100%)',
    borderDark: 'rgba(99,102,241,0.25)',
    borderLight: 'rgba(80,90,220,0.25)',
    glowDark: '0 0 20px rgba(99,102,241,0.08), 0 4px 16px rgba(0,0,0,0.2)',
    glowLight: '0 0 20px rgba(80,90,220,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    Icon: Info,
    WatermarkIcon: Info,
    iconBgDark: 'rgba(99,102,241,0.15)',
    iconBgLight: 'rgba(80,90,220,0.10)',
    textDark: '#A5B4FC',
    textLight: '#3730A3',
    subDark: 'rgba(165,180,252,0.75)',
    subLight: '#4338CA',
    badgeBg: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
    badgeText: '#FFFFFF',
  },
};

const BudgetAlertsBanner = ({ budgetId, darkMode = true }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [budgetId]);

  const fetchAlerts = async () => {
    try {
      const data = await aiService.getBudgetAlerts({ budgetId, unreadOnly: true });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
    setLoading(false);
  };

  const handleDismiss = async (alertId, e) => {
    e.stopPropagation();
    try {
      await aiService.dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const getTheme = (severity) => SEVERITY_THEMES[severity] || SEVERITY_THEMES.info;

  if (loading || alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity !== 'critical' && a.severity !== 'warning').length;
  const topAlert = alerts[0];
  const theme = getTheme(topAlert.severity);
  const TopIcon = theme.Icon;
  const WatermarkIcon = theme.WatermarkIcon;

  return (
    <div className="mb-4">
      {/* Collapsed Banner */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 group"
        style={{
          background: darkMode ? theme.gradDark : theme.gradLight,
          border: `1px solid ${darkMode ? theme.borderDark : theme.borderLight}`,
          boxShadow: darkMode ? theme.glowDark : theme.glowLight,
        }}
      >
        {/* Watermark Icon */}
        <div
          className="absolute -right-4 -bottom-4 transition-all duration-500 group-hover:scale-110 pointer-events-none"
          style={{ opacity: darkMode ? 0.04 : 0.05 }}
        >
          <WatermarkIcon size={110} color={theme.color} strokeWidth={0.8} />
        </div>

        {/* Accent line on the left */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: theme.color, opacity: 0.7 }}
        />

        <div className="relative z-10 flex items-center justify-between p-5 pl-6">
          <div className="flex items-center gap-4">
            {/* Icon with glass effect */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0"
              style={{ backgroundColor: darkMode ? theme.iconBgDark : theme.iconBgLight }}
            >
              <TopIcon size={20} color={theme.color} />
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold font-['Montserrat'] text-[15px] leading-tight"
                style={{ color: darkMode ? theme.textDark : theme.textLight }}
              >
                {topAlert.title}
              </div>
              <div
                className="text-sm mt-1 leading-snug"
                style={{ color: darkMode ? theme.subDark : theme.subLight }}
              >
                {topAlert.message}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            {/* Severity badges */}
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span
                  className="px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  style={{ background: SEVERITY_THEMES.critical.badgeBg, color: SEVERITY_THEMES.critical.badgeText }}
                >
                  <AlertCircle size={12} />
                  {criticalCount}
                </span>
              )}
              {warningCount > 0 && (
                <span
                  className="px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  style={{ background: SEVERITY_THEMES.warning.badgeBg, color: SEVERITY_THEMES.warning.badgeText }}
                >
                  <AlertTriangle size={12} />
                  {warningCount}
                </span>
              )}
              {infoCount > 0 && (
                <span
                  className="px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  style={{ background: SEVERITY_THEMES.info.badgeBg, color: SEVERITY_THEMES.info.badgeText }}
                >
                  <Info size={12} />
                  {infoCount}
                </span>
              )}
            </div>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
            >
              <ChevronRight
                size={16}
                className={`transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
                color={darkMode ? '#666666' : '#999999'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded List */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {alerts.map(alert => {
            const t = getTheme(alert.severity);
            const AlertIcon = t.Icon;

            return (
              <div
                key={alert.id}
                className="relative overflow-hidden rounded-xl transition-all duration-200 group/item hover:shadow-md"
                style={{
                  background: darkMode ? t.gradDark : t.gradLight,
                  border: `1px solid ${darkMode ? t.borderDark : t.borderLight}`,
                }}
              >
                {/* Subtle left accent */}
                <div
                  className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full"
                  style={{ backgroundColor: t.color, opacity: 0.5 }}
                />

                <div className="flex items-start justify-between gap-3 p-4 pl-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: darkMode ? t.iconBgDark : t.iconBgLight }}
                    >
                      <AlertIcon size={15} color={t.color} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-semibold text-sm font-['Montserrat']"
                        style={{ color: darkMode ? t.textDark : t.textLight }}
                      >
                        {alert.title}
                      </div>
                      <div
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: darkMode ? t.subDark : t.subLight }}
                      >
                        {alert.message}
                      </div>
                      {alert.budget && (
                        <div className={`text-[11px] mt-1.5 font-['JetBrains_Mono'] ${darkMode ? 'text-[#555555]' : 'text-gray-400'}`}>
                          {alert.budget.groupBrand?.name} — {alert.budget.budgetCode}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDismiss(alert.id, e)}
                    className="p-1.5 rounded-lg transition-all duration-200 shrink-0 opacity-0 group-hover/item:opacity-100"
                    style={{
                      backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    <X size={14} color={darkMode ? '#666666' : '#999999'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetAlertsBanner;
