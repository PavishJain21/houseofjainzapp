/**
 * Guest mode: when API returns 401 or user taps "Sign in", we navigate to Login (or Register).
 * Set by the guest stack when it mounts; cleared when it unmounts.
 * @param routeName - 'Login' | 'Register' (default 'Login')
 */
let callback = null;

export function setRequestLoginCallback(fn) {
  callback = fn;
}

export function requestLogin(routeName = 'Login') {
  if (typeof callback === 'function') callback(routeName);
}
