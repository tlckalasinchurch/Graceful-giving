import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { toast } from "sonner";

/** Lets a signed-in person choose their own password. */
export function ChangePasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSave = password.length >= 8 && password === confirm && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    toast.success("เปลี่ยนรหัสผ่านแล้ว");
    setPassword("");
    setConfirm("");
  };

  return (
    <section className="rounded-2xl border border-[#E7DCC8] bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
      <h3 className="text-base font-bold text-[#171311]">เปลี่ยนรหัสผ่าน</h3>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#51443A]">
          รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E7DCC8] px-3 py-2 text-sm text-[#171311] focus:outline-none focus:ring-2 focus:ring-[#C94F16]/20"
          />
        </label>
        <label className="text-xs font-semibold text-[#51443A]">
          ยืนยันรหัสผ่านใหม่
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E7DCC8] px-3 py-2 text-sm text-[#171311] focus:outline-none focus:ring-2 focus:ring-[#C94F16]/20"
          />
          {mismatch && (
            <span className="mt-1 block text-red-600">รหัสผ่านไม่ตรงกัน</span>
          )}
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-xl bg-[#C94F16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B04412] disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      </form>
    </section>
  );
}
