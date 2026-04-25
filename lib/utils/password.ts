const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  let result = "Temp@";
  for (let i = 0; i < 6; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}
