import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="confirm-dialog-header">
          <h4 id="confirm-dialog-title">{title}</h4>
          <button type="button" className="confirm-dialog-close" onClick={onCancel} aria-label={cancelText}>
            ×
          </button>
        </div>

        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-neutral" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
