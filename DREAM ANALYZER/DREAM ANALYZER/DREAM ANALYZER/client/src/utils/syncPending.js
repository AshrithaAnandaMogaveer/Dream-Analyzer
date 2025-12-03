// syncPending.js - Retry & reconciliation system for local offline entries

const PENDING_HISTORY_KEY = 'dreamdairy_pending_save_history';
const PENDING_MENTAL_KEY = 'dreamdairy_pending_mental_entries';

// Unique ID generator for local entries
const generateLocalId = () => `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Save pending entry to localStorage
 * @param {string} key - localStorage key
 * @param {object} entry - Entry to queue
 */
const savePendingEntry = (key, entry) => {
  try {
    const pending = JSON.parse(localStorage.getItem(key) || '[]');
    pending.push({
      ...entry,
      _created: new Date().toISOString(),
      _attempts: 0
    });
    localStorage.setItem(key, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to save pending entry:', error);
  }
};

/**
 * Remove successfully synced entry from queue
 * @param {string} key - localStorage key
 * @param {string} localId - Local entry ID to remove
 */
const removePendingEntry = (key, localId) => {
  try {
    const pending = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = pending.filter(entry => entry.id !== localId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending entry:', error);
  }
};

/**
 * Get all pending entries
 * @param {string} key - localStorage key
 * @returns {Array} - Pending entries array
 */
const getPendingEntries = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.error('Failed to get pending entries:', error);
    return [];
  }
};

/**
 * Flush pending save-history entries
 */
export const flushPendingSaveHistory = async (store, apiFetch) => {
  const pendingEntries = getPendingEntries(PENDING_HISTORY_KEY);

  for (const entry of pendingEntries) {
    try {
      // Increment attempt count
      entry._attempts = (entry._attempts || 0) + 1;

      // Remove internal fields before sending
      const { _created, _attempts, ...cleanEntry } = entry;

      console.log(`Syncing pending entry ${entry.id} (attempt ${entry._attempts})`);

      const { response, data } = await apiFetch('/dream-diary/save-history', {
        method: 'POST',
        body: JSON.stringify(cleanEntry)
      });

      if (response.ok && data.success) {
        // Success: Remove from local queue and add server entry to store
        console.log(`Entry ${entry.id} synced successfully`);
        store.updateEntryWithServerData(entry.id, data.entry);
        removePendingEntry(PENDING_HISTORY_KEY, entry.id);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error (4xx): Don't retry, remove from queue
        console.warn(`Entry ${entry.id} failed with ${response.status}, removing from queue`);
        removePendingEntry(PENDING_HISTORY_KEY, entry.id);
        store.markEntrySyncFailed(entry.id, `Server error: ${response.status}`);
      } else {
        // Server error (5xx) or other: Keep in queue for retry, unless too many attempts
        if (entry._attempts >= 3) {
          console.error(`Entry ${entry.id} failed after 3 attempts, removing from queue`);
          removePendingEntry(PENDING_HISTORY_KEY, entry.id);
          store.markEntrySyncFailed(entry.id, 'Max retries exceeded');
        } else {
          // Update retry count in storage
          const pending = getPendingEntries(PENDING_HISTORY_KEY);
          const updated = pending.map(e => e.id === entry.id ? { ...e, _attempts: entry._attempts } : e);
          localStorage.setItem(PENDING_HISTORY_KEY, JSON.stringify(updated));
        }
      }
    } catch (error) {
      console.error(`Failed to sync entry ${entry.id}:`, error.message);
      // Network error: Keep in queue and retry later
    }
  }
};

/**
 * Flush pending mental health entries
 */
export const flushPendingMentalEntries = async (store, apiFetch) => {
  const pendingEntries = getPendingEntries(PENDING_MENTAL_KEY);

  for (const entry of pendingEntries) {
    try {
      entry._attempts = (entry._attempts || 0) + 1;

      const { _created, _attempts, ...cleanEntry } = entry;

      console.log(`Syncing pending mental entry ${entry.id} (attempt ${entry._attempts})`);

      const { response, data } = await apiFetch('/dream-diary/mental-health', {
        method: 'POST',
        body: JSON.stringify(cleanEntry)
      });

      if (response.ok) {
        console.log(`Mental entry ${entry.id} synced successfully`);
        store.updateMentalEntryWithServerData(entry.id, data.entry);
        removePendingEntry(PENDING_MENTAL_KEY, entry.id);
      } else if (response.status >= 400 && response.status < 500) {
        console.warn(`Mental entry ${entry.id} failed with ${response.status}, removing from queue`);
        removePendingEntry(PENDING_MENTAL_KEY, entry.id);
        store.markMentalEntrySyncFailed(entry.id, `Server error: ${response.status}`);
      } else {
        if (entry._attempts >= 3) {
          console.error(`Mental entry ${entry.id} failed after 3 attempts, removing from queue`);
          removePendingEntry(PENDING_MENTAL_KEY, entry.id);
          store.markMentalEntrySyncFailed(entry.id, 'Max retries exceeded');
        } else {
          const pending = getPendingEntries(PENDING_MENTAL_KEY);
          const updated = pending.map(e => e.id === entry.id ? { ...e, _attempts: entry._attempts } : e);
          localStorage.setItem(PENDING_MENTAL_KEY, JSON.stringify(updated));
        }
      }
    } catch (error) {
      console.error(`Failed to sync mental entry ${entry.id}:`, error.message);
    }
  }
};

/**
 * Queue an entry for later sync
 */
export const queueSaveHistoryEntry = (entry) => {
  const localEntry = {
    id: generateLocalId(),
    _synced: false,
    ...entry
  };

  savePendingEntry(PENDING_HISTORY_KEY, localEntry);
  return localEntry;
};

/**
 * Queue a mental health entry for later sync
 */
export const queueMentalHealthEntry = (mentalHealthData) => {
  const localEntry = {
    id: generateLocalId(),
    _synced: false,
    mentalHealthData
  };

  savePendingEntry(PENDING_MENTAL_KEY, localEntry);
  return localEntry;
};

/**
 * Get current pending stats
 */
export const getPendingStats = () => ({
  saveHistory: getPendingEntries(PENDING_HISTORY_KEY).length,
  mentalEntries: getPendingEntries(PENDING_MENTAL_KEY).length
});
