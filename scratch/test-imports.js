async function test() {
  try {
    console.log("Loading lib/auth...");
    const auth = await import("../lib/auth.js");
    console.log("Loaded lib/auth successfully.");
  } catch (e) {
    console.error("Failed to load lib/auth:", e);
  }

  try {
    console.log("Loading lib/db...");
    const db = await import("../lib/db.js");
    console.log("Loaded lib/db successfully.");
  } catch (e) {
    console.error("Failed to load lib/db:", e);
  }

  try {
    console.log("Loading lib/email...");
    const email = await import("../lib/email.js");
    console.log("Loaded lib/email successfully.");
  } catch (e) {
    console.error("Failed to load lib/email:", e);
  }
}
test();
