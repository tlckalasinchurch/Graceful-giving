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
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#C94F16] px-4 py-2 text-sm font-semibold text-white enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
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
            className="rounded-2xl border border-[#E7DCC8] bg-card p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-[#171311]">เพิ่มสมาชิกใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="text-[#6E6155] transition-all duration-200 ease-in-out"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#51443A]">
                ชื่อ-นามสกุล *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                โทรศัพท์
                <input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                อีเมล
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-normal text-[#171311]"
                />
              </label>
            </div>
            <button
              disabled={createMember.isPending}
              className="mt-5 min-h-11 rounded-xl bg-[#2D6A2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-50 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-in-out"
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
                className="rounded-2xl border border-[#E7DCC8] bg-card p-5 text-left shadow-sm hover:bg-[#FAF8F5] transition-all duration-200 ease-in-out"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#171311]">{member.name}</h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${member.status === "active" ? "bg-[#E4F3E7] text-[#171311]" : "bg-[#F5EDE0] text-[#51443A]"}`}
                  >
                    {MEMBER_STATUS_LABEL[member.status] ?? member.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#6E6155]">
                  {member.phone || "ไม่ระบุเบอร์โทรศัพท์"}
                </p>
                <p className="text-sm text-[#6E6155]">
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
