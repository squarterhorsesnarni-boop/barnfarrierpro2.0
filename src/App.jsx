import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  calculateIdealNextShoeingDate,
  calculateDaysRemaining,
  calculateStatus,
  formatDate,
} from './lib/dateUtils';
import HorseForm from './components/horseform.jsx';
import Toast from './components/Toast';
import './index.css';

function App() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingHorse, setEditingHorse] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  function showToast(type, title, message = '') {
    setToast({ type, title, message });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadHorses() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('horses')
      .select('*')
      .eq('is_active', !showArchived)
      .order('name', { ascending: true });

    if (error) {
      setError(error.message);
      setHorses([]);
    } else {
      setHorses(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadHorses();
  }, [showArchived]);

  async function handleSaveHorse(formData) {
    setSaving(true);
    setError('');

    let result;

    if (editingHorse) {
      result = await supabase
        .from('horses')
        .update({
          name: formData.name,
          last_shoeing_date: formData.last_shoeing_date,
          shoeing_interval_days: formData.shoeing_interval_days,
          notes: formData.notes || null,
        })
        .eq('id', editingHorse.id);
    } else {
      result = await supabase.from('horses').insert({
        name: formData.name,
        last_shoeing_date: formData.last_shoeing_date,
        shoeing_interval_days: formData.shoeing_interval_days,
        notes: formData.notes || null,
        is_active: true,
      });
    }

    if (result.error) {
      setError(result.error.message);
      showToast('error', 'Operazione non riuscita', result.error.message);
    } else {
      showToast(
        'success',
        editingHorse ? 'Cavallo aggiornato' : 'Cavallo aggiunto',
        editingHorse
          ? 'Le modifiche sono state salvate.'
          : 'Il nuovo cavallo è stato inserito correttamente.'
      );
      setEditingHorse(null);
      setIsFormOpen(false);
      await loadHorses();
    }

    setSaving(false);
  }

  async function handleArchiveHorse(horseId) {
    const confirmed = window.confirm(
      'Vuoi archiviare questo cavallo? Non verrà eliminato dal database.'
    );

    if (!confirmed) return;

    setError('');

    const { error } = await supabase
      .from('horses')
      .update({ is_active: false })
      .eq('id', horseId);

    if (error) {
      setError(error.message);
      showToast('error', 'Archiviazione non riuscita', error.message);
      return;
    }

    if (editingHorse?.id === horseId) {
      setEditingHorse(null);
      setIsFormOpen(false);
    }

    showToast('success', 'Cavallo archiviato');
    await loadHorses();
  }

  async function handleRestoreHorse(horseId) {
    setError('');

    const { error } = await supabase
      .from('horses')
      .update({ is_active: true })
      .eq('id', horseId);

    if (error) {
      setError(error.message);
      showToast('error', 'Ripristino non riuscito', error.message);
      return;
    }

    showToast('success', 'Cavallo ripristinato');
    await loadHorses();
  }

  async function handleMarkShoedToday(horse) {
    const confirmed = window.confirm(
      `Segnare "${horse.name}" come ferrato oggi?`
    );

    if (!confirmed) return;

    setError('');
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('horses')
      .update({ last_shoeing_date: today })
      .eq('id', horse.id);

    if (error) {
      setError(error.message);
      showToast('error', 'Aggiornamento non riuscito', error.message);
    } else {
      if (editingHorse?.id === horse.id) {
        setEditingHorse({
          ...editingHorse,
          last_shoeing_date: today,
        });
      }
      showToast(
        'success',
        'Ferratura aggiornata',
        `${horse.name} segnato come ferrato oggi.`
      );
      await loadHorses();
    }

    setSaving(false);
  }

  const enrichedHorses = useMemo(() => {
    return horses
      .map((horse) => {
        const idealNextDate = calculateIdealNextShoeingDate(
          horse.last_shoeing_date,
          horse.shoeing_interval_days
        );

        const daysRemaining = calculateDaysRemaining(idealNextDate);
        const status = calculateStatus(
          horse.last_shoeing_date,
          horse.shoeing_interval_days
        );

        return {
          ...horse,
          idealNextDate,
          daysRemaining,
          status,
        };
      })
      .filter((horse) =>
        horse.name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .filter((horse) =>
        showArchived || statusFilter === 'all' ? true : horse.status === statusFilter
      )
      .sort((a, b) => {
        const priority = { scaduto: 0, in_scadenza: 1, ok: 2 };
        const statusDiff = priority[a.status] - priority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.daysRemaining - b.daysRemaining;
      });
  }, [horses, search, statusFilter, showArchived]);

  const stats = useMemo(() => {
    const counts = {
      all: horses.length,
      ok: 0,
      in_scadenza: 0,
      scaduto: 0,
    };

    horses.forEach((horse) => {
      const status = calculateStatus(
        horse.last_shoeing_date,
        horse.shoeing_interval_days
      );
      counts[status] += 1;
    });

    return counts;
  }, [horses]);

  return (
    <div className="app-shell">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="hero">
        <div className="hero-overlay">
          <div className="brand-kicker">Stable Farrier Dashboard</div>
          <h1>Gestionale Ferrature 2.0</h1>
          <p>
            Controllo rapido ferrature, scadenze e aggiornamenti da scuderia.
          </p>
        </div>
      </header>

      {!showArchived && (
        <section className="summary-grid">
          <button
            className={`summary-card ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span className="summary-label">Totali</span>
            <strong>{stats.all}</strong>
          </button>

          <button
            className={`summary-card ok ${statusFilter === 'ok' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ok')}
          >
            <span className="summary-label">OK</span>
            <strong>{stats.ok}</strong>
          </button>

          <button
            className={`summary-card warning ${
              statusFilter === 'in_scadenza' ? 'active' : ''
            }`}
            onClick={() => setStatusFilter('in_scadenza')}
          >
            <span className="summary-label">In scadenza</span>
            <strong>{stats.in_scadenza}</strong>
          </button>

          <button
            className={`summary-card danger ${
              statusFilter === 'scaduto' ? 'active' : ''
            }`}
            onClick={() => setStatusFilter('scaduto')}
          >
            <span className="summary-label">Scaduti</span>
            <strong>{stats.scaduto}</strong>
          </button>
        </section>
      )}

      <div className="topbar">
        <div>
          <h2 className="section-title">
            {showArchived ? 'Archivio cavalli' : 'Gestione cavalli'}
          </h2>
          <p className="section-subtitle">
            {showArchived
              ? 'Visualizza e ripristina i cavalli archiviati.'
              : 'Inserisci, aggiorna e controlla le ferrature in pochi tocchi.'}
          </p>
        </div>

        <div className="topbar-actions">
          <button
            className={`secondary-tab ${!showArchived ? 'active' : ''}`}
            onClick={() => {
              setShowArchived(false);
              setStatusFilter('all');
            }}
          >
            Attivi
          </button>

          <button
            className={`secondary-tab ${showArchived ? 'active' : ''}`}
            onClick={() => {
              setShowArchived(true);
              setEditingHorse(null);
              setIsFormOpen(false);
            }}
          >
            Archivio
          </button>

          <button
            className="primary-btn"
            onClick={loadHorses}
            disabled={loading || saving}
          >
            Aggiorna lista
          </button>
        </div>
      </div>

      {!showArchived && (
        <HorseForm
          onSubmit={handleSaveHorse}
          editingHorse={editingHorse}
          onCancel={() => {
            setEditingHorse(null);
            setIsFormOpen(false);
          }}
          isOpen={isFormOpen}
          onToggle={() => {
            if (editingHorse && isFormOpen) {
              setEditingHorse(null);
            }
            setIsFormOpen((prev) => !prev);
          }}
          saving={saving}
        />
      )}

      <section className="toolbar ranch-panel">
        <input
          type="text"
          placeholder={showArchived ? 'Cerca cavallo archiviato...' : 'Cerca cavallo...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!showArchived && (
          <div className="filter-pills">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              Tutti
            </button>
            <button
              className={statusFilter === 'ok' ? 'active' : ''}
              onClick={() => setStatusFilter('ok')}
            >
              OK
            </button>
            <button
              className={statusFilter === 'in_scadenza' ? 'active' : ''}
              onClick={() => setStatusFilter('in_scadenza')}
            >
              In scadenza
            </button>
            <button
              className={statusFilter === 'scaduto' ? 'active' : ''}
              onClick={() => setStatusFilter('scaduto')}
            >
              Scaduti
            </button>
          </div>
        )}
      </section>

      {loading && <p className="info">Caricamento...</p>}
      {saving && <p className="info">Salvataggio in corso...</p>}
      {error && <p className="error">Errore: {error}</p>}

      {!loading && !error && enrichedHorses.length === 0 && (
        <p className="info">
          {showArchived ? 'Nessun cavallo archiviato trovato.' : 'Nessun cavallo trovato.'}
        </p>
      )}

      <section className="cards">
        {enrichedHorses.map((horse) => (
          <article key={horse.id} className="horse-card">
            <div className="card-head">
              <div>
                <h2>{horse.name}</h2>
                <p className="card-subtitle">
                  {showArchived
                    ? 'Cavallo archiviato'
                    : 'Monitoraggio ferratura e prossima scadenza'}
                </p>
              </div>

              {!showArchived && (
                <span className={`badge ${horse.status}`}>
                  {horse.status === 'ok' && 'OK'}
                  {horse.status === 'in_scadenza' && 'In scadenza'}
                  {horse.status === 'scaduto' && 'Scaduto'}
                </span>
              )}
            </div>

            <div className="card-grid">
              <div className="info-box">
                <span className="label">Ultima ferratura</span>
                <strong>{formatDate(horse.last_shoeing_date)}</strong>
              </div>

              <div className="info-box">
                <span className="label">Prossima ideale</span>
                <strong>{formatDate(horse.idealNextDate)}</strong>
              </div>

              <div className="info-box">
                <span className="label">Intervallo</span>
                <strong>{horse.shoeing_interval_days} giorni</strong>
              </div>

              <div className="info-box">
                <span className="label">Giorni rimanenti</span>
                <strong>{horse.daysRemaining}</strong>
              </div>
            </div>

            {horse.notes && (
              <div className="notes">
                <span className="label">Note</span>
                <p>{horse.notes}</p>
              </div>
            )}

            <div className="card-actions">
              {showArchived ? (
                <button
                  className="action-btn western-accent"
                  onClick={() => handleRestoreHorse(horse.id)}
                >
                  Ripristina
                </button>
              ) : (
                <>
                  <button
                    className="action-btn western-accent"
                    onClick={() => handleMarkShoedToday(horse)}
                  >
                    Ferrato oggi
                  </button>

                  <button
                    className="secondary"
                    onClick={() => {
                      setEditingHorse(horse);
                      setIsFormOpen(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Modifica
                  </button>

                  <button
                    className="danger"
                    onClick={() => handleArchiveHorse(horse.id)}
                  >
                    Archivia
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default App;