const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { makeAppleClientSecret, MAX_LIFETIME_SECONDS } = require("./apple-client-secret.js");

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }); // same format as Apple's .p8
const base = { teamId: "ABCDE12345", keyId: "XYZ987ABCD", clientId: "com.example.stacksaver.web", privateKey: pem };

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

test("builds an ES256 JWT with the claims Apple expects", () => {
  const now = Date.UTC(2026, 9, 6);
  const { secret, expiresAt } = makeAppleClientSecret({ ...base, now });
  const [h, p, sig] = secret.split(".");
  assert.deepStrictEqual(decode(h), { alg: "ES256", kid: "XYZ987ABCD", typ: "JWT" });
  const claims = decode(p);
  assert.strictEqual(claims.iss, "ABCDE12345");
  assert.strictEqual(claims.sub, "com.example.stacksaver.web");
  assert.strictEqual(claims.aud, "https://appleid.apple.com");
  assert.strictEqual(claims.iat, now / 1000);
  assert.strictEqual(claims.exp - claims.iat, MAX_LIFETIME_SECONDS);
  assert.strictEqual(expiresAt.getTime(), claims.exp * 1000);

  const ok = crypto.verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
  assert.ok(ok, "signature verifies with the matching public key");
});

test("rejects bad input", () => {
  assert.throws(() => makeAppleClientSecret({ ...base, teamId: "short" }), /Team ID/);
  assert.throws(() => makeAppleClientSecret({ ...base, keyId: "" }), /Key ID/);
  assert.throws(() => makeAppleClientSecret({ ...base, clientId: "" }), /Services ID/);
  assert.throws(() => makeAppleClientSecret({ ...base, lifetimeSeconds: MAX_LIFETIME_SECONDS + 1 }), /6 months/);
});
