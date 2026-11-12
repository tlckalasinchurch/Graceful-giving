import React, { useMemo, useState } from "react";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { Mail, Phone, Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

const MEMBER_STATUS_LABEL: Record<string, string> = {
  active: "ใช้งาน",
  inactive: "ไม่ใช้งาน",
  pending: "รอยืนยัน",
};

export default function Members() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [name, setName] = useState("");
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const isDirty = Boolean(
    showCreate && (name || envelopeNo || phone || email || notes)
  );
  useUnsavedChanges(isDirty);
  const closeCreateForm = async () => {
    if (!(await confirmDiscardChanges(isDirty))) return;
    setShowCreate(false);
    setName("");
    setEnvelopeNo("");
    setPhone("");
    setEmail("");
    setNotes("");
  };
  const utils = trpc.useUtils();
  const membersQuery = trpc.members.list.useQuery(undefined, { retry: false });
  const membersList = membersQuery.data ?? [];
  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return membersList.filter(member => {
      const matchSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        (member.envelopeNo ?? "").toLowerCase().includes(q) ||
        (member.phone ?? "").toLowerCase().includes(q) ||
        (member.email ?? "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || member.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [membersList, searchTerm, statusFilter]);
  const { lock, unlock } = useSubmitLock();
  const createMember = trpc.members.create.useMutation({
    onSettled: unlock,
    onSuccess: async () => {
      await utils.members.list.invalidate();
      setName("");
      setEnvelopeNo("");
      setPhone("");
      setEmail("");
      setNotes("");
      setShowCreate(false);
      toast.success("เพิ่มสมาชิกเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error(friendlyErrorMessage(error, "เพิ่มสมาชิกไม่สำเร็จ")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("กรุณาระบุชื่อสมาชิก");
      return;
    }
    if (!lock()) return;
    createMember.mutate({
      name: name.trim(),
      envelopeNo: envelopeNo.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <AppLayout
      title="สมาชิกคริสตจักร"
      subtitle="รายชื่อ รหัสซองถวาย ข้อมูลติดต่อ และสถานะของสมาชิก"
      action={
        <button
          type="button"
          onClick={() => {
            if (showCreate) {
              void closeCreateForm();
            } else {
              setShowCreate(true);
            }
          }}
          className="btn-primary min-h-11 inline-flex items-center gap-2 px-4 py-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          เพิ่มสมาชิก
        </button>
      }
    >
      <div className="space-y-6">
        {showCreate && (
          <form onSubmit={submit} className="bento-card p-6">
            <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <h2 className="font-extrabold text-ink">เพิ่มสมาชิกใหม่</h2>
              <button
                type="button"
                aria-label="ปิดแบบฟอร์ม"
                onClick={() => void closeCreateForm()}
                className="flex size-11 items-center justify-center rounded-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-extrabold text-ink-2">
                ชื่อ-นามสกุล *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="เช่น คุณสมชาย ใจดี"
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                รหัสซองถวายประจำตัว (ถ้ามี)
                <input
                  value={envelopeNo}
                  onChange={event => setEnvelopeNo(event.target.value)}
                  placeholder="เช่น 001, A-12"
                  maxLength={32}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                โทรศัพท์
                <input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                อีเมล
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="somchai@church.or.th"
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2 md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={3}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
            </div>
            <button
              disabled={createMember.isPending}
              className="btn-primary mt-5 min-h-11 px-5 py-2 text-sm disabled:opacity-50"
            >
              {createMember.isPending ? "กำลังบันทึก…" : "บันทึกสมาชิก"}
            </button>
          </form>
        )}
        <FilterBar
          searchPlaceholder="ค้นหาชื่อ, รหัสซองถวาย, เบอร์โทรศัพท์ หรืออีเมลสมาชิก..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          filters={[
            { id: "all", label: "ทั้งหมด", count: membersList.length },
            {
              id: "active",
              label: "ใช้งาน",
              count: membersList.filter(m => m.status === "active").length,
            },
            {
              id: "pending",
              label: "รอยืนยัน",
              count: membersList.filter(m => m.status === "pending").length,
            },
            {
              id: "inactive",
              label: "ไม่ใช้งาน",
              count: membersList.filter(m => m.status === "inactive").length,
            },
          ]}
        />
        {membersQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : membersQuery.isError ? (
          <ErrorState
            title="โหลดข้อมูลสมาชิกไม่สำเร็จ"
            description={friendlyErrorMessage(membersQuery.error)}
            onRetry={() => membersQuery.refetch()}
          />
        ) : !membersList.length ? (
          <EmptyState
            title="ยังไม่มีข้อมูลสมาชิก"
            description="เริ่มต้นด้วยการเพิ่มสมาชิกคนแรก"
            actionText="เพิ่มสมาชิก"
            onAction={() => setShowCreate(true)}
          />
        ) : !filteredMembers.length ? (
          <EmptyState
            title="ไม่พบสมาชิกตามคำค้นหา"
            description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะใหม่"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMembers.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => setLocation(`/members/${member.id}`)}
                className="bento-card p-5 text-left transition-colors hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-ink truncate">
                      {member.name}
                    </h2>
                    {member.envelopeNo && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-lg border border-line bg-accent/60 px-2 py-0.5 text-xs font-extrabold text-ink">
                        <Tag className="size-3 text-brand" />
                        ซอง #{member.envelopeNo}
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${
                      member.status === "active"
                        ? "border-line bg-tile-mint text-tile-mint-ink"
                        : member.status === "pending"
                          ? "border-line bg-tile-sand text-tile-sand-ink"
                          : "border-line bg-paper-2 text-ink-3"
                    }`}
                  >
                    {MEMBER_STATUS_LABEL[member.status] ?? member.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs font-medium text-ink-2">
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-brand shrink-0" />
                    <span>{member.phone || "ไม่ระบุเบอร์โทรศัพท์"}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-ink-3">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {member.email || "ไม่ระบุอีเมล"}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
