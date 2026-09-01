# Web Accessibility (a11y) Audit Report

This accessibility audit reviews the public customer-facing frontend screens of the **Quesole** application. These screens are:
1. **Join Queue Page** (`src/routes/q.$branchId.tsx`)
2. **Ticket Tracking Page** (`src/routes/t.$ticketId.tsx`)
3. **Appointment Booking Page** (`src/routes/book.tsx`)

The audit is conducted against the **Web Content Accessibility Guidelines (WCAG) 2.1 AA** criteria.

---

## 1. Executive Summary

Quesole's customer-facing interfaces are built with modern UI principles using semantically clean JSX. Keyboard navigation is largely functional out-of-the-box due to standard input and button usage. However, several critical screen reader (ARIA) annotations and label bindings are missing, which must be addressed to ensure complete compliance with WCAG 2.1 AA.

---

## 2. Page-by-Page Audit Findings

### A. Join Queue Page (`q.$branchId.tsx`)
*   **Semantic Structure (Pass):** Uses standard `<h1 className="mt-2 font-display text-2xl font-bold">` for page title and standard form inputs.
*   **Label Bindings (Improvement Needed):**
    *   *Issue:* `<Label>` elements do not link to `<Input>` elements using `htmlFor` / `id` parameters.
    *   *Impact:* Screen readers will read the label as plain text rather than announcing it when focusing the input field.
    *   *Fix:* Add `htmlFor="name"` to the Label and `id="name"` to the Input.
*   **Service Selector Buttons (Improvement Needed):**
    *   *Issue:* Interactive buttons to choose service do not communicate active/inactive states.
    *   *Impact:* Visually impaired users won't know which service is currently selected.
    *   *Fix:* Add `aria-pressed={serviceId === s.id}` to the button elements.

### B. Live Ticket Tracking Page (`t.$ticketId.tsx`)
*   **Live Updates (Improvement Needed):**
    *   *Issue:* The page automatically updates the customer's position and estimated wait time live.
    *   *Impact:* Screen reader users won't be notified when their queue position changes unless they manually refresh or scan the page.
    *   *Fix:* Wrap the Live Position and Est. Wait text in an `aria-live="polite"` container, ensuring real-time position changes are announced automatically.
*   **Contrast & Color-Only Information (Pass):**
    *   *Issue:* Active turns change background color to `bg-coral` or `bg-emerald`.
    *   *Impact:* Color-blind users might not distinguish the status based on color.
    *   *Fix:* The page explicitly renders the textual instruction: `"Please proceed to the counter"`, complying with WCAG 1.4.1 (Use of Color).

### C. Appointment Booking Page (`book.tsx`)
*   **Multi-Step Navigation (Improvement Needed):**
    *   *Issue:* The booking flow involves choosing a date, service, slot, and verifying OTP.
    *   *Impact:* Blind or motor-impaired users might find it difficult to track which step is active.
    *   *Fix:* Implement `aria-expanded` and clear focus traps inside multi-step dialogs.
*   **Forms & Verification (Improvement Needed):**
    *   *Issue:* OTP Input field should announce error/validation statuses.
    *   *Fix:* Add `aria-invalid={!!error}` and link errors to inputs using `aria-describedby`.

---

## 3. WCAG 2.1 AA Compliance Checklist

| Standard | Description | Status | Recommendation |
|---|---|---|---|
| **1.1.1** | Non-text Content (Images, Icons) | ✅ Pass | SVGs / Lucide icons are decorative or accompanied by readable text. |
| **1.3.1** | Info and Relationships (Labels) | ❌ Fail | Add `htmlFor` / `id` bindings on all form inputs. |
| **1.4.1** | Use of Color | ✅ Pass | Status modifications use explicit text messages alongside color changes. |
| **2.1.1** | Keyboard Access | ✅ Pass | All input and button controls are focusable and triggerable via Keyboard. |
| **2.4.7** | Focus Visible | ✅ Pass | Default Tailwind/Radix focus-visible ring styles are active. |
| **4.1.2** | Name, Role, Value | ❌ Fail | Add `aria-pressed` / `aria-expanded` on custom interactive buttons. |

---

## 4. Remediation Plan

1.  **Phase 1 (Immediate):** Add `id` and `htmlFor` bindings to all form fields across `q.$branchId.tsx` and `book.tsx`.
2.  **Phase 2 (Immediate):** Integrate `aria-live="polite"` on `t.$ticketId.tsx` to announce queue updates.
3.  **Phase 3 (Next Sprint):** Ensure `aria-pressed` or `aria-selected` status is added to all custom service-picker lists.
