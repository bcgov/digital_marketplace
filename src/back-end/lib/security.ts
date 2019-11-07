import bcrypt from 'bcrypt';

export async function authenticatePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
};

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
