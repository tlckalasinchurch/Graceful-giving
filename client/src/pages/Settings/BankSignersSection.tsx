import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Swal } from "@/lib/sweetalert";
import { toast } from "sonner";
import { AlertCircle, UserCheck } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";

export function BankSignersSection() {
  const utils = trpc.useUtils();
  const [selectedSignerUserId, setSelectedSignerUserId] = useState<number | "">(
    ""
  );

  const signersQuery = trpc.bankSigners.list.useQuery(undefined, {
    retry: false,
  });

  const usersQuery = trpc.auth.listUsers.useQuery(undefined, {
    retry: false,
  });

  const addSignerMutation = trpc.bankSigners.add.useMutation({
    onSuccess: () => {
      toast.success("เพิ่มผู้มีอำนาจลงนามเรียบร้อยแล้ว");
      setSelectedSignerUserId("");
      void utils.bankSigners.list.invalidate();
      void utils.auth.me.invalidate();
    },
    onError: err => {
      toast.error(err.message || "ไม่สามารถเพิ่มผู้มีอำนาจลงนามได้");
    },
  });

  const removeSignerMutation = trpc.bankSigners.remove.useMutation({
    onSuccess: () => {
      toast.success("นำผู้มีอำนาจลงนามออกเรียบร้อยแล้ว");
      void utils.bankSigners.list.invalidate();
      void utils.auth.me.invalidate();
    },
    onError: err => {
      toast.error(err.message || "ไม่สามารถนำผู้มีอำนาจลงนามออกได้");
    },
  });

  const setRequiredSignerMutation = trpc.bankSigners.setRequired.useMutation({
    onSuccess: () => {
      toast.success("ตั้งเป็นผู้ที่ต้องลงนามทุกครั้งเรียบร้อยแล้ว");
      void utils.bankSigners.list.invalidate();
    },
    onError: err => {
      toast.error(err.message || "ไม่สามารถตั้งผู้ลงนามได้");
    },
  });

  const signers = signersQuery.data ?? [];
  const hasRequired = signers.some(s => s.isRequired);
  const hasAtLeastTwo = signers.length >= 2;
  const showWarning = !hasRequired || !hasAtLeastTwo;

  const availableUsers = useMemo(() => {
    const currentSignerIds = new Set(signers.map(s => s.userId));
    return (usersQuery.data ?? []).filter(u => !currentSignerIds.has(u.id));
  }, [usersQuery.data, signers]);

  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 space-y-6 fintech-card">
      <div className="space-y-1.5">
        <h3 className="display text-base font-bold text-ink flex items-center gap-2.5">
          <span className="size-9 rounded-2xl bg-tile-lilac text-brand-ink flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </span>
          ผู้มีอำนาจลงนามบัญชีธนาคาร
        </h3>
        <p className="text-xs text-ink-2 leading-relaxed">
          ผู้มีอำนาจลงนามถอนเงินจากบัญชีธนาคารของคริสตจักร
          การอนุมัติเบิกจ่ายต้องมีผู้ลงนามที่ต้องลงนามทุกครั้ง
          ร่วมกับผู้ลงนามอื่นอย่างน้อย 1 คน (รวมอย่างน้อย 2 คน)
        </p>
      </div>

      {/* Warning when signers condition is incomplete */}
      {showWarning && (
        <div className="rounded-2xl bg-tile-sand p-4 text-xs text-tile-sand-ink flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">เงื่อนไขการลงนามยังไม่สมบูรณ์</p>
            <p className="mt-0.5">
              ยังอนุมัติคำขอเบิกไม่ได้ จนกว่าจะมีผู้ลงนามที่ต้องลงนามทุกครั้ง
              และรวมอย่างน้อย 2 คน
            </p>
          </div>
        </div>
      )}

      {/* Signers list */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-ink-2">
          รายชื่อผู้มีอำนาจลงนามปัจจุบัน ({signers.length} คน)
        </h4>

        {signersQuery.isLoading ? (
          <div className="py-4 text-center text-xs text-ink-3">
            กำลังโหลด...
          </div>
        ) : signers.length === 0 ? (
          <p className="text-xs text-ink-3 py-2">
            ยังไม่มีรายชื่อผู้มีอำนาจลงนาม
          </p>
        ) : (
          <div className="divide-y divide-line/60 border border-line rounded-2xl overflow-hidden bg-paper/50">
            {signers.map(s => (
              <div
                key={s.userId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-tile-lilac flex items-center justify-center font-bold text-xs text-brand-ink">
                    {s.name?.slice(0, 1) || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">
                        {s.name || `ผู้ใช้ #${s.userId}`}
                      </span>
                      {s.isRequired && (
                        <span className="rounded-full bg-tile-mint px-2.5 py-0.5 text-[11px] font-bold text-tile-mint-ink">
                          ต้องลงนามทุกครั้ง
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-3">รหัสผู้ใช้ #{s.userId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!s.isRequired && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await Swal.confirm(
                          "เปลี่ยนผู้ที่ต้องลงนามทุกครั้ง",
                          `ต้องการตั้งให้ "${s.name || `ผู้ใช้ #${s.userId}`}" เป็นผู้ลงนามที่ต้องลงนามทุกครั้งใช่หรือไม่?`,
                          "ยืนยัน"
                        );
                        if (ok) {
                          setRequiredSignerMutation.mutate({
                            userId: s.userId,
                          });
                        }
                      }}
                      disabled={setRequiredSignerMutation.isPending}
                      className="px-3.5 py-2 rounded-2xl border border-line bg-surface hover:bg-tile-lilac/50 text-xs font-bold text-ink-2 transition-colors disabled:opacity-50"
                    >
                      ตั้งเป็นผู้ที่ต้องลงนามทุกครั้ง
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await Swal.confirm(
                        "นำผู้ลงนามออก",
                        `ต้องการนำ "${s.name || `ผู้ใช้ #${s.userId}`}" ออกจากรายชื่อผู้มีอำนาจลงนามใช่หรือไม่?`,
                        "นำออก"
                      );
                      if (ok) {
                        removeSignerMutation.mutate({ userId: s.userId });
                      }
                    }}
                    disabled={removeSignerMutation.isPending}
                    className="px-3.5 py-2 rounded-2xl bg-tile-rose hover:bg-rose-500/25 text-tile-rose-ink text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    นำออก
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new signer */}
      <div className="pt-4 border-t border-line/60 space-y-2.5">
        <h4 className="text-xs font-bold text-ink-2">เพิ่มผู้มีอำนาจลงนาม</h4>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <NativeSelect
              value={selectedSignerUserId}
              onChange={e =>
                setSelectedSignerUserId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              className="w-full text-xs rounded-2xl"
            >
              <option value="">-- เลือกผู้ใช้เพื่อเพิ่มเป็นผู้ลงนาม --</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || `ผู้ใช้ #${u.id}`} (
                  {u.churchRole || u.role || "สมาชิก"})
                </option>
              ))}
            </NativeSelect>
          </div>
          <button
            type="button"
            disabled={!selectedSignerUserId || addSignerMutation.isPending}
            onClick={() => {
              if (typeof selectedSignerUserId === "number") {
                addSignerMutation.mutate({
                  userId: selectedSignerUserId,
                });
              }
            }}
            className="min-h-11 px-5 py-2 rounded-2xl bg-brand hover:bg-brand-ink disabled:opacity-50 text-black text-xs font-bold transition-all shadow-sm shrink-0"
          >
            {addSignerMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่มผู้ลงนาม"}
          </button>
        </div>
      </div>
    </div>
  );
}
