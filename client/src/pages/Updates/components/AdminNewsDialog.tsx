import React, { FormEvent } from "react";
import { Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, SubmitButtons } from "./updatesUtils";
import { NativeSelect } from "@/components/ui/native-select";

interface AdminNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNewsId: number | null;
  newsForm: {
    title: string;
    summary: string;
    body: string;
    category: "announcement" | "ministry" | "finance" | "pastoral";
    status: "draft" | "published" | "archived";
  };
  setNewsForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      summary: string;
      body: string;
      category: "announcement" | "ministry" | "finance" | "pastoral";
      status: "draft" | "published" | "archived";
    }>
  >;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
}

export function AdminNewsDialog({
  open,
  onOpenChange,
  editingNewsId,
  newsForm,
  setNewsForm,
  onSubmit,
  pending,
}: AdminNewsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-divider bg-card p-6 shadow-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-muted text-primary-strong">
                <Megaphone className="size-5" />
              </span>
              <div>
                <DialogTitle className="font-display text-xl font-bold text-foreground-soft">
                  {editingNewsId ? "แก้ไขข่าวสาร" : "สร้างข่าวสารใหม่"}
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground-soft">
                  สมาชิกจะเห็นประกาศนี้เมื่อสถานะเป็นเผยแพร่
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <Field label="หัวข้อข่าวสาร">
              <input
                required
                maxLength={180}
                value={newsForm.title}
                onChange={event =>
                  setNewsForm({ ...newsForm, title: event.target.value })
                }
                placeholder="เช่น เชิญร่วมอธิษฐานประจำสัปดาห์"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground-soft focus:border-primary-strong focus:outline-none"
              />
            </Field>
            <Field label="สรุปสั้น ๆ">
              <input
                required
                maxLength={280}
                value={newsForm.summary}
                onChange={event =>
                  setNewsForm({ ...newsForm, summary: event.target.value })
                }
                placeholder="ข้อความที่จะแสดงในการ์ดข่าวสาร"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground-soft focus:border-primary-strong focus:outline-none"
              />
            </Field>
            <Field label="รายละเอียด">
              <textarea
                required
                rows={5}
                value={newsForm.body}
                onChange={event =>
                  setNewsForm({ ...newsForm, body: event.target.value })
                }
                placeholder="เขียนรายละเอียดข่าวสาร..."
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground-soft focus:border-primary-strong focus:outline-none"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="หมวดหมู่">
                <NativeSelect
                  value={newsForm.category}
                  onChange={event =>
                    setNewsForm({
                      ...newsForm,
                      category: event.target.value as typeof newsForm.category,
                    })
                  }
                  className="border-border text-foreground-soft"
                >
                  <option value="announcement">ประกาศ</option>
                  <option value="ministry">พันธกิจ</option>
                  <option value="finance">การเงิน</option>
                  <option value="pastoral">การอภิบาล</option>
                </NativeSelect>
              </Field>
              <Field label="สถานะ">
                <NativeSelect
                  value={newsForm.status}
                  onChange={event =>
                    setNewsForm({
                      ...newsForm,
                      status: event.target.value as typeof newsForm.status,
                    })
                  }
                  className="border-border text-foreground-soft"
                >
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่ทันที</option>
                  <option value="archived">เก็บถาวร</option>
                </NativeSelect>
              </Field>
            </div>
          </div>
          <SubmitButtons
            pending={pending}
            onCancel={() => onOpenChange(false)}
            label={editingNewsId ? "บันทึกการแก้ไข" : "บันทึกข่าวสาร"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
