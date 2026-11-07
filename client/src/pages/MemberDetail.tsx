import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
} from "@/components/common/CommonUI";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { Swal } from "@/lib/sweetalert";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { friendlyErrorMessage } from "@/lib/errors";

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
      seededIdRef.current = null;
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
        friendlyErrorMessage(error, "ไม่สามารถบันทึกข้อมูลได้")
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
        friendlyErrorMessage(error, "ไม่สามารถปิดใช้งานได้")
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
          <form onSubmit={submit} className="bento-card p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 pb-4 border-b-2 border-[var(--ink)]">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                  แก้ไขข้อมูลสมาชิก
                </h1>
                <p className="mt-1 text-sm font-medium text-ink-3">
                  สถานะปัจจุบัน:{" "}
                  <span className="font-extrabold text-ink">
                    {query.data.status === "active"
                      ? "ใช้งานอยู่ (active)"
                      : query.data.status === "inactive"
                        ? "ปิดใช้งาน (inactive)"
                        : query.data.status}
                  </span>
                </p>
              </div>
              {query.data.status === "inactive" ? (
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={async () => {
                    const isConfirmed = await Swal.confirm(
                      "ยืนยันการเปิดใช้งานสมาชิก?",
                      "ต้องการเปลี่ยนสถานะสมาชิกนี้กลับเป็นใช้งานอยู่ (Active) หรือไม่?",
                      {
                        confirmButtonText: "เปิดใช้งาน",
                        cancelButtonText: "ยกเลิก",
                      }
                    );
                    if (isConfirmed) {
                      update.mutate({ id, status: "active" });
                    }
                  }}
                  className="btn-secondary min-h-11 px-4 py-2 text-xs text-brand disabled:opacity-50 cursor-pointer"
                >
                  เปิดใช้งานอีกครั้ง
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deactivate.isPending}
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
                  className="min-h-11 rounded-xl border-2 border-[var(--ink)] bg-danger/10 hover:bg-danger/15 px-4 py-2 text-xs font-extrabold text-danger shadow-[2px_2px_0_var(--ink)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ปิดใช้งาน
                </button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-extrabold text-ink-2">
                ชื่อ-นามสกุล *
                <input
                  required
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                โทรศัพท์
                <input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2">
                อีเมล
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
              <label className="text-sm font-extrabold text-ink-2 md:col-span-2">
                หมายเหตุ
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  rows={4}
                  className="neo-input mt-1.5 w-full p-3 font-medium text-ink"
                />
              </label>
            </div>
            <button
              disabled={update.isPending}
              className="btn-primary mt-5 inline-flex min-h-11 items-center gap-2 px-5 py-2 text-sm disabled:opacity-50"
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
