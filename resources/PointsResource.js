import Resource from './Resource.js';
import { getScore, setScore } from '../constantsAndGlobalVars.js';
import { getManualClickRate } from '../game.js';

export class PointsResource extends Resource {
  constructor() {
    super({ id: 'points', displayName: 'Points', displayRateElementId: 'pointsPerSecond' });
  }

  get() {
    return getScore();
  }

  set(value) {
    setScore(value);
  }

  getAdditionalRatePerSecond() {
    // manual click contribution to rate display
    return getManualClickRate();
  }
}

export const pointsResource = new PointsResource();
