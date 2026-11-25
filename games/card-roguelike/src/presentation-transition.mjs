// A cosmetic camera rail must never own gameplay indefinitely.
export async function settleTransition(
  animate,
  finish,
  { timeoutMs = 12000 } = {},
) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(animate),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          try {
            finish();
            resolve(false);
          } catch (error) {
            reject(error);
          }
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
