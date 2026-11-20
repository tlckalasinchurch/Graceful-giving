// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import {
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  DuplicateEntryError,
  approveLineSlip,
  countRecentManualSlips,
  countRecentSystemRejectedSlips,
  createAuditLog,
  createManualSlip,
  createNoSlipEntry,
  getLineInboxStats,
  getLineSlipById,
  getMyManualSlip,
  linkLineUserToMember,
  listFinanceAccounts,
  listLineSlips,
  listMyManualSlips,
  rejectLineSlip,
  rescanLineSlip,
  updateLineSlipReview,
} from "../db";
import { toDonorSlipStatus } from "../line/donorSlipStatus";
import { runWorkerBatch } from "../line/processWorker";
import {
  SlipImageError,
  decodeSlipImage,
} from "../line/slipImage";
import { extractSlipData } from "../line/slipOcr";
import { toSlipReading } from "../line/slipReading";
import {
  SLIP_CHECK_WAIT_MS,
  SLIP_READ_TIMEOUT_MS,
  allowSlipRead,
  assertSplitSound,
  drainWorkerWithin,
  financeProcedure,
  notifyDonorOfDecision,
  notifyFinanceOfNewEntry,
  offeringCategory,
  splitItems,
  splitLine,
} from "./common";
import { type DonorSlipStatus } from "@shared/donorSlip";
import {
  MAX_GIVING_AMOUNT,
  MAX_SLIPS_PER_DAY,
  TRANSFER_DATE_MESSAGE,
  checkTransferDate,
} from "@shared/givingLimits";
import { MAX_SPLIT_LINES } from "@shared/givingSplit";
import { UNREADABLE_SLIP } from "@shared/slipReading";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const givingInboxRouter = router({
    /**
     * List slips in inbox with optional status filter.
     * Accessible by TREASURER and SUPER_ADMIN.
     */
    list: financeProcedure
      .input(
        z
          .object({
            status: z
              .enum([
                "all",
                "pending",
                "processing",
                "extracted",
                "needs_review",
                "matched",
                "duplicate",
                "approved",
                "rejected",
                "failed",
              ])
              .optional(),
            memberId: z.number().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listLineSlips(DEFAULT_CHURCH_ID, {
          status: input?.status,
          memberId: input?.memberId,
          limit: input?.limit,
          offset: input?.offset,
        });
      }),

    /**
     * Dedicated worker trigger (called by Refresh button, not on every passive read)
     */
    drainWorker: financeProcedure.mutation(async () => {
      const result = await runWorkerBatch().catch(err => {
        console.warn("[GivingInbox] Worker error:", err);
        return { ok: false, processed: 0, errors: 1 };
      });
      return result;
    }),

    /**
     * Get single slip detail with AI data and signed image URL.
     */
    getById: financeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const slip = await getLineSlipById(input.id, DEFAULT_CHURCH_ID);
        if (!slip) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `ไม่พบสลิป #${input.id}`,
          });
        }
        return slip;
      }),

    /**
     * Overview counts by status for badges and dashboard.
     */
    stats: financeProcedure.query(async () => {
      return await getLineInboxStats(DEFAULT_CHURCH_ID);
    }),

    /**
     * Approve slip and create Offering in ledger atomically.
     * Prevents double-approval via database transaction with row locking.
     */
    approve: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          fundId: z.number(),
          amount: z.number().positive("ยอดเงินต้องมากกว่า 0"),
          memberId: z.number().nullable().optional(),
          donorName: z.string().nullable().optional(),
          category: offeringCategory.optional(),
          receiptDate: z.coerce.date().optional(),
          reviewNote: z.string().optional(),
          confirmedBankCheck: z.boolean().optional(),
          /** One line, or two or more to split the transfer by category. */
          items: z.array(splitLine).min(1).max(MAX_SPLIT_LINES).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await approveLineSlip({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            approvedBy: ctx.user.id,
            fundId: input.fundId,
            amount: input.amount,
            memberId: input.memberId,
            donorName: input.donorName,
            category: input.category,
            receiptDate: input.receiptDate,
            reviewNote: input.reviewNote,
            confirmedBankCheck: input.confirmedBankCheck,
            items: input.items,
          });
          await notifyDonorOfDecision({
            userId: result.submittedByUserId,
            decision: "approved",
            amount: result.amount,
          });
          return result;
        } catch (err: any) {
          const msg = err?.message || "เกิดข้อผิดพลาดในการอนุมัติสลิป";
          if (msg.includes("ได้รับการอนุมัติไปแล้ว")) {
            throw new TRPCError({ code: "CONFLICT", message: msg });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
      }),

    /**
     * Reject a slip with reason.
     */
    reject: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          reason: z.string().min(1, "กรุณาระบุเหตุผลการปฏิเสธสลิป"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await rejectLineSlip({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            reviewedBy: ctx.user.id,
            reason: input.reason,
          });
          await notifyDonorOfDecision({
            userId: result.submittedByUserId,
            decision: "rejected",
            reason: input.reason,
          });
          return result;
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected =
            msg.includes("กรุณาระบุ") ||
            msg.includes("ไม่พบสลิป") ||
            msg.includes("ไม่สามารถปฏิเสธ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected ? msg : "เกิดข้อผิดพลาดในการปฏิเสธสลิป",
          });
        }
      }),

    /**
     * Update review fields (fund, member, adjusted amount, notes) before approval.
     */
    updateReview: financeProcedure
      .input(
        z.object({
          slipId: z.number(),
          fundId: z.number().nullable().optional(),
          matchedMemberId: z.number().nullable().optional(),
          matchedMemberName: z.string().nullable().optional(),
          approvedAmount: z.number().nullable().optional(),
          reviewNote: z.string().nullable().optional(),
          status: z.enum(["extracted", "needs_review", "matched"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await updateLineSlipReview({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            fundId: input.fundId,
            matchedMemberId: input.matchedMemberId,
            matchedMemberName: input.matchedMemberName,
            approvedAmount: input.approvedAmount,
            reviewNote: input.reviewNote,
            status: input.status,
          });
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected =
            msg.includes("ไม่พบสลิป") || msg.includes("ไม่สามารถแก้ไข");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected ? msg : "เกิดข้อผิดพลาดในการอัปเดตข้อมูลสลิป",
          });
        }
      }),

    /**
     * Link a LINE User ID to a member profile and auto-match their pending slips.
     */
    linkMember: financeProcedure
      .input(
        z.object({
          lineUserId: z.string().min(1, "LINE User ID ไม่ถูกต้อง"),
          memberId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await linkLineUserToMember(
            DEFAULT_CHURCH_ID,
            input.lineUserId,
            input.memberId,
            ctx.user.id
          );
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected = msg.includes("ไม่พบ") || msg.includes("ไม่สามารถ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: isExpected
              ? msg
              : "เกิดข้อผิดพลาดในการเชื่อมโยงสมาชิกกับ LINE",
          });
        }
      }),

    /**
     * Manual upload of slip image (e.g. from staff PC or test slip).
     */
    uploadSlip: financeProcedure
      .input(
        z.object({
          base64Data: z.string().min(1, "กรุณาเลือกไฟล์ภาพสลิป"),
          donorName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }

        let slip: Awaited<ReturnType<typeof createManualSlip>>;
        try {
          slip = await createManualSlip({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            donorName: input.donorName,
            imageBuffer: image.buffer,
            contentType: image.contentType,
            extension: image.extension,
          });
        } catch (err) {
          console.error("[uploadSlip] Could not store slip:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถอัปโหลดสลิปได้ กรุณาลองใหม่อีกครั้ง",
          });
        }

        // Run worker batch immediately to extract data with AI
        await runWorkerBatch().catch(err =>
          console.warn("[Manual upload] Worker error:", err)
        );

        return { success: true, slipId: slip.id };
      }),

    /**
     * Any signed-in member submits a transfer slip from the giving station.
     * It only queues a pending slip with the amount, category and fund the
     * donor declared. Nothing is credited until a treasurer approves it.
     */
    submitSlip: protectedProcedure
      .input(
        z.object({
          base64Data: z.string().min(1, "กรุณาแนบรูปสลิป"),
          amount: z
            .number()
            .positive("กรุณาระบุจำนวนเงินที่ถวาย")
            .max(MAX_GIVING_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
          category: offeringCategory,
          /** Set when one transfer pays for several categories. */
          items: splitItems.optional(),
          fundId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(120).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertSplitSound(input.items, input.amount);
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }

        if (input.fundId !== undefined) {
          const funds = await listFinanceAccounts();
          if (!funds.some(f => f.id === input.fundId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "ไม่พบกองทุนที่เลือก",
            });
          }
        }

        const recent = await countRecentManualSlips(
          ctx.user.id,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        if (recent >= MAX_SLIPS_PER_DAY) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "ส่งสลิปครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้",
          });
        }

        let slip: Awaited<ReturnType<typeof createManualSlip>>;
        try {
          slip = await createManualSlip({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            // The LINE name stays as the sender. The typed name is kept apart.
            donorName: ctx.user.name || undefined,
            typedDonorName: input.donorName || undefined,
            imageBuffer: image.buffer,
            contentType: image.contentType,
            extension: image.extension,
            declared: {
              amount: input.amount.toFixed(2),
              category: input.items?.[0].category ?? input.category,
              fundId: input.fundId ?? null,
              items: input.items ?? null,
            },
          });
        } catch (err) {
          console.error("[submitSlip] Could not store slip:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถบันทึกสลิปได้ กรุณาลองใหม่อีกครั้ง",
          });
        }

        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "line_slip",
          entityId: slip.id,
          metadata: {
            declaredAmount: input.amount,
            declaredCategory: input.items?.[0].category ?? input.category,
            declaredItems: input.items ?? null,
            declaredFundId: input.fundId ?? null,
          },
        });
        await notifyFinanceOfNewEntry({
          slipId: slip.id,
          from: ctx.user.name ?? "สมาชิก",
          amount: input.amount,
          kind: "slip",
        });

        // Read the slip now so the donor learns at once whether the amount on
        // the slip matches the one they chose. If the reading is not done in
        // time, the job stays queued and the donor sees "checking".
        await drainWorkerWithin(SLIP_CHECK_WAIT_MS);
        const row = await getMyManualSlip(slip.id, ctx.user.id);
        const check = row
          ? toDonorSlipStatus(row)
          : ({
              state: "checking",
              message: "กำลังตรวจสอบสลิป",
              slipAmount: null,
            } satisfies DonorSlipStatus);

        // How many slips the system has turned away for this donor in 24 hours.
        // The donor sees it, so they know when a person will take over.
        const failedAttempts = await countRecentSystemRejectedSlips(
          `manual-${ctx.user.id}`,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        return {
          success: true,
          slipId: slip.id,
          check,
          failedAttempts,
        } as const;
      }),

    /**
     * A member sends the details of a transfer without a slip image. The entry
     * waits in the review queue. Nothing is credited until a treasurer checks
     * it against the bank and approves.
     */
    submitWithoutSlip: protectedProcedure
      .input(
        z.object({
          amount: z
            .number()
            .positive("กรุณาระบุจำนวนเงินที่ถวาย")
            .max(MAX_GIVING_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
          category: offeringCategory,
          items: splitItems.optional(),
          fundId: z.number().int().positive().optional(),
          donorName: z
            .string()
            .trim()
            .min(2, "กรุณาระบุชื่อผู้ถวาย อย่างน้อย 2 ตัวอักษร")
            .max(120),
          transferDate: z.coerce.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertSplitSound(input.items, input.amount);
        const problem = checkTransferDate(input.transferDate);
        if (problem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: TRANSFER_DATE_MESSAGE[problem],
          });
        }

        if (input.fundId !== undefined) {
          const funds = await listFinanceAccounts();
          if (!funds.some(f => f.id === input.fundId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "ไม่พบกองทุนที่เลือก",
            });
          }
        }

        const recent = await countRecentManualSlips(
          ctx.user.id,
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        if (recent >= MAX_SLIPS_PER_DAY) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "ส่งรายการครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้",
          });
        }

        let created: Awaited<ReturnType<typeof createNoSlipEntry>>;
        try {
          created = await createNoSlipEntry({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            donorName: input.donorName,
            amount: input.amount.toFixed(2),
            category: input.items?.[0].category ?? input.category,
            items: input.items ?? null,
            fundId: input.fundId ?? null,
            transferDate: input.transferDate,
          });
        } catch (err) {
          if (err instanceof DuplicateEntryError) {
            throw new TRPCError({ code: "CONFLICT", message: err.message });
          }
          console.error("[submitWithoutSlip] Could not store entry:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง",
          });
        }

        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "line_slip",
          entityId: created.slip.id,
          metadata: {
            source: "no_slip",
            declaredAmount: input.amount,
            declaredCategory: input.items?.[0].category ?? input.category,
            declaredItems: input.items ?? null,
            declaredFundId: input.fundId ?? null,
            declaredDate: input.transferDate.toISOString().slice(0, 10),
            possibleDuplicate: created.warning !== null,
          },
        });
        await notifyFinanceOfNewEntry({
          slipId: created.slip.id,
          from: ctx.user.name ?? "สมาชิก",
          amount: input.amount,
          kind: "no_slip",
        });

        return {
          success: true,
          slipId: created.slip.id,
          check: toDonorSlipStatus(created.slip),
          failedAttempts: 0,
        } as const;
      }),

    /**
     * Reads a slip the moment the donor attaches it, so the form can fill in
     * the amount, the name and the date. Nothing is stored and nothing is
     * credited. A reading that fails or is slow returns "unreadable", never an
     * error, so the donor can always fill the form by hand.
     */
    readSlip: protectedProcedure
      .input(z.object({ base64Data: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        let image: ReturnType<typeof decodeSlipImage>;
        try {
          image = decodeSlipImage(input.base64Data);
        } catch (err) {
          if (err instanceof SlipImageError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }
        if (!allowSlipRead(ctx.user.id)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "อ่านสลิปบ่อยเกินไป กรุณากรอกข้อมูลเองหรือลองใหม่ในอีกสักครู่",
          });
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const dataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;
          const extraction = await Promise.race([
            extractSlipData(dataUrl),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error("slip reading timed out")),
                SLIP_READ_TIMEOUT_MS
              );
            }),
          ]);
          return toSlipReading(extraction);
        } catch (err) {
          console.warn("[readSlip] Could not read the slip:", err);
          return UNREADABLE_SLIP;
        } finally {
          clearTimeout(timer);
        }
      }),

    /** The caller's own recent slips and what became of them. */
    mySlips: protectedProcedure.query(async ({ ctx }) => {
      const rows = await listMyManualSlips(ctx.user.id, 10);
      return rows.map(row => ({
        id: row.id,
        createdAt: row.createdAt,
        declaredAmount:
          row.declaredAmount === null ? null : Number(row.declaredAmount),
        declaredCategory: row.declaredCategory,
        check: toDonorSlipStatus(row),
      }));
    }),

    /**
     * Trigger immediate AI re-scan on an existing slip.
     */
    rescan: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          await rescanLineSlip(input.id, DEFAULT_CHURCH_ID);

          // Run worker batch immediately with Gemini AI
          await runWorkerBatch().catch(err =>
            console.warn("[Rescan] Worker error:", err)
          );

          return { success: true };
        } catch (err: any) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const isExpected = msg.includes("ไม่พบ") || msg.includes("ไม่สามารถ");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: isExpected ? msg : "ไม่สามารถสแกนสลิปซ้ำได้",
          });
        }
      }),
});
