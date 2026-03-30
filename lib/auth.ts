const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");
const readTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

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
    readTrimmedString(user?.role);

  if (directRole) {
    return directRole;
  }

  const roles = user?.roles ?? payload.roles ?? nested?.roles;
  if (!Array.isArray(roles)) {
    return "";
  }

  const firstRole = roles.find((role) => typeof role === "string");
  return readTrimmedString(firstRole);
};
