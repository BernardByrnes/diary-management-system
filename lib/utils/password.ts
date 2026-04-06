const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(): string {
  let result = "Temp@";
  for (let i = 0; i < 6; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}
