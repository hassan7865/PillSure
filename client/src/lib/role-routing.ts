export const normalizeRole = (role?: string | null) => (role || "").toLowerCase();

export const getDashboardHomeByRole = (role?: string | null) => {
  const key = normalizeRole(role);
  switch (key) {
    case "admin":
      return "/dashboard/admin";
    case "doctor":
      return "/dashboard/doctor";
    case "hospital":
      return "/dashboard/hospital";
    default:
      return "/";
  }
};

export const getPostAuthHomeByRole = (role?: string | null) => {
  const key = normalizeRole(role);
  if (key === "patient") return "/";
  return getDashboardHomeByRole(key);
};

export const canAccessPublicArea = (role?: string | null) => {
  const key = normalizeRole(role);
  return !key || key === "patient";
};

export const canAccessDashboardPath = (role: string | null | undefined, pathname: string) => {
  const key = normalizeRole(role);
  if (!pathname.startsWith("/dashboard")) return false;

  if (key === "admin") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/admin");
  }
  if (key === "doctor") {
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/doctor") ||
      pathname.startsWith("/dashboard/appointments")
    );
  }
  if (key === "hospital") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/hospital");
  }

  return false;
};
