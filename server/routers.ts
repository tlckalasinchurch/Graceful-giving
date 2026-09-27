import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  approveWithdrawal,
  createBudgetPlan,
  deleteBudgetPlan,
  getBudgetPlanById,
  listBudgetPlans,
  updateBudgetPlan,
  createChurchEvent,
  createChurchNews,
  createAuditLog,
  listAuditLogs,
  createNotification,
  createExpense,
  createFinanceAccount,
  createOffering,
  createWithdrawalRequest,
  DEFAULT_CHURCH_ID,
  deleteChurchEvent,
  deleteChurchNews,
  createMember,
  createMinistry,
  disburseWithdrawal,
  getChurchProfile,
  getExpenseById,
  getFinancialReportData,
  getFinancialReportSummary,
  getFinancialSummary,
  getMonthlyStats,
  getOfferingById,
  getMemberById,
  getMinistryById,
  listAllChurchEvents,
  listAllChurchNews,
  listExpenses,
  listFinanceAccounts,
  listOfferings,
  listMembers,
  listMinistries,
  listNotifications,
  listPublishedChurchEvents,
  listPublishedChurchNews,
  listWithdrawalRequests,
  markSetupCompleted,
  updateExpense,
  updateOffering,
  voidExpense,
  voidOffering,
  updateMember,
  updateMinistry,
  archiveMinistry,
  deactivateMember,
  getAllUsers,
  updateUserProfile,
  markNotificationRead,
  markAllNotificationsRead,
  updateChurchEvent,
  updateChurchEventStatus,
  updateChurchNews,
  updateChurchNewsStatus,
  updateUserChurchRole,
  upsertChurchProfile,
  listCountingSessions,
  getCountingSession,
  getCountingSessionDetail,
  createCountingSession,
  setCountingSessionStatus,
  addOfferingEnvelope,
  updateOfferingEnvelope,
  deleteOfferingEnvelope,
  setCashCount,
  addSessionDeduction,
  approveSessionDeduction,
  deleteSessionDeduction,
  addBankRecord,
  matchBankRecordToPassbook,
  addSessionDocument,
  postCountingSession,
  deleteCountingSession,
  resetCountingSession,
  listLineSlips,
  getLineSlipById,
  approveLineSlip,
  rejectLineSlip,
  updateLineSlipReview,
  linkLineUserToMember,
  getLineInboxStats,
  createManualSlip,
  rescanLineSlip,
} from "./db";
import { runWorkerBatch } from "./line/processWorker";
import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import type { CountingStatus } from "@shared/counting";
import { canTransition, isEditable } from "@shared/counting";
import {
  EXPENSE_CATEGORY_IDS,
  OFFERING_CATEGORY_IDS,
} from "@shared/categories";

// ─── Permission helpers ────────────────────────────────────────────────────────

function getUserRoles(user: User): string[] {
  const list: string[] = [];
  if (user.churchRoles) {
    list.push(
      ...user.churchRoles
        .split(",")
        .map(r => r.trim())
        .filter(Boolean)
    );
  }
  if (user.churchRole && !list.includes(user.churchRole)) {
    list.push(user.churchRole);
  }
  return list.length > 0 ? list : ["MEMBER"];
}

function hasAnyRole(user: User, ...roles: string[]): boolean {
  if (user.role === "admin") return true;
  const userRoles = getUserRoles(user);
  return roles.some(r => userRoles.includes(r));
}

function canManageFinance(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}

function canViewDonorNames(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}

function canApproveWithdrawals(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER");
}

function canManageChurchSettings(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR");
}

/** Deacons oversee ministry and service work alongside church leadership. */
function canManageMinistries(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "DEACON");
}

/**
 * Budget plans are set by the people who both approve and pay for spending:
 * the treasurer, the pastor and the super admin. This matches the /budgets
 * entry in client/src/lib/routeAccess.ts.
 */
function canManageBudgets(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "PASTOR");
}

/** COUNTER records the count; finance roles may also record it. */
function canCountOfferings(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "TREASURER", "COUNTER");
}

/** Verifying, banking and posting stay with the treasurer. */
function canVerifyCount(user: User): boolean {
  return canManageFinance(user);
}

/** A deduction from the offering bag needs a leader's approval. */
function canApproveDeduction(user: User): boolean {
  return hasAnyRole(user, "SUPER_ADMIN", "PASTOR", "TREASURER");
}

// ─── Shared Procedures ────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.churchRole !== "SUPER_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้ดูแลระบบเท่านั้น",
    });
  }
  return next();
});

const financeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageFinance(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์จัดการข้อมูลการเงิน",
    });
  }
  return next();
});

const churchLeaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageChurchSettings(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้นำคริสตจักรเท่านั้น",
    });
  }
  return next();
});

const ministryProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageMinistries(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะผู้นำคริสตจักรและมัคนายกเท่านั้น",
    });
  }
  return next();
});

const budgetProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canManageBudgets(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะเหรัญญิก ศิษยาภิบาล หรือผู้ดูแลระบบเท่านั้น",
    });
  }
  return next();
});

// ─── Zod Enums ────────────────────────────────────────────────────────────────

const newsCategory = z.enum([
  "announcement",
  "ministry",
  "finance",
  "pastoral",
]);
const newsStatus = z.enum(["draft", "published", "archived"]);
const eventStatus = z.enum(["draft", "published", "cancelled"]);
// Built from the shared category source of truth, so the API can never accept
// a value the database enum would reject, or reject one the UI offers.
const offeringCategory = z.enum(OFFERING_CATEGORY_IDS);
const expenseCategory = z.enum(EXPENSE_CATEGORY_IDS);
const expenseStatus = z.enum(["draft", "approved", "paid"]);
const paymentMethod = z.enum(["cash", "transfer", "check"]);
const churchRoleEnum = z.enum([
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
  "MEMBER",
]);
const budgetYear = z.number().int().min(2000).max(2100);
const budgetMonth = z.number().int().min(1).max(12);
const reportDateRange = z
  .object({ fromDate: z.coerce.date(), toDate: z.coerce.date() })
  .refine(data => data.fromDate <= data.toDate, {
    message: "วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด",
    path: ["toDate"],
  });

function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ─── Counting session helpers ─────────────────────────────────────────────────

async function requireCountingSession(id: number) {
  const session = await getCountingSession(id);
  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบรอบนับเงินถวาย",
    });
  }
  return session;
}

/** Counters may only change the count sheet and envelopes while counting. */
function assertCountEditable(status: CountingStatus) {
  if (!isEditable(status)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "รอบนี้ส่งนับแล้ว ต้องส่งกลับไปแก้ไขก่อนจึงจะบันทึกได้",
    });
  }
}

function assertCanCount(user: User) {
  if (!canCountOfferings(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "คุณไม่มีสิทธิ์บันทึกการนับเงินถวาย",
    });
  }
}

function assertCanVerify(user: User) {
  if (!canVerifyCount(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "เฉพาะเหรัญญิกหรือผู้ดูแลระบบเท่านั้น",
    });
  }
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      const roles = getUserRoles(user);
      return {
        ...user,
        roles,
      };
    }),
    listUsers: churchLeaderProcedure.query(async () => {
      return await getAllUsers();
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(180).optional(),
          avatarUrl: z.string().nullable().optional(),
          phone: z.string().max(40).nullable().optional(),
          department: z.string().max(120).nullable().optional(),
          bio: z.string().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        await createAuditLog({
          churchId: "default",
          userId: ctx.user.id,
          action: "update_profile",
          entity: "user",
          entityId: ctx.user.id,
          metadata: { fields: Object.keys(input) },
        });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /** Set the church role of a user (SUPER_ADMIN only) */
    setChurchRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          churchRole: churchRoleEnum.nullable(),
          churchRoles: z.array(churchRoleEnum).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const roles =
          input.churchRoles || (input.churchRole ? [input.churchRole] : null);
        await updateUserChurchRole(input.userId, input.churchRole, roles);
        await createAuditLog({
          churchId: "default",
          userId: ctx.user.id,
          action: "update_user_role",
          entity: "user",
          entityId: input.userId,
          metadata: {
            assignedRole: input.churchRole,
            assignedRoles: roles,
            updatedBy: ctx.user.name || ctx.user.email,
          },
        });
        return { success: true } as const;
      }),
  }),

  // ── Church Profile ──────────────────────────────────────────────────────────
  church: router({
    getProfile: protectedProcedure.query(async () => {
      return await getChurchProfile();
    }),
    updateProfile: churchLeaderProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          address: z.string().trim().max(1000).optional(),
          phone: z.string().trim().max(20).optional(),
          email: z.string().email().max(320).optional().or(z.literal("")),
          website: z.string().url().max(500).optional().or(z.literal("")),
          pastorName: z.string().trim().max(120).optional(),
          assistantPastorName: z.string().trim().max(120).optional(),
          treasurerName: z.string().trim().max(120).optional(),
          bankName: z.string().trim().max(120).optional(),
          bankAccount: z.string().trim().max(30).optional(),
          bankAccountName: z.string().trim().max(120).optional(),
          fiscalYearStartMonth: z.number().int().min(1).max(12).default(1),
          motto: z.string().trim().max(280).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await upsertChurchProfile({ ...input, churchId: DEFAULT_CHURCH_ID });
        return { success: true } as const;
      }),
    completeSetup: churchLeaderProcedure.mutation(async () => {
      await markSetupCompleted();
      return { success: true } as const;
    }),
  }),

  // ── Finance Summary ─────────────────────────────────────────────────────────
  finance: router({
    summary: protectedProcedure.query(async () => {
      return await getFinancialSummary();
    }),
    monthlyStats: protectedProcedure
      .input(
        z
          .object({ months: z.number().int().min(1).max(24).default(6) })
          .optional()
      )
      .query(async ({ input }) => {
        return await getMonthlyStats(DEFAULT_CHURCH_ID, input?.months ?? 6);
      }),
    accounts: protectedProcedure.query(async () => {
      return await listFinanceAccounts();
    }),
    createAccount: financeProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          type: z
            .enum([
              "general",
              "tithe",
              "mission",
              "building",
              "welfare",
              "special",
            ])
            .default("general"),
          description: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createFinanceAccount({
          ...input,
          churchId: DEFAULT_CHURCH_ID,
        });
        return { id };
      }),
  }),

  // ── Offerings ───────────────────────────────────────────────────────────────
  offerings: router({
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(200).default(50),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const showDonorNames = canViewDonorNames(ctx.user);
        return await listOfferings(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          showDonorNames,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return await getOfferingById(
          input.id,
          DEFAULT_CHURCH_ID,
          canViewDonorNames(ctx.user)
        );
      }),
    create: financeProcedure
      .input(
        z.object({
          amount: z.number().positive(),
          category: offeringCategory.default("general"),
          fundId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(120).optional(),
          receiptDate: z.coerce.date().optional(),
          method: paymentMethod.default("cash"),
          reference: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createOffering({
          amount: input.amount.toFixed(2),
          category: input.category,
          fundId: input.fundId ?? null,
          donorName: input.donorName ?? null,
          receiptDate: input.receiptDate ?? new Date(),
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        } as any);
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "offering",
          entityId: id,
          metadata: input,
        });
        await createNotification({
          userId: ctx.user.id,
          type: "finance_created",
          title: "บันทึกรายการการเงินแล้ว",
          description: `บันทึก ${input.amount.toLocaleString()} บาทเรียบร้อยแล้ว`,
          link: null,
        });
        return { id };
      }),
    update: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          amount: z.number().positive().optional(),
          category: offeringCategory.optional(),
          fundId: z.number().int().positive().nullable().optional(),
          donorName: z.string().trim().max(120).nullable().optional(),
          receiptDate: z.coerce.date().optional(),
          method: paymentMethod.optional(),
          reference: z.string().trim().max(120).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, amount, ...rest } = input;
        const updated = await updateOffering(id, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        } as any);
        if (updated === null)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการถวายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "offering",
          entityId: id,
          metadata: rest,
        });
        return { id: updated };
      }),
    delete: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await voidOffering(input.id, ctx.user.id);
        if (!deleted)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการถวายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VOID",
          entity: "offering",
          entityId: input.id,
          metadata: { voidedBy: ctx.user.id, voidedAt: new Date() },
        });
        return { id: input.id };
      }),
  }),

  // ── Expenses ────────────────────────────────────────────────────────────────
  expenses: router({
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(200).default(50),
            fromDate: z.coerce.date().optional(),
            toDate: z.coerce.date().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listExpenses(DEFAULT_CHURCH_ID, {
          limit: input?.limit ?? 50,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getExpenseById(input.id, DEFAULT_CHURCH_ID);
      }),
    create: financeProcedure
      .input(
        z.object({
          amount: z.number().positive(),
          category: expenseCategory.default("other"),
          fundId: z.number().int().positive().optional(),
          description: z.string().trim().min(2).max(280),
          details: z.string().trim().max(1000).optional(),
          expenseDate: z.coerce.date().optional(),
          payee: z.string().trim().max(120).optional(),
          receiptRef: z.string().trim().max(120).optional(),
          receiptUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createExpense({
          amount: input.amount.toFixed(2),
          category: input.category,
          fundId: input.fundId ?? null,
          description: input.description,
          details: input.details ?? null,
          expenseDate: input.expenseDate ?? new Date(),
          payee: input.payee ?? null,
          receiptRef: input.receiptRef ?? null,
          receiptUrl: input.receiptUrl ?? null,
          status: "approved",
          recordedBy: ctx.user.id,
        } as any);
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "expense",
          entityId: id,
          metadata: input,
        });
        await createNotification({
          userId: ctx.user.id,
          type: "finance_created",
          title: "บันทึกรายการรายจ่ายแล้ว",
          description: `บันทึก ${input.amount.toLocaleString()} บาทเรียบร้อยแล้ว`,
          link: null,
        });
        return { id };
      }),
    uploadReceipt: financeProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(255),
          contentType: z.string().min(1).max(100),
          base64Data: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const ext = input.fileName.split(".").pop() ?? "bin";
        const key = `expenses/receipt.${ext}`;
        const { url } = await storagePut(
          key,
          input.base64Data,
          input.contentType
        );
        return { url };
      }),
    update: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          amount: z.number().positive().optional(),
          category: expenseCategory.optional(),
          fundId: z.number().int().positive().nullable().optional(),
          description: z.string().trim().min(2).max(280).optional(),
          details: z.string().trim().max(1000).nullable().optional(),
          expenseDate: z.coerce.date().optional(),
          payee: z.string().trim().max(120).nullable().optional(),
          receiptRef: z.string().trim().max(120).nullable().optional(),
          receiptUrl: z.string().url().nullable().optional(),
          status: expenseStatus.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, amount, ...rest } = input;
        const updated = await updateExpense(id, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        } as any);
        if (updated === null)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการรายจ่ายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "expense",
          entityId: id,
          metadata: rest,
        });
        return { id: updated };
      }),
    delete: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await voidExpense(input.id, ctx.user.id);
        if (!deleted)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการรายจ่ายหรือรายการถูกยกเลิกไปแล้ว",
          });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VOID",
          entity: "expense",
          entityId: input.id,
          metadata: { voidedBy: ctx.user.id, voidedAt: new Date() },
        });
        return { id: input.id };
      }),
  }),

  // ── Withdrawal Requests ─────────────────────────────────────────────────────
  withdrawals: router({
    list: protectedProcedure
      .input(z.object({ myOnly: z.boolean().default(false) }).optional())
      .query(async ({ ctx, input }) => {
        const userId =
          input?.myOnly || !canManageFinance(ctx.user)
            ? ctx.user.id
            : undefined;
        return await listWithdrawalRequests(DEFAULT_CHURCH_ID, { userId });
      }),
    create: protectedProcedure
      .input(
        z.object({
          amount: z.number().positive(),
          purpose: z.string().trim().min(5).max(280),
          details: z.string().trim().max(1000).optional(),
          fundId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createWithdrawalRequest({
          amount: input.amount.toFixed(2),
          purpose: input.purpose,
          details: input.details ?? null,
          fundId: input.fundId,
          requestedBy: ctx.user.id,
          requestDate: new Date(),
        } as any);
        return { id };
      }),
    approve: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          action: z.enum(["approved", "rejected"]),
          note: z.string().trim().max(500).default(""),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!canApproveWithdrawals(ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์อนุมัติคำขอเบิก",
          });
        }
        const updated = await approveWithdrawal(
          input.id,
          ctx.user.id,
          input.action,
          input.note
        );
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "คำขอเบิกนี้ไม่ได้อยู่ในสถานะรออนุมัติ",
          });
        }
        return { success: true } as const;
      }),
    disburse: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const updated = await disburseWithdrawal(input.id);
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องอนุมัติคำขอเบิกก่อนจ่ายเงิน",
          });
        }
        return { success: true } as const;
      }),
  }),

  // ── Members ──────────────────────────────────────────────────────────────────
  members: router({
    list: protectedProcedure.query(async () => listMembers(DEFAULT_CHURCH_ID)),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getMemberById(input.id, DEFAULT_CHURCH_ID)),
    create: churchLeaderProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          phone: z.string().trim().max(30).optional(),
          email: z.string().email().max(320).optional(),
          status: z.enum(["active", "inactive", "pending"]).default("active"),
          avatarUrl: z.string().url().max(500).optional(),
          notes: z.string().trim().max(2000).optional(),
        })
      )
      .mutation(async ({ input }) => ({ id: await createMember(input) })),
    update: churchLeaderProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().trim().min(2).max(180).optional(),
          phone: z.string().trim().max(30).nullable().optional(),
          email: z.string().email().max(320).nullable().optional(),
          status: z.enum(["active", "inactive", "pending"]).optional(),
          avatarUrl: z.string().url().max(500).nullable().optional(),
          notes: z.string().trim().max(2000).nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updated = await updateMember(id, data);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบสมาชิก" });
        return { id: updated };
      }),
    deactivate: churchLeaderProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const updated = await deactivateMember(input.id);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบสมาชิก" });
        return { id: updated };
      }),
  }),

  // ── Ministries ───────────────────────────────────────────────────────────────
  // Reading is open to every signed-in member so the congregation can see the
  // teams; creating and editing belongs to leadership and deacons.
  ministries: router({
    list: protectedProcedure.query(async () =>
      listMinistries(DEFAULT_CHURCH_ID)
    ),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getMinistryById(input.id, DEFAULT_CHURCH_ID)),
    create: ministryProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          description: z.string().trim().max(2000).optional(),
          leaderName: z.string().trim().max(180).optional(),
          meetingSchedule: z.string().trim().max(180).optional(),
          status: z.enum(["active", "inactive"]).default("active"),
        })
      )
      .mutation(async ({ input }) => ({ id: await createMinistry(input) })),
    update: ministryProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            name: z.string().trim().min(2).max(180).optional(),
            description: z.string().trim().max(2000).nullable().optional(),
            leaderName: z.string().trim().max(180).nullable().optional(),
            meetingSchedule: z.string().trim().max(180).nullable().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          })
          // Drizzle's .set({}) throws "No values to set", which would surface
          // as a 500; an id with no changes is a bad request, not a crash.
          .refine(input => Object.keys(input).length > 1, {
            message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่ต้องการแก้ไข",
          })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updated = await updateMinistry(id, data);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบฝ่ายงาน" });
        return { id: updated };
      }),
    archive: ministryProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const updated = await archiveMinistry(input.id);
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบฝ่ายงาน" });
        return { id: updated };
      }),
  }),

  // ── Budgets ──────────────────────────────────────────────────────────────────
  // Plans are compared against recorded expenses, so reading them exposes
  // spending totals: both reading and writing are limited to budget managers.
  budgets: router({
    list: budgetProcedure
      .input(z.object({ year: budgetYear }))
      .query(async ({ input }) =>
        listBudgetPlans(input.year, DEFAULT_CHURCH_ID)
      ),
    getById: budgetProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) =>
        getBudgetPlanById(input.id, DEFAULT_CHURCH_ID)
      ),
    create: budgetProcedure
      .input(
        z.object({
          year: budgetYear,
          month: budgetMonth.nullable().default(null),
          category: expenseCategory.nullable().default(null),
          fundId: z.number().int().positive().nullable().default(null),
          plannedAmount: z.number().positive().max(9_999_999_999_999),
          notes: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createBudgetPlan({
          ...input,
          plannedAmount: input.plannedAmount.toFixed(2),
          notes: input.notes || null,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "budget_plan",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),
    update: budgetProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            year: budgetYear.optional(),
            month: budgetMonth.nullable().optional(),
            category: expenseCategory.nullable().optional(),
            fundId: z.number().int().positive().nullable().optional(),
            plannedAmount: z
              .number()
              .positive()
              .max(9_999_999_999_999)
              .optional(),
            notes: z.string().trim().max(1000).nullable().optional(),
          })
          .refine(input => Object.keys(input).length > 1, {
            message: "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่ต้องการแก้ไข",
          })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, plannedAmount, ...rest } = input;
        const updated = await updateBudgetPlan(id, {
          ...rest,
          ...(plannedAmount !== undefined
            ? { plannedAmount: plannedAmount.toFixed(2) }
            : {}),
        });
        if (updated === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบงบประมาณ" });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "UPDATE",
          entity: "budget_plan",
          entityId: id,
          metadata: input,
        });
        return { id: updated };
      }),
    delete: budgetProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteBudgetPlan(input.id);
        if (deleted === null)
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบงบประมาณ" });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "budget_plan",
          entityId: input.id,
        });
        return { id: deleted };
      }),
  }),

  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) =>
      listNotifications(ctx.user.id, DEFAULT_CHURCH_ID)
    ),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id, DEFAULT_CHURCH_ID);
        return { id: input.id };
      }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id, DEFAULT_CHURCH_ID);
      return { success: true } as const;
    }),
  }),

  // ── Reports ──────────────────────────────────────────────────────────────────
  reports: router({
    /** Category totals and fund balances for the report screen. */
    summary: protectedProcedure
      .input(reportDateRange)
      .query(async ({ input }) =>
        getFinancialReportSummary(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        )
      ),
    financial: protectedProcedure
      .input(reportDateRange)
      .query(async ({ input }) => {
        return await getFinancialReportData(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        );
      }),
    exportCsv: financeProcedure
      .input(reportDateRange)
      .query(async ({ input }) => {
        const rows = await getFinancialReportData(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        );
        const header =
          "วันที่,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน (บาท),ช่องทาง";
        const lines = rows.map(r =>
          [
            r.date,
            r.type === "income" ? "รายรับ" : "รายจ่าย",
            r.category,
            r.description,
            r.amount.toFixed(2),
            r.method ?? "-",
          ]
            .map(csvCell)
            .join(",")
        );
        return { csv: [header, ...lines].join("\n"), rowCount: rows.length };
      }),
  }),

  // ── Updates (existing) ──────────────────────────────────────────────────────
  updates: router({
    feed: protectedProcedure.query(async () => ({
      news: await listPublishedChurchNews(),
      events: await listPublishedChurchEvents(),
    })),
    adminList: adminProcedure.query(async () => ({
      news: await listAllChurchNews(),
      events: await listAllChurchEvents(),
    })),
    createNews: adminProcedure
      .input(
        z.object({
          title: z.string().trim().min(3).max(180),
          summary: z.string().trim().min(3).max(280),
          body: z.string().trim().min(3),
          category: newsCategory,
          status: newsStatus.default("draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createChurchNews({
          authorId: ctx.user.id,
          title: input.title,
          summary: input.summary,
          body: input.body,
          category: input.category,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
        });
        return { id };
      }),
    createEvent: adminProcedure
      .input(
        z
          .object({
            title: z.string().trim().min(3).max(180),
            summary: z.string().trim().min(3).max(280),
            description: z.string().trim().min(3),
            startsAt: z.coerce.date(),
            endsAt: z.coerce.date().optional(),
            location: z.string().trim().max(180).optional(),
            registrationUrl: z
              .string()
              .url()
              .max(500)
              .optional()
              .or(z.literal("")),
            status: eventStatus.default("draft"),
          })
          .refine(data => !data.endsAt || data.endsAt >= data.startsAt, {
            message: "เวลาสิ้นสุดต้องไม่มาก่อนเวลาเริ่มต้น",
            path: ["endsAt"],
          })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createChurchEvent({
          authorId: ctx.user.id,
          title: input.title,
          summary: input.summary,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          location: input.location || null,
          registrationUrl: input.registrationUrl || null,
          status: input.status,
        });
        return { id };
      }),
    updateNews: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().trim().min(3).max(180),
          summary: z.string().trim().min(3).max(280),
          body: z.string().trim().min(3),
          category: newsCategory,
          status: newsStatus,
        })
      )
      .mutation(async ({ input }) => {
        await updateChurchNews(input.id, {
          title: input.title,
          summary: input.summary,
          body: input.body,
          category: input.category,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
        });
        return { success: true } as const;
      }),
    updateEvent: adminProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            title: z.string().trim().min(3).max(180),
            summary: z.string().trim().min(3).max(280),
            description: z.string().trim().min(3),
            startsAt: z.coerce.date(),
            endsAt: z.coerce.date().optional(),
            location: z.string().trim().max(180).optional(),
            registrationUrl: z
              .string()
              .url()
              .max(500)
              .optional()
              .or(z.literal("")),
            status: eventStatus,
          })
          .refine(data => !data.endsAt || data.endsAt >= data.startsAt, {
            message: "เวลาสิ้นสุดต้องไม่มาก่อนเวลาเริ่มต้น",
            path: ["endsAt"],
          })
      )
      .mutation(async ({ input }) => {
        await updateChurchEvent(input.id, {
          title: input.title,
          summary: input.summary,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          location: input.location || null,
          registrationUrl: input.registrationUrl || null,
          status: input.status,
        });
        return { success: true } as const;
      }),
    setNewsStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: newsStatus }))
      .mutation(async ({ input }) => {
        await updateChurchNewsStatus(input.id, input.status);
        return { success: true } as const;
      }),
    setEventStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: eventStatus }))
      .mutation(async ({ input }) => {
        await updateChurchEventStatus(input.id, input.status);
        return { success: true } as const;
      }),
    deleteNews: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteChurchNews(input.id);
        return { success: true } as const;
      }),
    deleteEvent: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteChurchEvent(input.id);
        return { success: true } as const;
      }),
  }),
  // ── Weekly Offering Counting ────────────────────────────────────────────────
  counting: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      assertCanCount(ctx.user);
      return listCountingSessions();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const detail = await getCountingSessionDetail(input.id);
        if (!detail) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรอบนับเงินถวาย",
          });
        }
        return detail;
      }),

    create: protectedProcedure
      .input(
        z.object({
          serviceDate: z.coerce.date(),
          serviceRound: z.number().int().min(1).max(9).default(1),
          serviceName: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const id = await createCountingSession({
          serviceDate: input.serviceDate,
          serviceRound: input.serviceRound,
          serviceName: input.serviceName ?? null,
          notes: input.notes ?? null,
          countedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "counting_session",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    addEnvelope: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          envelopeNo: z.string().trim().max(30).optional(),
          memberId: z.number().int().positive().optional(),
          donorName: z.string().trim().max(180).optional(),
          isAnonymous: z.boolean().default(false),
          category: offeringCategory.default("general"),
          fundId: z.number().int().positive(),
          method: paymentMethod.default("cash"),
          amount: z.number().positive(),
          reference: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const id = await addOfferingEnvelope({
          sessionId: input.sessionId,
          envelopeNo: input.envelopeNo ?? null,
          memberId: input.memberId ?? null,
          donorName: input.isAnonymous ? null : (input.donorName ?? null),
          isAnonymous: input.isAnonymous,
          category: input.category,
          fundId: input.fundId,
          method: input.method,
          amount: input.amount.toFixed(2),
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        });
        return { id };
      }),

    updateEnvelope: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
          envelopeNo: z.string().trim().max(30).nullable().optional(),
          memberId: z.number().int().positive().nullable().optional(),
          donorName: z.string().trim().max(180).nullable().optional(),
          isAnonymous: z.boolean().optional(),
          category: offeringCategory.optional(),
          fundId: z.number().int().positive().optional(),
          method: paymentMethod.optional(),
          amount: z.number().positive().optional(),
          reference: z.string().trim().max(120).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const { id, sessionId, amount, ...rest } = input;
        const updated = await updateOfferingEnvelope(id, sessionId, {
          ...rest,
          ...(amount === undefined ? {} : { amount: amount.toFixed(2) }),
        });
        if (updated === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบรายการซอง" });
        }
        return { id: updated };
      }),

    removeEnvelope: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const removed = await deleteOfferingEnvelope(input.id, input.sessionId);
        if (!removed) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบรายการซอง" });
        }
        return { success: true } as const;
      }),

    setCashCount: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          denomination: z.number().positive(),
          kind: z.enum(["note", "coin"]),
          quantity: z.number().int().min(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const id = await setCashCount({
          sessionId: input.sessionId,
          denomination: input.denomination.toFixed(2),
          kind: input.kind,
          quantity: input.quantity,
        });
        return { id };
      }),

    addDeduction: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          purpose: z.string().trim().min(2).max(200),
          reason: z.string().trim().min(2).max(1000),
          amount: z.number().positive(),
          paidTo: z.string().trim().min(2).max(180),
          category: expenseCategory.default("other"),
          /**
           * Required: cash leaving the bag must reduce a fund, otherwise the
           * fund balance overstates what actually reached the bank.
           */
          fundId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const id = await addSessionDeduction({
          sessionId: input.sessionId,
          purpose: input.purpose,
          reason: input.reason,
          amount: input.amount.toFixed(2),
          paidTo: input.paidTo,
          category: input.category,
          fundId: input.fundId ?? null,
          requestedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "session_deduction",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    approveDeduction: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!canApproveDeduction(ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์อนุมัติรายการหักเบิก",
          });
        }
        const approved = await approveSessionDeduction(input.id, ctx.user.id);
        if (!approved) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "ไม่พบรายการ หรือผู้ขอเบิกไม่สามารถอนุมัติรายการของตัวเองได้",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "APPROVE",
          entity: "session_deduction",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    removeDeduction: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          sessionId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.sessionId);
        assertCountEditable(session.status);
        const removed = await deleteSessionDeduction(input.id, input.sessionId);
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการหักเบิก",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "session_deduction",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    addBankRecord: financeProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          type: z.enum(["transfer_in", "cash_deposit"]),
          amount: z.number().positive(),
          transferredBy: z.number().int().positive().optional(),
          transferredByName: z.string().trim().max(180).optional(),
          bankRef: z.string().trim().max(120).optional(),
          occurredAt: z.coerce.date().optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireCountingSession(input.sessionId);
        const id = await addBankRecord({
          sessionId: input.sessionId,
          type: input.type,
          amount: input.amount.toFixed(2),
          transferredBy: input.transferredBy ?? null,
          transferredByName: input.transferredByName ?? null,
          bankRef: input.bankRef ?? null,
          occurredAt: input.occurredAt ?? new Date(),
          notes: input.notes ?? null,
          recordedBy: ctx.user.id,
        });
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CREATE",
          entity: "bank_record",
          entityId: id,
          metadata: input,
        });
        return { id };
      }),

    matchPassbook: financeProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          passbookDate: z.coerce.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const matched = await matchBankRecordToPassbook(
          input.id,
          ctx.user.id,
          input.passbookDate
        );
        if (!matched) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรายการธนาคาร",
          });
        }
        return { success: true } as const;
      }),

    addDocument: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          kind: z
            .enum([
              "count_sheet",
              "envelope_photo",
              "deposit_slip",
              "transfer_slip",
              "passbook_page",
              "deduction_receipt",
              "other",
            ])
            .default("other"),
          fileName: z.string().trim().min(1).max(255),
          mimeType: z.string().trim().max(120).optional(),
          fileSize: z.number().int().min(0).optional(),
          driveFileId: z.string().trim().max(180).optional(),
          fileUrl: z.string().trim().max(600).optional(),
          drivePath: z.string().trim().max(300).optional(),
          deductionId: z.number().int().positive().optional(),
          bankRecordId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        await requireCountingSession(input.sessionId);
        const id = await addSessionDocument({
          sessionId: input.sessionId,
          kind: input.kind,
          fileName: input.fileName,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          driveFileId: input.driveFileId ?? null,
          fileUrl: input.fileUrl ?? null,
          drivePath: input.drivePath ?? null,
          deductionId: input.deductionId ?? null,
          bankRecordId: input.bankRecordId ?? null,
          uploadedBy: ctx.user.id,
        });
        return { id };
      }),

    /** counting → counted. The counter hands the sheet over for checking. */
    submitCount: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "counted")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ไม่อยู่ในสถานะที่ส่งนับได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "counted",
          { countSubmittedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "SUBMIT",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** counted → counting. Sends the sheet back for a re-count. */
    reopenCount: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "counting")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ไม่สามารถส่งกลับไปนับใหม่ได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "counting",
          { verifiedBy: null, verifiedAt: null }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "REOPEN",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** counted → verified. Never by the person who counted. */
    verify: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanVerify(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.countedBy === ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "ผู้นับเงินไม่สามารถตรวจสอบรอบของตัวเองได้",
          });
        }
        if (!canTransition(session.status, "verified")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องส่งนับให้เรียบร้อยก่อนจึงจะตรวจสอบได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "verified",
          { verifiedBy: ctx.user.id, verifiedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "VERIFY",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /**
     * verified → posted. Writes the ledger rows. A session that does not
     * balance needs a written explanation and an approver first.
     */
    post: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          varianceNote: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanVerify(ctx.user);
        const detail = await getCountingSessionDetail(input.id);
        if (!detail) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบรอบนับเงินถวาย",
          });
        }
        if (!canTransition(detail.session.status, "posted")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องตรวจสอบรอบให้เรียบร้อยก่อนจึงจะลงบัญชีได้",
          });
        }

        const unapproved = detail.deductions.filter(d => !d.approvedBy);
        if (unapproved.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ ${unapproved.length} รายการ`,
          });
        }

        const note = input.varianceNote?.trim() || detail.session.varianceNote;
        if (!detail.reconciliation.isBalanced && !note) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ยอดยังไม่ตรงกัน ต้องบันทึกคำอธิบายผลต่างก่อนลงบัญชี",
          });
        }
        if (!detail.reconciliation.isBalanced) {
          await setCountingSessionStatus(
            input.id,
            detail.session.status,
            detail.session.status,
            { varianceNote: note, varianceApprovedBy: ctx.user.id }
          );
        }

        const result = await postCountingSession(input.id, ctx.user.id);
        if (!result) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "รอบนี้ถูกลงบัญชีไปแล้ว หรือสถานะเปลี่ยนไปแล้ว",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "POST",
          entity: "counting_session",
          entityId: input.id,
          metadata: { ...result, reconciliation: detail.reconciliation },
        });
        return result;
      }),

    /** posted → closed. Locks the round for good. */
    close: financeProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requireCountingSession(input.id);
        if (!canTransition(session.status, "closed")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "ต้องลงบัญชีรอบนี้ก่อนจึงจะปิดรอบได้",
          });
        }
        const moved = await setCountingSessionStatus(
          input.id,
          session.status,
          "closed",
          { closedAt: new Date() }
        );
        if (!moved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "สถานะรอบเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "CLOSE",
          entity: "counting_session",
          entityId: input.id,
          metadata: {},
        });
        return { success: true } as const;
      }),

    /** Deletes an abandoned or mistaken counting session that has not yet been posted or closed. */
    deleteSession: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.status === "posted" || session.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "ไม่สามารถลบรอบที่ลงบัญชีหรือปิดรอบแล้วได้ เพื่อความถูกต้องของระบบบัญชี",
          });
        }
        const res = await deleteCountingSession(input.id);
        if (!res.success) {
          throw new TRPCError({
            code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            message:
              res.reason === "NOT_FOUND"
                ? "ไม่พบรอบนับเงินถวาย"
                : "ไม่สามารถลบรอบนี้ได้",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "DELETE",
          entity: "counting_session",
          entityId: input.id,
          metadata: {
            serviceDate: session.serviceDate,
            status: session.status,
          },
        });
        return { success: true } as const;
      }),

    /** Resets an unposted session back to fresh 'counting' state, clearing all child rows. */
    resetSession: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        assertCanCount(ctx.user);
        const session = await requireCountingSession(input.id);
        if (session.status === "posted" || session.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "ไม่สามารถรีเซ็ตรอบที่ลงบัญชีหรือปิดรอบแล้วได้ เพื่อความถูกต้องของระบบบัญชี",
          });
        }
        const res = await resetCountingSession(input.id);
        if (!res.success) {
          throw new TRPCError({
            code: res.reason === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            message:
              res.reason === "NOT_FOUND"
                ? "ไม่พบรอบนับเงินถวาย"
                : "ไม่สามารถรีเซ็ตรอบนี้ได้",
          });
        }
        await createAuditLog({
          churchId: DEFAULT_CHURCH_ID,
          userId: ctx.user.id,
          action: "RESET",
          entity: "counting_session",
          entityId: input.id,
          metadata: {
            serviceDate: session.serviceDate,
            previousStatus: session.status,
          },
        });
        return { success: true } as const;
      }),
  }),

  // ── Giving Inbox (LINE Slip AI) ──────────────────────────────────────────
  givingInbox: router({
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await approveLineSlip({
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
          });
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
          return await rejectLineSlip({
            slipId: input.slipId,
            churchId: DEFAULT_CHURCH_ID,
            reviewedBy: ctx.user.id,
            reason: input.reason,
          });
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err?.message || "เกิดข้อผิดพลาดในการปฏิเสธสลิป",
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err?.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูลสลิป",
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              err?.message || "เกิดข้อผิดพลาดในการเชื่อมโยงสมาชิกกับ LINE",
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
        try {
          const rawBase64 = input.base64Data.replace(
            /^data:image\/\w+;base64,/,
            ""
          );
          const buffer = Buffer.from(rawBase64, "base64");

          const slip = await createManualSlip({
            churchId: DEFAULT_CHURCH_ID,
            userId: ctx.user.id,
            userName: ctx.user.name ?? undefined,
            donorName: input.donorName,
            imageBuffer: buffer,
          });

          // Run worker batch immediately to extract data with AI
          await runWorkerBatch().catch(err =>
            console.warn("[Manual upload] Worker error:", err)
          );

          return { success: true, slipId: slip.id };
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err?.message || "ไม่สามารถอัปโหลดสลิปได้",
          });
        }
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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err?.message || "ไม่สามารถสแกนสลิปซ้ำได้",
          });
        }
      }),
  }),

  // ── Audit Logs ──────────────────────────────────────────────────────────────
  audit: router({
    list: adminProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(200).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listAuditLogs(input?.limit ?? 50);
      }),
  }),
});

export type AppRouter = typeof appRouter;
