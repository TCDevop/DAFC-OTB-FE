import { useState, useCallback } from 'react';

interface ConfirmState {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  promptPlaceholder?: string;
  promptRequired?: string; // exact value required to confirm (e.g. "delete")
  onConfirm: (inputValue?: string) => void;
}

const INITIAL: ConfirmState = {
  open: false,
  message: '',
  onConfirm: () => {},
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(INITIAL);

  const confirm = useCallback((opts: {
    message: string;
    title?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    promptPlaceholder?: string;
    promptRequired?: string;
    onConfirm: (inputValue?: string) => void;
  }) => {
    setState({ open: true, ...opts });
  }, []);

  const handleConfirm = useCallback((inputValue?: string) => {
    state.onConfirm(inputValue);
    setState(INITIAL);
  }, [state]);

  const handleCancel = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    dialogProps: {
      open: state.open,
      message: state.message,
      title: state.title,
      confirmLabel: state.confirmLabel,
      variant: state.variant,
      promptPlaceholder: state.promptPlaceholder,
      promptRequired: state.promptRequired,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    confirm,
  };
}
