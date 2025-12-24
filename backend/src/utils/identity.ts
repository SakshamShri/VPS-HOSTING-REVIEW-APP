// Identity number validation utilities for Aadhaar (India) and CPF (Brazil)

// Verhoeff algorithm implementation for Aadhaar
// Aadhaar is 12 digits, last digit is checksum using Verhoeff.

const verhoeffD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function isValidAadhaar(raw: string): boolean {
  const digits = raw.replace(/\s+/g, "");
  if (!/^\d{12}$/.test(digits)) return false;

  let c = 0;
  const reversed = digits.split("").reverse().map((d) => parseInt(d, 10));

  for (let i = 0; i < reversed.length; i++) {
    const digit = reversed[i];
    c = verhoeffD[c][verhoeffP[i % 8][digit]];
  }

  return c === 0;
}

// CPF validation for Brazil
// 11 digits, with two check digits.

export function isValidCpf(raw: string): boolean {
  const digits = raw.replace(/\D+/g, "");
  if (!/^\d{11}$/.test(digits)) return false;

  // Reject CPFs with all digits equal (e.g., 00000000000)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const numbers = digits.split("").map((d) => parseInt(d, 10));

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += numbers[i] * (10 - i);
  }
  let firstCheck = (sum * 10) % 11;
  if (firstCheck === 10) firstCheck = 0;
  if (firstCheck !== numbers[9]) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += numbers[i] * (11 - i);
  }
  let secondCheck = (sum * 10) % 11;
  if (secondCheck === 10) secondCheck = 0;
  if (secondCheck !== numbers[10]) return false;

  return true;
}
