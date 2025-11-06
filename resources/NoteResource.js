import Resource from './Resource.js';
import { getNotes, setNotes } from '../constantsAndGlobalVars.js';
import { getManualNoteClickRate } from '../game.js';

export class NoteResource extends Resource {
  constructor() {
    super({ id: 'notes', displayName: 'Notes', displayRateElementId: 'notesPerSecond' });
  }

  get() {
    return getNotes();
  }

  set(value) {
    setNotes(value);
  }

  getAdditionalRatePerSecond() {
    // manual note click contribution to rate display
    return getManualNoteClickRate();
  }
}

export const noteResource = new NoteResource();
