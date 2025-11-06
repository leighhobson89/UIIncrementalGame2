export default class Resource {
  constructor({ id, displayName, displayRateElementId }) {
    this.id = id;
    this.displayName = displayName;
    this.displayRateElementId = displayRateElementId || null;
  }

  // Current amount
  get() { throw new Error('Resource.get() not implemented'); }
  set(value) { throw new Error('Resource.set() not implemented'); }
  add(amount) { this.set(this.get() + amount); }

  // Affordability helper
  canAfford(amount) { return this.get() >= amount; }

  // Optional: additional rate shown in PPS (e.g., manual clicks)
  getAdditionalRatePerSecond() { return 0; }
}
