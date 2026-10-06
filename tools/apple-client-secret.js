#!/usr/bin/env node
// Generates the client secret Supabase needs for Sign in with Apple.
// Apple secrets expire after at most 6 months, so re-run this before then and
// paste the new value into Supabase (Authentication -> Sign In / Providers -> Apple).
//
//   node tools/apple-client-secret.js --team-id ABCDE12345 --key-id XYZ987ABCD \
//     --client-id com.example.stacksaver.web --key ./AuthKey_XYZ987ABCD.p8
//
// Everything runs locally; the .p8 key never leaves your computer.
const crypto = require("node:crypto");
const fs = require("node:fs");

const MAX_LIFETIME_SECONDS = 15777000; // Apple's limit: 6 months

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function makeAppleClientSecret({ teamId, keyId, clientId, privateKey, now = Date.now(), lifetimeSeconds = MAX_LIFETIME_SECONDS }) {
  if (!/^[A-Z0-9]{10}$/.test(teamId || "")) throw new Error("Team ID should be 10 letters/numbers (top right of the Apple Developer site).");
  if (!/^[A-Z0-9]{10}$/.test(keyId || "")) throw new Error("Key ID should be 10 letters/numbers (shown next to the key in Apple Developer → Keys).");
  if (!clientId) throw new Error("Client ID is your Services ID, e.g. com.example.stacksaver.web.");
  if (lifetimeSeconds > MAX_LIFETIME_SECONDS) throw new Error("Apple secrets can last at most 6 months.");

  const iat = Math.floor(now / 1000);
  const exp = iat + lifetimeSeconds;
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = { iss: teamId, iat, exp, aud: "https://appleid.apple.com", sub: clientId };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("sha256", Buffer.from(signingInput), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return { secret: `${signingInput}.${b64url(signature)}`, expiresAt: new Date(exp * 1000) };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args["team-id"] || !args["key-id"] || !args["client-id"] || !args.key) {
    console.error("Usage: node tools/apple-client-secret.js --team-id TEAMID --key-id KEYID --client-id SERVICES_ID --key AuthKey_KEYID.p8");
    process.exit(1);
  }
  try {
    const { secret, expiresAt } = makeAppleClientSecret({
      teamId: args["team-id"],
      keyId: args["key-id"],
      clientId: args["client-id"],
      privateKey: fs.readFileSync(args.key, "utf8"),
    });
    console.log(secret);
    console.error(`\nPaste the line above into Supabase as the Apple "Secret Key (for OAuth)".`);
    console.error(`It expires ${expiresAt.toDateString()}. Set a reminder to generate a new one before then.`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { makeAppleClientSecret, MAX_LIFETIME_SECONDS };
