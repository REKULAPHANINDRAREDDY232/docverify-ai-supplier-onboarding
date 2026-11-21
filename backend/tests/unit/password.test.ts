import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing unit tests', () => {
  it('hashes passwords and verifies the correct secret', async () => {
    const hash = await hashPassword('synthetic-secret-99');
    expect(hash).not.toContain('synthetic-secret-99');
    expect(await verifyPassword('synthetic-secret-99', hash)).toBe(true);
    expect(await verifyPassword('wrong-secret', hash)).toBe(false);
  });
});
