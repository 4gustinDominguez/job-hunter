export interface SecretCipherPort {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
}
