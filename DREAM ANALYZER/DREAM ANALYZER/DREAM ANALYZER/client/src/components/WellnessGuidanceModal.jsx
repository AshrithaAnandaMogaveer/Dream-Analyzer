import React from 'react';

const WellnessGuidanceModal = ({ open, onClose, entryData = null }) => {
  if (!open) return null;

  return (
    <div className="wellness-modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(12,18,28,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
    }}>
      <div className="wellness-modal" style={{
        width: 'min(920px, 95%)', maxHeight: '90vh', overflowY: 'auto',
        background: 'linear-gradient(180deg,#fff,#f8fbff)', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(8,12,30,0.45)', padding: 20
      }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Mental Health & Wellness</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer'
          }}>✕</button>
        </header>

        <section style={{ marginTop: 12 }}>
          <p style={{ margin: 0, color: '#334155' }}>
            This is a lightweight wellness panel placeholder. It will render personalized guidance when the feature is fully invoked.
          </p>
        </section>

        <footer style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e6edf3', background: '#fff'
          }}>Close</button>
        </footer>
      </div>
    </div>
  );
};

export default WellnessGuidanceModal;
