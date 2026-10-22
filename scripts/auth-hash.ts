import { hashPassword } from "../src/app/_lib/password";

function main(): void {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: pnpm auth:hash "your-password"');
    process.exit(1);
  }
  console.log(hashPassword(password));
}

main();
