export function logoutAndRedirect(path: string = "/login") {
  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authRole");
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("adminAuthRole");
  } catch (err) {
    // ignore storage errors
    console.error(err);
  }

  window.location.href = path;
}
