const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");
const readTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const readRoleValue = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isObject(value)) {
    return "";
  }

  return (
    readTrimmedString(value.role) ||
    readTrimmedString(value.name) ||
    readTrimmedString(value.code) ||
    readTrimmedString(value.value)
  );
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  return "";
};

const parseJwtPayload = (token: string) => {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(tokenParts[1]);
    if (!decoded) {
      return null;
    }

    const parsed = JSON.parse(decoded);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const extractRoleFromToken = (token: string) => {
  const jwtPayload = parseJwtPayload(token);
  if (!jwtPayload) {
    return "";
  }

  const adminTokenFlags = [
    jwtPayload.is_admin,
    jwtPayload.isAdmin,
    jwtPayload.is_superuser,
    jwtPayload.isSuperuser,
    jwtPayload.is_staff,
    jwtPayload.isStaff,
  ];
  if (adminTokenFlags.some((flag) => flag === true || flag === 1 || flag === "true")) {
    return "Admin";
  }

  const directRole =
    readRoleValue(jwtPayload.role) ||
    readRoleValue(jwtPayload.user_role) ||
    readRoleValue(jwtPayload.userRole) ||
    readRoleValue(jwtPayload.authority);

  if (directRole) {
    return directRole;
  }

  const candidateArrays = [jwtPayload.roles, jwtPayload.authorities, jwtPayload.permissions];
  for (const candidate of candidateArrays) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const firstRole = candidate.map(readRoleValue).find(Boolean);
    if (firstRole) {
      return firstRole;
    }
  }

  const scope = readTrimmedString(jwtPayload.scope);
  if (scope) {
    const firstScope = scope
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .find(Boolean);

    return firstScope ?? "";
  }

  return "";
};

export const extractAuthToken = (payload: unknown) => {
  if (!isObject(payload)) {
    return "";
  }

  const nested = isObject(payload.data) ? payload.data : null;

  return (
    readString(payload.access_token) ||
    readString(payload.accessToken) ||
    readString(payload.token) ||
    readString(nested?.access_token) ||
    readString(nested?.accessToken) ||
    readString(nested?.token)
  );
};

export const extractErrorMessage = (payload: unknown) => {
  if (!isObject(payload)) {
    return "";
  }

  const message = payload.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return "";
};

export const extractRole = (payload: unknown) => {
  if (!isObject(payload)) {
    return "";
  }

  const nested = isObject(payload.data) ? payload.data : null;
  const user = isObject(payload.user)
    ? payload.user
    : isObject(nested?.user)
      ? nested.user
      : null;

  const directRole =
    readTrimmedString(payload.role) ||
    readTrimmedString(nested?.role) ||
    readTrimmedString(user?.role) ||
    readRoleValue(payload.roles) ||
    readRoleValue(nested?.roles) ||
    readRoleValue(user?.roles);

  if (directRole) {
    return directRole;
  }

  const adminFlags = [
    payload.is_admin,
    payload.isAdmin,
    payload.is_superuser,
    payload.isSuperuser,
    payload.is_staff,
    payload.isStaff,
    nested?.is_admin,
    nested?.isAdmin,
    nested?.is_superuser,
    nested?.isSuperuser,
    nested?.is_staff,
    nested?.isStaff,
    user?.is_admin,
    user?.isAdmin,
    user?.is_superuser,
    user?.isSuperuser,
    user?.is_staff,
    user?.isStaff,
  ];

  if (adminFlags.some((flag) => flag === true || flag === 1 || flag === "true")) {
    return "Admin";
  }

  const roles = user?.roles ?? payload.roles ?? nested?.roles;
  if (!Array.isArray(roles)) {
    const token = extractAuthToken(payload);
    return token ? extractRoleFromToken(token) : "";
  }

  const firstRole = roles.map(readRoleValue).find(Boolean);
  if (firstRole) {
    return firstRole;
  }

  const token = extractAuthToken(payload);
  if (!token) {
    return "";
  }

  return extractRoleFromToken(token);
};

export const isAdminRole = (role: unknown) => {
  const normalizedRole = readTrimmedString(readRoleValue(role)).toLowerCase();

  if (!normalizedRole) {
    return false;
  }

  return (
    normalizedRole === "admin" ||
    normalizedRole === "administrator" ||
    normalizedRole === "role_admin" ||
    normalizedRole.includes("admin")
  );
};
