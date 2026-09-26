import React, { useState } from "react";
import { Link } from "wouter";
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
import { memberStatusLabel } from "@shared/categories";

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-white p-3 text-base md:text-sm font-normal text-[#171311] focus:border-[#C94F16] focus-visible:ring-2 focus-visible:ring-[#C94F16]/30";

export default function Members() {
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
    if (createMember.isPending) return;
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
          aria-expanded={showCreate}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] px-4 py-2 text-sm font-bold text-white transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          เพิ่มสมาชิก
        </button>
      }
    >
      <div className="space-y-6">
        {showCreate && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#E7DCC8] bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-[#171311]">เพิ่มสมาชิกใหม่</h2>
              <button
                type="button"
                onClick={closeCreateForm}
                aria-label="ปิดแบบฟอร์ม"
                className="-mr-2 flex size-11 items-center justify-center rounded-xl text-[#807266] hover:bg-[#FFF8EA]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#51443A]">
                ชื่อ-นามสกุล{" "}
                <span className="text-[#C8372D]" aria-hidden="true">
                  *
                </span>
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                โทรศัพท์
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A]">
                อีเมล
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={3}
                  className={FIELD_CLASS}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={createMember.isPending}
              className="mt-5 min-h-11 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
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
            onRetry={() => void membersQuery.refetch()}
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
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="block rounded-2xl border border-[#E7DCC8] bg-white p-5 text-left transition-colors hover:border-[#C94F16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#171311]">{member.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${member.status === "active" ? "bg-[#E4F3E7] text-[#1F5C33]" : "bg-[#FFF8EA] text-[#51443A]"}`}
                  >
                    {memberStatusLabel(member.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#807266]">
                  {member.phone || "ไม่ระบุเบอร์โทรศัพท์"}
                </p>
                <p className="text-sm text-[#807266]">
                  {member.email || "ไม่ระบุอีเมล"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
