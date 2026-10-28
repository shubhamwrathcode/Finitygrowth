/**
 * Smoke test: the data layer returns consistent numbers.
 * Run with: npm test
 */
import * as api from '../src/services/api';

describe('mock API', () => {
  it('dashboard totals add up', async () => {
    const d = await api.getDashboard();
    const { roi, direct, level, total } = d.incomeBreakdown;
    expect(Math.round((roi + direct + level) * 100) / 100).toBeCloseTo(total, 2);
    expect(d.wallet.balance).toBeGreaterThan(0);
  });

  it('withdrawal quote cuts a 5% fee', () => {
    expect(api.quoteWithdrawal(100)).toEqual({ gross: 100, fee: 5, net: 95 });
  });

  it('rejects a withdrawal below the minimum', async () => {
    await expect(api.requestWithdrawal({ amount: 5, address: '0x' + 'a'.repeat(40) })).rejects.toThrow();
  });
});
