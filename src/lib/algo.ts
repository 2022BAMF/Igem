/**
 * Ported from Python script: Service Password Generator (Seed 2)
 */

/**
 * Standard CRC-16 Modbus (Polynomial: 0xA001, Init: 0xFFFF)
 */
export function calculateChecksum(dataBytes: number[]): number {
  let crc = 0xFFFF;
  for (const byte of dataBytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xA001;
      } else {
        crc >>>= 1;
      }
    }
  }
  return crc & 0xFFFF;
}

/**
 * Generates the second password based on a 12-digit input code.
 */
export function generateSecondPassword(inputCode: string): string {
  if (inputCode.length !== 12 || !/^\d+$/.test(inputCode)) {
    throw new Error("Input must be exactly 12 digits.");
  }

  const seed = 0x4685;

  // 1. Initialize buffer with ASCII values
  const buf1 = Array.from(inputCode.slice(0, 12)).map(c => c.charCodeAt(0));

  // 2. Apply the seed
  buf1[0] = (buf1[0] + (seed & 0xFF)) & 0xFF;
  buf1[1] = (buf1[1] + ((seed >> 8) & 0xFF)) & 0xFF;

  // 3. Create the scrambled array
  const buf2 = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    let val = (i * 7) & 0xFF;
    val = (val + buf1[i]) & 0xFF;
    val = (~val) & 0xFF;
    buf2[i] = val;
  }

  // 4. Run checksums
  let crc1 = calculateChecksum(buf1);
  let crc2 = calculateChecksum(buf2);

  // 5. Interleave the digits
  let password = "";
  for (let i = 0; i < 3; i++) {
    password += (crc1 % 10).toString();
    crc1 = Math.floor(crc1 / 10);
    password += (crc2 % 10).toString();
    crc2 = Math.floor(crc2 / 10);
  }

  return password;
}
