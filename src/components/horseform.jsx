import { useEffect, useState } from 'react';

const initialForm = {
  name: '',
  last_shoeing_date: '',
  shoeing_interval_days: 40,
  notes: '',
};

function HorseForm({
  onSubmit,
  editingHorse,
  onCancel,
  isOpen,
  onToggle,
  saving = false,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [localSaving, setLocalSaving] = useState(false);

  const isSaving = saving || localSaving;

  useEffect(() => {
    if (editingHorse) {
      setFormData({
        name: editingHorse.name ?? '',
        last_shoeing_date: editingHorse.last_shoeing_date ?? '',
        shoeing_interval_days: editingHorse.shoeing_interval_days ?? 40,
        notes: editingHorse.notes ?? '',
      });
    } else {
      setFormData(initialForm);
    }
  }, [editingHorse]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'shoeing_interval_days' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalSaving(true);

    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        notes: formData.notes.trim(),
      });

      if (!editingHorse) {
        setFormData(initialForm);
      }
    } finally {
      setLocalSaving(false);
    }
  }

  return (
    <section className={`horse-form-shell ${isOpen ? 'open' : ''}`}>
      <div className="horse-form-toggle-row">
        <button
          type="button"
          className="form-toggle-btn"
          onClick={onToggle}
        >
          {isOpen
            ? 'Chiudi scheda'
            : editingHorse
            ? 'Apri modifica cavallo'
            : 'Aggiungi cavallo'}
        </button>
      </div>

      <form className={`horse-form ${isOpen ? 'visible' : 'hidden-mobile'}`} onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>{editingHorse ? 'Modifica cavallo' : 'Nuovo cavallo'}</h2>
        </div>

        <div className="form-grid">
          <label>
            <span>Nome cavallo</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            <span>Data ultima ferratura</span>
            <input
              type="date"
              name="last_shoeing_date"
              value={formData.last_shoeing_date}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            <span>Intervallo ferratura (giorni)</span>
            <input
              type="number"
              name="shoeing_interval_days"
              min="1"
              value={formData.shoeing_interval_days}
              onChange={handleChange}
              required
            />
          </label>

          <label className="full-width">
            <span>Note</span>
            <textarea
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving && <span className="spinner"></span>}
            {isSaving
              ? 'Salvataggio...'
              : editingHorse
              ? 'Salva modifiche'
              : 'Aggiungi cavallo'}
          </button>

          {editingHorse && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onCancel();
              }}
            >
              Annulla modifica
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default HorseForm;