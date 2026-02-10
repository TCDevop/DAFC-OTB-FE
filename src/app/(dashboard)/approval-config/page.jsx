'use client';
import { useAppContext } from '@/contexts/AppContext';
import ApprovalWorkflowScreen from '@/screens/ApprovalWorkflowScreen';

export default function ApprovalConfigPage() {
  const { darkMode } = useAppContext();
  return <ApprovalWorkflowScreen darkMode={darkMode} />;
}
