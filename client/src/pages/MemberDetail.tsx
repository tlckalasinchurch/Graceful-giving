import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
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

  useEffect(() => {
    if (query.data) {
      setName(query.data.name ?? "");
      setPhone(query.data.phone ?? "");
      setEmail(query.data.email ?? "");
      setNotes(query.data.notes ?? "");
    }
  }, [query.data]);

  const update = trpc.members.update.useMutation({
    onSuccess: async () => {
      await utils.members.list.invalidate();
      await utils.members.getById.invalidate({ id });
      await Swal.success(
        "บันทึกข้อมูลสำเร็จ!",
        "อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว"
      );
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
      await Swal.success("ปิดใช้งานสำเร็จ!", "ปิดใช้งานสมาชิกเรียบร้อยแล้ว");
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
    if (!Number.isInteger(id) || id <= 0) return;
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
          <EmptyState
            title="โหลดข้อมูลสมาชิกไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่"
            actionText="ลองใหม่"
            onAction={() => query.refetch()}
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
            className="rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  แก้ไขข้อมูลสมาชิก
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  สถานะปัจจุบัน: {query.data.status}
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
                className="min-h-11 rounded-2xl border border-destructive-border bg-destructive-soft px-3 py-2 text-xs font-bold text-destructive-strong disabled:opacity-50 cursor-pointer"
              >
                ปิดใช้งาน
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
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-border p-3 font-normal text-foreground"
                />
              </label>
            </div>
            <button
              disabled={update.isPending}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-success px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {update.isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
