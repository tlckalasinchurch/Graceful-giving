import React, { FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, SubmitButtons } from "./updatesUtils";
import { NativeSelect } from "@/components/ui/native-select";

interface AdminEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEventId: number | null;
  eventForm: {
    title: string;
    summary: string;
    description: string;
    startsAt: string;
    endsAt: string;
    location: string;
    registrationUrl: string;
    status: "draft" | "published" | "cancelled";
  };
  setEventForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      summary: string;
      description: string;
      startsAt: string;
      endsAt: string;
      location: string;
      registrationUrl: string;
      status: "draft" | "published" | "cancelled";
    }>
  >;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
}

export function AdminEventDialog({
  open,
  onOpenChange,
  editingEventId,
  eventForm,
  setEventForm,
  onSubmit,
  pending,
}: AdminEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-modal max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <form onSubmit={onSubmit}>
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-brand/40 bg-accent text-accent-foreground">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <DialogTitle className="font-display text-xl font-extrabold text-ink">
                  {editingEventId ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่"}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-ink-2">
                  กิจกรรมจะปรากฏในปฏิทินของสมาชิก
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <Field label="ชื่อกิจกรรม">
              <input
                required
                maxLength={180}
                value={eventForm.title}
                onChange={event =>
                  setEventForm({ ...eventForm, title: event.target.value })
                }
                placeholder="เช่น ค่ายครอบครัวบ้านแห่งพระคุณ"
                className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
              />
            </Field>
            <Field label="สรุปสั้น ๆ">
              <input
                required
                maxLength={280}
                value={eventForm.summary}
                onChange={event =>
                  setEventForm({ ...eventForm, summary: event.target.value })
                }
                placeholder="ข้อความสั้นสำหรับการ์ดกิจกรรม"
                className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
              />
            </Field>
            <Field label="รายละเอียด">
              <textarea
                required
                rows={4}
                value={eventForm.description}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    description: event.target.value,
                  })
                }
                placeholder="รายละเอียดกิจกรรม..."
                className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="เริ่มวันที่และเวลา">
                <input
                  required
                  type="datetime-local"
                  value={eventForm.startsAt}
                  onChange={event =>
                    setEventForm({ ...eventForm, startsAt: event.target.value })
                  }
                  className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
                />
              </Field>
              <Field label="สิ้นสุด (ถ้ามี)">
                <input
                  type="datetime-local"
                  value={eventForm.endsAt}
                  onChange={event =>
                    setEventForm({ ...eventForm, endsAt: event.target.value })
                  }
                  className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="สถานที่">
                <input
                  value={eventForm.location}
                  onChange={event =>
                    setEventForm({ ...eventForm, location: event.target.value })
                  }
                  placeholder="เช่น อาคารคริสตจักร"
                  className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
                />
              </Field>
              <Field label="ลิงก์ลงทะเบียน">
                <input
                  type="url"
                  value={eventForm.registrationUrl}
                  onChange={event =>
                    setEventForm({
                      ...eventForm,
                      registrationUrl: event.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="neo-input w-full px-3.5 py-2.5 text-sm font-medium text-ink"
                />
              </Field>
            </div>
            <Field label="สถานะ">
              <NativeSelect
                value={eventForm.status}
                onChange={event =>
                  setEventForm({
                    ...eventForm,
                    status: event.target.value as typeof eventForm.status,
                  })
                }
              >
                <option value="draft">ฉบับร่าง</option>
                <option value="published">เผยแพร่ทันที</option>
                <option value="cancelled">ยกเลิก</option>
              </NativeSelect>
            </Field>
          </div>
          <SubmitButtons
            pending={pending}
            onCancel={() => onOpenChange(false)}
            label={editingEventId ? "บันทึกการแก้ไข" : "บันทึกกิจกรรม"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
