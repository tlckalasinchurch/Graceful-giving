// SweetAlert2 & Bootstrap styled Alert Utility for Graceful Giving
export interface SwalOptions {
  title?: string;
  text?: string;
  html?: string;
  icon?: "success" | "error" | "warning" | "info" | "question";
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
  timer?: number;
}

export interface SwalResult {
  isConfirmed: boolean;
  isDismissed: boolean;
}

export const Swal = {
  fire(options: SwalOptions): Promise<SwalResult> {
    return new Promise(resolve => {
      if (typeof document === "undefined") {
        return resolve({ isConfirmed: true, isDismissed: false });
      }

      // Title/text may contain user-entered content (envelope numbers, names,
      // notes) and are interpolated into innerHTML below — escape them. The
      // `html` option stays raw: it exists for hand-built developer markup.
      const escapeHtml = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      // Existing modal cleanup
      const existing = document.getElementById("grace-sweetalert-container");
      if (existing) existing.remove();

      const container = document.createElement("div");
      container.id = "grace-sweetalert-container";
      container.className =
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 transition-opacity duration-200 animate-in fade-in";

      const iconSvgs: Record<string, string> = {
        success: `
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600">
            <svg class="h-8 w-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        `,
        error: `
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600">
            <svg class="h-8 w-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        `,
        warning: `
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600">
            <svg class="h-8 w-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        `,
        info: `
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600">
            <svg class="h-8 w-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        `,
        question: `
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20 border border-brand/40 text-black">
            <svg class="h-8 w-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        `,
      };

      const iconHtml = options.icon ? iconSvgs[options.icon] || "" : "";
      const confirmText = options.confirmButtonText || "ตกลง";
      const cancelText = options.cancelButtonText || "ยกเลิก";
      const customConfirmColor = options.confirmButtonColor || null;
      const customCancelColor = options.cancelButtonColor || null;

      container.innerHTML = `
        <div class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-surface p-6 sm:p-8 text-center shadow-2xl border border-line transition-all duration-200">
          <div class="relative z-10">
            ${iconHtml}
            ${
              options.title
                ? `<h3 class="mt-4 text-xl sm:text-2xl font-bold text-ink tracking-tight leading-snug">${escapeHtml(options.title)}</h3>`
                : ""
            }
            ${
              options.text
                ? `<p class="mt-2.5 whitespace-pre-line text-sm sm:text-base text-ink-2 font-normal leading-relaxed max-w-sm mx-auto">${escapeHtml(options.text)}</p>`
                : ""
            }
            ${options.html ? `<div class="mt-2.5 text-sm text-ink-2">${options.html}</div>` : ""}

            <div class="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
              ${
                options.showCancelButton
                  ? `<button id="swal-cancel-btn" type="button" style="${customCancelColor ? `background:${customCancelColor};` : ""}" class="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl border border-line ${customCancelColor ? "hover:opacity-90 text-white" : "bg-paper-2 hover:bg-paper text-ink"} font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand active:scale-[0.98] cursor-pointer">
                      ${cancelText}
                    </button>`
                  : ""
              }
              <button id="swal-confirm-btn" type="button" style="${customConfirmColor ? `background:${customConfirmColor};` : ""}" class="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl ${customConfirmColor ? "hover:opacity-90 text-white" : "bg-brand hover:bg-brand-ink text-black"} font-bold text-sm shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand active:scale-[0.98] cursor-pointer">
                ${confirmText}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const close = (confirmed: boolean) => {
        container.classList.add("opacity-0");
        setTimeout(() => {
          container.remove();
          resolve({ isConfirmed: confirmed, isDismissed: !confirmed });
        }, 150);
      };

      const confirmBtn = container.querySelector("#swal-confirm-btn");
      confirmBtn?.addEventListener("click", () => close(true));

      const cancelBtn = container.querySelector("#swal-cancel-btn");
      cancelBtn?.addEventListener("click", () => close(false));

      // Handle Escape key
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          window.removeEventListener("keydown", keyHandler);
          close(false);
        }
      };
      window.addEventListener("keydown", keyHandler);

      // Auto timer if provided
      if (options.timer && options.timer > 0) {
        setTimeout(() => close(true), options.timer);
      }
    });
  },

  success(title: string, text?: string) {
    return this.fire({ icon: "success", title, text });
  },

  error(title: string, text?: string) {
    return this.fire({ icon: "error", title, text });
  },

  warning(title: string, text?: string) {
    return this.fire({ icon: "warning", title, text });
  },

  async confirm(
    title: string,
    text?: string,
    confirmBtnOrOptions?: string | Partial<SwalOptions>,
    cancelBtn?: string
  ): Promise<boolean> {
    let opts: SwalOptions = {
      icon: "question",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    };

    if (
      typeof confirmBtnOrOptions === "object" &&
      confirmBtnOrOptions !== null
    ) {
      opts = { ...opts, ...confirmBtnOrOptions };
    } else if (typeof confirmBtnOrOptions === "string") {
      opts.confirmButtonText = confirmBtnOrOptions;
      if (cancelBtn) opts.cancelButtonText = cancelBtn;
    }

    const result = await this.fire(opts);
    return result.isConfirmed;
  },
};
