import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { memberStatusLabel } from "@shared/categories";

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] p-3 text-base md:text-sm font-normal text-[#171717] focus:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/30";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

export default function MemberDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const utils = trpc.useUtils();
  const query = trpc.members.getById.useQuery(
    { id },
    { enabled: Number.isInteger(id) && id > 0, retry: false }
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Seed once per record. React Query refetches on window focus, and
  // re-seeding on every refetch erased edits in progress.
  const seededIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!query.data || seededIdRef.current === query.data.id) return;
    seededIdRef.current = query.data.id;
    setName(query.data.name ?? "");
    setPhone(query.data.phone ?? "");
    setEmail(query.data.email ?? "");
    setNotes(query.data.notes ?? "");
  }, [query.data]);

  const update = trpc.members.update.useMutation({
    onSuccess: async () => {
      await utils.members.list.invalidate();
      // Re-seed from the saved record so the form is clean again.
      seededIdRef.current = null;
      await utils.members.getById.invalidate({ id });
      toast.success("บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว");
    },
    onError: async error => {
      await Swal.error(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถบันทึกข้อมูลได้"
      );
    },
  });

  const deactivate = trpc.members.deactivate.useMutation({
    onSuccess: async () => {
      await utils.members.list.invalidate();
      await utils.members.getById.invalidate({ id });
      toast.success("ปิดใช้งานสมาชิกเรียบร้อยแล้ว");
    },
    onError: async error => {
      await Swal.error(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถปิดใช้งานได้"
      );
    },
  });

  const isDirty =
    Boolean(query.data) &&
    (name !== (query.data?.name ?? "") ||
      phone !== (query.data?.phone ?? "") ||
      email !== (query.data?.email ?? "") ||
      notes !== (query.data?.notes ?? ""));
  useUnsavedChanges(isDirty);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(id) || id <= 0 || update.isPending) return;
    update.mutate({
      id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <AppLayout
      title="รายละเอียดสมาชิก"
      subtitle="ข้อมูลติดต่อและสถานะของสมาชิก"
    >
      <div className="max-w-3xl space-y-6">
        <BackLink
          label="กลับหน้าสมาชิก"
          onClick={async () => {
            if (await confirmDiscardChanges(isDirty)) setLocation("/members");
          }}
        />
        {query.isLoading ? (
          <LoadingSkeleton count={3} />
        ) : query.isError ? (
          <ErrorState
            title="โหลดข้อมูลสมาชิกไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่"
            onRetry={() => void query.refetch()}
          />
        ) : !query.data ? (
          <EmptyState
            title="ไม่พบข้อมูลสมาชิก"
            description="ไม่มีสมาชิกตามรหัสที่ระบุในฐานข้อมูล"
            actionText="กลับหน้าสมาชิก"
            onAction={() => setLocation("/members")}
          />
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#E5E1D8] bg-[#FFFFFF] p-6 md:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#171717]">
                  แก้ไขข้อมูลสมาชิก
                </h2>
                <p className="mt-1 text-sm text-[#7A766F]">
                  สถานะปัจจุบัน: {memberStatusLabel(query.data.status)}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  deactivate.isPending || query.data.status === "inactive"
                }
                onClick={async () => {
                  const isConfirmed = await Swal.confirm(
                    "ยืนยันการปิดใช้งานสมาชิก?",
                    "คุณต้องการปิดใช้งานสมาชิกนี้หรือไม่? ข้อมูลประวัติการถวายจะยังคงอยู่แต่สมาชิกจะไม่สามารถใช้งานได้",
                    {
                      confirmButtonText: "ยืนยันปิดใช้งาน",
                      cancelButtonText: "ยกเลิก",
                      icon: "warning",
                    }
                  );
                  if (isConfirmed) {
                    deactivate.mutate({ id });
                  }
                }}
                className="min-h-11 shrink-0 rounded-xl border border-[#FFD0D0] bg-[#FFFFFF] px-4 py-2 text-sm font-bold text-[#FF5B5B] hover:bg-[#FFF0F0] transition-colors disabled:opacity-50"
              >
                ปิดใช้งาน
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#5F5B55]">
                ชื่อ-นามสกุล{" "}
                <span className="text-[#FF5B5B]" aria-hidden="true">
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
              <label className="text-sm font-semibold text-[#5F5B55]">
                โทรศัพท์
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#5F5B55]">
                อีเมล
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="text-sm font-semibold text-[#5F5B55] md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={4}
                  className={FIELD_CLASS}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={update.isPending || !isDirty}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#D95E0B] px-5 py-2 text-sm font-bold text-[#171717] disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
