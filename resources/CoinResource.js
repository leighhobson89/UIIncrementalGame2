import Resource from './Resource.js';
import { getCoins, setCoins } from '../constantsAndGlobalVars.js';
import { getManualClickRate } from '../game.js';

export class CoinResource extends Resource {
  constructor() {
    // Use existing DOM id for the CPS display
    super({ id: 'coins', displayName: 'Coins', displayRateElementId: 'pointsPerSecond' });
  }

  get() {
    return getCoins();
  }

  set(value) {
    setCoins(value);
  }

  getAdditionalRatePerSecond() {
    // manual click contribution to rate display
    return getManualClickRate();
  }
}

export const coinResource = new CoinResource();
