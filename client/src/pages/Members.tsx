import React, { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  StatusBadge,
} from "@/components/common/CommonUI";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageChurchSettings } from "@shared/roles";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Plus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

const MEMBER_STATUS_LABEL: Record<string, string> = {
  active: "ใช้งาน",
  inactive: "ไม่ใช้งาน",
  pending: "รอยืนยัน",
};

/** First visible character of a Thai or Latin name, skipping titles. */
function initial(name: string) {
  const trimmed = name.replace(
    /^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|Mr\.?|Mrs\.?|Ms\.?)\s*/,
    ""
  );
  return (trimmed || name).trim().charAt(0).toUpperCase();
}

export default function Members() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  // members.create is churchLeaderProcedure; other roles here can view only.
  const canCreate = canManageChurchSettings(user);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const isDirty = Boolean(showCreate && (name || phone || email || notes));
  useUnsavedChanges(isDirty);
  const closeCreateForm = async () => {
    if (!(await confirmDiscardChanges(isDirty))) return;
    setShowCreate(false);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
  };
  const utils = trpc.useUtils();
  const membersQuery = trpc.members.list.useQuery(undefined, { retry: false });
  const createMember = trpc.members.create.useMutation({
    onSuccess: async () => {
      await utils.members.list.invalidate();
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setShowCreate(false);
      toast.success("เพิ่มสมาชิกเรียบร้อยแล้ว");
    },
    onError: error => toast.error(error.message || "เพิ่มสมาชิกไม่สำเร็จ"),
  });

  const term = search.trim().toLowerCase();
  const visibleMembers = (membersQuery.data ?? []).filter(
    m =>
      !term ||
      m.name.toLowerCase().includes(term) ||
      (m.phone ?? "").includes(term) ||
      (m.email ?? "").toLowerCase().includes(term)
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("กรุณาระบุชื่อสมาชิก");
      return;
    }
    createMember.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <AppLayout
      title="สมาชิกคริสตจักร"
      subtitle="รายชื่อ ข้อมูลติดต่อ และสถานะของสมาชิก"
      action={
        canCreate ? (
          <button
            type="button"
            onClick={() => {
              if (showCreate) {
                void closeCreateForm();
              } else {
                setShowCreate(true);
              }
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            เพิ่มสมาชิก
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-4 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-foreground">เพิ่มสมาชิกใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                aria-label="ปิดแบบฟอร์ม"
                className="-mr-2 flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-foreground-soft">
                ชื่อ-นามสกุล *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 font-normal text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft">
                โทรศัพท์
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 font-normal text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft">
                อีเมล
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 font-normal text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={3}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 font-normal text-foreground focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            <button
              disabled={createMember.isPending}
              type="submit"
              className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-strong disabled:opacity-50 sm:w-auto"
            >
              {createMember.isPending ? "กำลังบันทึก…" : "บันทึกสมาชิก"}
            </button>
          </form>
        )}
        {membersQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : membersQuery.isError ? (
          <ErrorState
            title="โหลดข้อมูลสมาชิกไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่"
            onRetry={() => membersQuery.refetch()}
          />
        ) : !membersQuery.data?.length ? (
          <EmptyState
            title="ยังไม่มีข้อมูลสมาชิก"
            description="เริ่มต้นด้วยการเพิ่มสมาชิกคนแรก"
            actionText={canCreate ? "เพิ่มสมาชิก" : undefined}
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <div className="space-y-3">
            <FilterBar
              searchPlaceholder="ค้นหาชื่อ เบอร์โทร หรืออีเมล"
              searchValue={search}
              onSearchChange={setSearch}
            />
            <p className="text-xs text-muted-foreground">
              {visibleMembers.length} จาก {membersQuery.data.length} คน
            </p>
            {visibleMembers.length === 0 ? (
              <EmptyState
                title="ไม่พบสมาชิกที่ค้นหา"
                description="ลองพิมพ์ชื่อหรือเบอร์โทรอีกครั้ง"
                actionText="ล้างการค้นหา"
                onAction={() => setSearch("")}
              />
            ) : (
              <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-card md:grid md:grid-cols-2 md:divide-y-0">
                {visibleMembers.map(member => {
                  const contact = [member.phone, member.email]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={member.id}
                      className="md:border-b md:border-divider md:odd:border-r"
                    >
                      <button
                        type="button"
                        onClick={() => setLocation(`/members/${member.id}`)}
                        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary-strong"
                          aria-hidden="true"
                        >
                          {initial(member.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-foreground">
                            {member.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {contact || "ยังไม่มีข้อมูลติดต่อ"}
                          </span>
                        </span>
                        {member.status !== "active" && (
                          <StatusBadge
                            status={
                              member.status === "pending"
                                ? "pending"
                                : "inactive"
                            }
                            label={
                              MEMBER_STATUS_LABEL[member.status] ??
                              member.status
                            }
                          />
                        )}
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
