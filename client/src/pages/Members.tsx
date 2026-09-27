import React, { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { Plus, UsersRound, X } from "lucide-react";
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

export default function Members() {
  const [, setLocation] = useLocation();
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
        <button
          type="button"
          onClick={() => {
            if (showCreate) {
              closeCreateForm();
            } else {
              setShowCreate(true);
            }
          }}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          เพิ่มสมาชิก
        </button>
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
                className="text-muted-foreground"
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
                  className="mt-1 w-full rounded-xl border border-border p-3 font-normal text-foreground"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft">
                โทรศัพท์
                <input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-border p-3 font-normal text-foreground"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft">
                อีเมล
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-border p-3 font-normal text-foreground"
                />
              </label>
              <label className="text-sm font-semibold text-foreground-soft md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border p-3 font-normal text-foreground"
                />
              </label>
            </div>
            <button
              disabled={createMember.isPending}
              className="mt-5 min-h-11 rounded-xl bg-success px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
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
            actionText="เพิ่มสมาชิก"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {membersQuery.data.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => setLocation(`/members/${member.id}`)}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 text-left hover:bg-background"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-foreground">{member.name}</h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${member.status === "active" ? "bg-success-soft text-foreground" : "bg-muted text-foreground-soft"}`}
                  >
                    {MEMBER_STATUS_LABEL[member.status] ?? member.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {member.phone || "ไม่ระบุเบอร์โทรศัพท์"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.email || "ไม่ระบุอีเมล"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
