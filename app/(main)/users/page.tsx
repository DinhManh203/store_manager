"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Plus, RefreshCw, Users } from "lucide-react";
import {
  Accessories,
  Beards,
  Effigy,
  EffigyBodies,
  Faces,
  Heads,
} from "@opeepsfun/open-peeps";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/auth";

type EmployeeRole = "admin" | "user";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  temporaryPassword: string;
  avatar: AvatarConfig;
};

type AvatarPiece = {
  type: string;
  options: Record<string, string>;
};

type AvatarConfig = {
  body: AvatarPiece;
  head: AvatarPiece;
  face: AvatarPiece;
  beard?: AvatarPiece;
  accessory?: AvatarPiece;
};

type EmployeeForm = {
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole | "";
  temporaryPassword: string;
};

type EmployeeLike =
  | (Record<string, unknown> & { id: unknown })
  | (Record<string, unknown> & { user_id: unknown })
  | (Record<string, unknown> & { username: unknown })
  | (Record<string, unknown> & { user_name: unknown })
  | (Record<string, unknown> & { tai_khoan: unknown })
  | (Record<string, unknown> & { account: unknown })
  | (Record<string, unknown> & { full_name: unknown })
  | (Record<string, unknown> & { fullName: unknown })
  | (Record<string, unknown> & { ho_ten: unknown })
  | (Record<string, unknown> & { name: unknown })
  | (Record<string, unknown> & { ten: unknown })
  | (Record<string, unknown> & { email: unknown })
  | (Record<string, unknown> & { gmail: unknown })
  | (Record<string, unknown> & { email_address: unknown })
  | (Record<string, unknown> & { role: unknown })
  | (Record<string, unknown> & { vai_tro: unknown });

const roleOptions: { value: EmployeeRole; label: string }[] = [
  { value: "admin", label: "Quản trị viên" },
  { value: "user", label: "Nhân viên" },
];

const roleLabelMap: Record<EmployeeRole, string> = {
  admin: "Quản trị viên",
  user: "Nhân viên",
};

const roleBadgeVariantMap: Record<EmployeeRole, "destructive" | "secondary" | "outline"> = {
  admin: "destructive",
  user: "outline",
};


const PASSWORD_CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";
const BACKEND_TEMP_PASSWORD_PLACEHOLDER = "Đã cấp trên backend";
const BACKEND_TEMP_PASSWORD_MARKERS = ["da cap tren backend", "da cap tren beckend"];
const TEMP_PASSWORD_STORAGE_KEY = "employee_known_temp_passwords_v1";

type KnownTempPasswordMap = Record<string, string>;

const normalizeVietnameseText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const normalizeTemporaryPassword = (value: string) => {
  const trimmedValue = value.trim();
  const comparableValue = normalizeVietnameseText(trimmedValue);
  const isBackendPlaceholder =
    trimmedValue === BACKEND_TEMP_PASSWORD_PLACEHOLDER ||
    BACKEND_TEMP_PASSWORD_MARKERS.some((marker) => comparableValue.includes(marker));

  if (!trimmedValue || isBackendPlaceholder) {
    return "";
  }

  return trimmedValue;
};

const createTempPasswordKeys = (employee: {
  id?: string;
  user_id?: string;
  email?: string;
}) => {
  const keys: string[] = [];
  const id = (employee.id ?? employee.user_id ?? "").trim();
  const email = (employee.email ?? "").trim().toLowerCase();

  if (id) {
    keys.push(`id:${id}`);
  }

  if (email) {
    keys.push(`email:${email}`);
  }

  return keys;
};

const readKnownTempPasswords = (): KnownTempPasswordMap => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(TEMP_PASSWORD_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isObject(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<KnownTempPasswordMap>((accumulator, [key, value]) => {
      if (typeof value === "string" && value.trim()) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const persistKnownTempPasswords = (knownPasswords: KnownTempPasswordMap) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TEMP_PASSWORD_STORAGE_KEY, JSON.stringify(knownPasswords));
  } catch {
    // Ignore storage errors.
  }
};

const hasUsableTemporaryPassword = (value: string) =>
  Boolean(normalizeTemporaryPassword(value));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s]{9,15}$/;

type PieceConfig = {
  props?: Array<{ name: string }>;
};

type PieceConfigMap = Record<string, PieceConfig>;

const bodyConfigs = EffigyBodies as PieceConfigMap;
const headConfigs = Heads as PieceConfigMap;
const faceConfigs = Faces as PieceConfigMap;
const beardConfigs = Beards as PieceConfigMap;
const accessoryConfigs = Accessories as PieceConfigMap;

const bodyTypes = Object.keys(bodyConfigs);
const headTypes = Object.keys(headConfigs);
const faceTypes = Object.keys(faceConfigs).filter((type) => type !== "ConcernedFear");
const beardTypes = Object.keys(beardConfigs);
const accessoryTypes = Object.keys(accessoryConfigs);

const skinTonePalette = ["#F2D3B1", "#E9B785", "#D08B5B", "#B66A43", "#8F4E30"];
const hairColorPalette = ["#1F2937", "#3F2A1D", "#6B4E3D", "#B87D4B", "#9CA3AF"];
const accentColorPalette = [
  "#3B82F6",
  "#06B6D4",
  "#22C55E",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#FACC15",
];
const outlineColorPalette = ["#111827", "#1F2937", "#334155"];

const randomFrom = <T,>(items: T[], random: () => number = Math.random): T =>
  items[Math.floor(random() * items.length)];

const hashStringToSeed = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const resolveColorByProp = (propName: string, random: () => number) => {
  const normalizedName = propName.toLowerCase();

  if (normalizedName.includes("outline")) {
    return randomFrom(outlineColorPalette, random);
  }

  if (normalizedName.includes("skin")) {
    return randomFrom(skinTonePalette, random);
  }

  if (normalizedName.includes("hair") || normalizedName.includes("beard")) {
    return randomFrom(hairColorPalette, random);
  }

  return randomFrom(accentColorPalette, random);
};

const createRandomPiece = (
  type: string,
  configs: PieceConfigMap,
  random: () => number = Math.random
): AvatarPiece => {
  const config = configs[type];
  const options: Record<string, string> = {};

  for (const prop of config?.props ?? []) {
    if (!prop.name.toLowerCase().includes("color")) {
      continue;
    }

    options[prop.name] = resolveColorByProp(prop.name, random);
  }

  return { type, options };
};

const createRandomAvatar = (random: () => number = Math.random): AvatarConfig => {
  const body = createRandomPiece(randomFrom(bodyTypes, random), bodyConfigs, random);
  const head = createRandomPiece(randomFrom(headTypes, random), headConfigs, random);
  const face = createRandomPiece(randomFrom(faceTypes, random), faceConfigs, random);

  const beard =
    random() > 0.55
      ? createRandomPiece(randomFrom(beardTypes, random), beardConfigs, random)
      : undefined;
  const accessory =
    random() > 0.5
      ? createRandomPiece(randomFrom(accessoryTypes, random), accessoryConfigs, random)
      : undefined;

  return { body, head, face, beard, accessory };
};

const createAvatarFromSeed = (seedKey: string) =>
  createRandomAvatar(createSeededRandom(hashStringToSeed(seedKey)));

const generateRandomPassword = (length = 12) => {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const randomValues = new Uint32Array(length);
    globalThis.crypto.getRandomValues(randomValues);

    return Array.from(
      randomValues,
      (value) => PASSWORD_CHARACTERS[value % PASSWORD_CHARACTERS.length]
    ).join("");
  }

  return Array.from(
    { length },
    () => PASSWORD_CHARACTERS[Math.floor(Math.random() * PASSWORD_CHARACTERS.length)]
  ).join("");
};

const createEmptyForm = (withRandomPassword = false): EmployeeForm => ({
  name: "",
  email: "",
  phone: "",
  role: "",
  temporaryPassword: withRandomPassword ? generateRandomPassword() : "",
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const toEmployeeRole = (value: string, fallback: EmployeeRole): EmployeeRole =>
  value.toLowerCase() === "admin" || value.toLowerCase() === "user"
    ? (value.toLowerCase() as EmployeeRole)
    : fallback;

const employeeArrayKeys = [
  "employees",
  "employee_list",
  "users",
  "staff",
  "items",
  "results",
  "records",
  "rows",
  "list",
  "accounts",
  "demo_admin_accounts",
  "admin_demo_accounts",
  "danh_sach_nguoi_dung",
  "danh_sach_tai_khoan",
  "danh_sach_nhan_vien",
  "danh_sach_tai_khoan_admin_demo",
] as const;

const isEmployeeLike = (value: unknown): value is EmployeeLike => {
  if (!isObject(value)) {
    return false;
  }

  return (
    "id" in value ||
    "user_id" in value ||
    "username" in value ||
    "user_name" in value ||
    "tai_khoan" in value ||
    "account" in value ||
    "full_name" in value ||
    "fullName" in value ||
    "ho_ten" in value ||
    "name" in value ||
    "ten" in value ||
    "email" in value ||
    "gmail" in value ||
    "email_address" in value ||
    "role" in value ||
    "vai_tro" in value
  );
};

const findEmployeeArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isObject(payload)) {
    return [];
  }

  if (isEmployeeLike(payload)) {
    return [payload];
  }

  for (const key of employeeArrayKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (isObject(data)) {
    if (isEmployeeLike(data)) {
      return [data];
    }

    for (const key of employeeArrayKeys) {
      const candidate = data[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }

  const queue: unknown[] = Object.values(payload);
  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current) && current.some(isEmployeeLike)) {
      return current;
    }

    if (isObject(current)) {
      queue.push(...Object.values(current));
    }
  }

  return [];
};

const mapPayloadToEmployees = (payload: unknown): Employee[] => {
  const records = findEmployeeArray(payload);

  return records
    .filter(isEmployeeLike)
    .map((record, index) => {
      const id =
        readString(record.id) ||
        readString(record.user_id) ||
        readString(record.username) ||
        readString(record.user_name) ||
        readString(record.tai_khoan) ||
        readString(record.account) ||
        `backend-user-${index + 1}`;
      const email =
        (
          readString(record.email) ||
          readString(record.gmail) ||
          readString(record.email_address)
        ).toLowerCase();
      const name =
        readString(record.full_name) ||
        readString(record.fullName) ||
        readString(record.ho_ten) ||
        readString(record.name) ||
        readString(record.ten) ||
        readString(record.username) ||
        readString(record.user_name) ||
        readString(record.tai_khoan) ||
        email ||
        `Nhân viên ${index + 1}`;
      const phone =
        readString(record.phone) ||
        readString(record.phone_number) ||
        readString(record.so_dien_thoai) ||
        "-";
      const role = toEmployeeRole(
        readString(record.role) || readString(record.vai_tro),
        "user"
      );
      const rawTemporaryPassword =
        readString(record.temporary_password) ||
        readString(record.temp_password) ||
        readString(record.password_tam) ||
        readString(record.mat_khau_tam);
      const temporaryPassword = normalizeTemporaryPassword(rawTemporaryPassword);

      return {
        id,
        name,
        email: email || "-",
        phone,
        role,
        temporaryPassword,
        avatar: createAvatarFromSeed(`${id}-${name}-${email || index}`),
      };
    });
};

const mergeEmployeesKeepingKnownPasswords = (
  previousEmployees: Employee[],
  nextEmployees: Employee[],
  knownTempPasswords: KnownTempPasswordMap
) => {
  const previousById = new Map(previousEmployees.map((employee) => [employee.id, employee]));
  const previousByEmail = new Map(
    previousEmployees.map((employee) => [employee.email.toLowerCase(), employee])
  );

  return nextEmployees.map((employee) => {
    if (hasUsableTemporaryPassword(employee.temporaryPassword)) {
      return employee;
    }

    const [idKey, emailKey] = createTempPasswordKeys({
      id: employee.id,
      email: employee.email,
    });
    const knownPassword = normalizeTemporaryPassword(
      (idKey && knownTempPasswords[idKey]) || (emailKey && knownTempPasswords[emailKey]) || ""
    );
    if (knownPassword) {
      return { ...employee, temporaryPassword: knownPassword };
    }

    const previousEmployee =
      previousById.get(employee.id) || previousByEmail.get(employee.email.toLowerCase());

    if (!previousEmployee || !hasUsableTemporaryPassword(previousEmployee.temporaryPassword)) {
      return employee;
    }

    return { ...employee, temporaryPassword: previousEmployee.temporaryPassword };
  });
};

const EmployeeAvatarPreview = ({
  avatar,
  name,
}: {
  avatar: AvatarConfig;
  name: string;
}) => (
  <div className="size-14 overflow-hidden rounded-full border border-border/70 bg-muted/40">
    <Effigy
      body={avatar.body}
      head={avatar.head}
      face={avatar.face}
      beard={avatar.beard}
      accessory={avatar.accessory}
      style={{ width: "100%", height: "100%" }}
    />
    <span className="sr-only">{name}</span>
  </div>
);

export default function UsersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [knownTempPasswords, setKnownTempPasswords] = useState<KnownTempPasswordMap>(() =>
    readKnownTempPasswords()
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(() => createEmptyForm(false));
  const [avatarDraft, setAvatarDraft] = useState<AvatarConfig>(() =>
    createAvatarFromSeed("initial-avatar-draft")
  );
  const [error, setError] = useState("");
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeesLoadError, setEmployeesLoadError] = useState("");

  const loadEmployeesFromBackend = useCallback(async () => {
    setIsLoadingEmployees(true);

    try {
      const response = await fetch("/api/employees", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách nhân viên từ backend.";
        setEmployeesLoadError(message);
        setEmployees([]);
        return;
      }

      const normalizedEmployees = mapPayloadToEmployees(payload);
      setEmployees((previousEmployees) =>
        mergeEmployeesKeepingKnownPasswords(
          previousEmployees,
          normalizedEmployees,
          knownTempPasswords
        )
      );
      setEmployeesLoadError("");
    } catch {
      setEmployeesLoadError("Không thể kết nối API danh sách nhân viên.");
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [knownTempPasswords]);

  useEffect(() => {
    void loadEmployeesFromBackend();
  }, [loadEmployeesFromBackend]);

  useEffect(() => {
    persistKnownTempPasswords(knownTempPasswords);
  }, [knownTempPasswords]);

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);

    if (open) {
      setForm(createEmptyForm(true));
      setAvatarDraft(createRandomAvatar());
      setError("");
    }
  };

  const handleFieldChange = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeneratePassword = () => {
    setForm((prev) => ({ ...prev, temporaryPassword: generateRandomPassword() }));
  };

  const validateForm = () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const role = form.role;
    const temporaryPassword = form.temporaryPassword.trim();

    if (!name || !email || !phone || !role || !temporaryPassword) {
      return "Vui lòng nhập đầy đủ thông tin nhân viên.";
    }

    if (!EMAIL_PATTERN.test(email)) {
      return "Email chưa đúng định dạng.";
    }

    if (!PHONE_PATTERN.test(phone)) {
      return "Số điện thoại chỉ gồm số và phải dài từ 9 đến 15 ký tự.";
    }

    if (temporaryPassword.length < 8) {
      return "Mật khẩu tạm cần tối thiểu 8 ký tự.";
    }

    const duplicatedEmail = employees.some(
      (employee) => employee.email.toLowerCase() === email
    );

    if (duplicatedEmail) {
      return "Email nhân viên đã tồn tại.";
    }

    return "";
  };

const handleCopyPassword = async (password: string) => {
    if (!password) {
      toast.warning("Chưa có dữ liệu mật khẩu để sao chép.");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      toast.success("Đã sao chép mật khẩu tạm.");
    } catch {
      toast.error("Không thể sao chép. Vui lòng copy thủ công.");
    }
  };

  const handleCreateEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      full_name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role as EmployeeRole,
      temporary_password: form.temporaryPassword.trim(),
    };
    const avatar = avatarDraft;

    setIsCreatingEmployee(true);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) || "Không thể tạo nhân viên. Vui lòng thử lại.";
        setError(message);
        toast.error(message);
        return;
      }

      const data = isObject(responsePayload) ? responsePayload : {};

      const newEmployee: Employee = {
        id: readString(data.id) || `${Date.now()}`,
        name: readString(data.full_name) || readString(data.username) || payload.full_name,
        email: readString(data.email) || payload.email,
        phone: readString(data.phone) || payload.phone,
        role: toEmployeeRole(readString(data.role), payload.role),
        temporaryPassword: payload.temporary_password,
        avatar,
      };

      const employeePasswordKeys = createTempPasswordKeys({
        id: newEmployee.id,
        email: newEmployee.email,
      });
      setKnownTempPasswords((previous) => {
        const next = { ...previous };

        for (const key of employeePasswordKeys) {
          next[key] = payload.temporary_password;
        }

        return next;
      });

      setEmployees((prev) => [newEmployee, ...prev]);
      setEmployeesLoadError("");
      setIsCreateDialogOpen(false);
      setForm(createEmptyForm(false));
      setAvatarDraft(createAvatarFromSeed("initial-avatar-draft"));
      setError("");

      toast.success("Tạo nhân viên thành công.", {
        description: `${newEmployee.name} - ${newEmployee.email}`,
      });

      void loadEmployeesFromBackend();
    } catch {
      const message = "Không thể kết nối API tạo nhân viên.";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Quản trị hệ thống</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tài khoản, phân quyền và trạng thái hoạt động của nhân viên.
        </p>
      </section>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Danh sách nhân viên</CardTitle>
              <CardDescription>
                Tạo nhanh tài khoản nhân viên với role và mật khẩu tạm ngẫu nhiên.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Users className="size-3.5" />
                {employees.length} tài khoản
              </Badge>

              <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer">
                    <Plus className="size-4" />
                    Tạo nhân viên
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Tạo tài khoản nhân viên</DialogTitle>
                    <DialogDescription>
                      Điền thông tin cơ bản và cấp mật khẩu tạm cho nhân viên mới.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateEmployee} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="employee-name">Tên nhân viên</Label>
                        <Input
                          id="employee-name"
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={form.name}
                          onChange={(event) => handleFieldChange("name", event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employee-email">Gmail nhân viên</Label>
                        <Input
                          id="employee-email"
                          type="email"
                          placeholder="name@gmail.com"
                          value={form.email}
                          onChange={(event) => handleFieldChange("email", event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employee-phone">Số điện thoại</Label>
                        <Input
                          id="employee-phone"
                          placeholder="09xxxxxxxx"
                          value={form.phone}
                          onChange={(event) => handleFieldChange("phone", event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employee-role">Role</Label>
                        <Select
                          value={form.role}
                          onValueChange={(value) => handleFieldChange("role", value)}
                        >
                          <SelectTrigger id="employee-role" className="w-full">
                            <SelectValue placeholder="Chọn role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label>Avatar ngẫu nhiên</Label>
                        <div className="flex items-center gap-3 rounded-lg border border-border/70 p-3">
                          <EmployeeAvatarPreview
                            avatar={avatarDraft}
                            name={form.name || "Avatar nhân viên mới"}
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Avatar sẽ lưu khi tạo nhân viên</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isCreatingEmployee}
                              onClick={() => setAvatarDraft(createRandomAvatar())}
                            >
                              <RefreshCw className="size-3.5" />
                              Đổi avatar ngẫu nhiên
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="employee-password">Mật khẩu tạm</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            id="employee-password"
                            value={form.temporaryPassword}
                            className="font-mono"
                            onChange={(event) =>
                              handleFieldChange("temporaryPassword", event.target.value)
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            disabled={isCreatingEmployee}
                            onClick={handleGeneratePassword}
                          >
                            <RefreshCw className="size-3.5" />
                            Tạo ngẫu nhiên
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="shrink-0"
                            disabled={isCreatingEmployee}
                            onClick={() => void handleCopyPassword(form.temporaryPassword)}
                          >
                            <Copy className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex justify-end gap-2 border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isCreatingEmployee}
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="cursor-pointer"
                      >
                        Hủy
                      </Button>
                      <Button type="submit" disabled={isCreatingEmployee} className="cursor-pointer">
                        {isCreatingEmployee ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Tạo nhân viên
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ảnh đại diện</TableHead>
                <TableHead>Tên nhân viên</TableHead>
                <TableHead>Gmail</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Đang tải danh sách nhân viên ...
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    {employeesLoadError || "Chưa có nhân viên nào."}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <EmployeeAvatarPreview
                        avatar={employee.avatar}
                        name={`Avatar của ${employee.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariantMap[employee.role]}>
                        {roleLabelMap[employee.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
