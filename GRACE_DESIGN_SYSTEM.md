# Graceful-giving Design System

**Project:** Graceful-giving (เกรซกิฟวิง)  
**Date:** 2026-09-26  
**Product Type:** Church Financial Management System  
**Industry:** Church/Non-profit/Religious  
**Stack:** React 19 + Next.js + Tailwind CSS

---

## Design Philosophy

Graceful-giving เป็นระบบจัดการการเงินคริสตจักรที่ต้องการสร้างความน่าเชื่อถือ เข้าถึงได้ง่าย และใช้งานได้จริง

**Core Values:**
- **Trustworthy:** สร้างความเชื่อมั่นด้วย design ที่เป็นมืออาชีพ
- **Accessible:** เข้าถึงได้ง่ายสำหรับทุกคน
- **Professional:** ใช้งานได้จริงในสภาพแวดล้อมการเงิน
- **Clean:** ลดความสับสน โฟกัสที่ข้อมูลที่สำคัญ

---

## Visual Design Pattern

### Layout Pattern: Minimal Single Column

**แนวคิด:** 
- Single CTA focus
- Large typography
- Lots of whitespace
- No nav clutter
- Mobile-first

**CTA Placement:**
- Center, large CTA button
- High contrast 7:1+

**Sections:**
1. Hero headline
2. Short description
3. Benefit bullets (3 max)
4. CTA
5. Footer

---

## Style & Aesthetics

### Style: Accessible & Ethical

**Keywords:**
- High contrast
- Large text (16px+)
- Keyboard navigation
- Screen reader friendly
- WCAG compliant
- Focus state
- Semantic

**Best For:**
- Government
- Healthcare
- Education
- Inclusive products
- Large audience
- Legal compliance
- Public services

**Performance:** ⚡ Excellent  
**Accessibility:** ✓ WCAG AAA

---

## Color Palette

### Primary Colors

| Role | Hex | Tailwind | Usage |
|------|-----|---------|-------|
| Primary | #7C3AED | purple-600 | Brand color, primary buttons, active states |
| Secondary | #A78BFA | purple-400 | Secondary buttons, accents, highlights |
| CTA | #F97316 | orange-500 | Call-to-action buttons, important actions |
| Background | #FAF5FF | purple-50 | Light backgrounds, cards |
| Text | #4C1D95 | purple-900 | Primary text, headings |

### Extended Palette

| Role | Hex | Tailwind | Usage |
|------|-----|---------|-------|
| Success | #10B981 | emerald-500 | Success states, positive actions |
| Warning | #F59E0B | amber-500 | Warning states, caution |
| Error | #EF4444 | red-500 | Error states, destructive actions |
| Info | #3B82F6 | blue-500 | Information, help text |
| Neutral | #6B7280 | gray-500 | Secondary text, descriptions |
| Light | #F3F4F6 | gray-100 | Alternative backgrounds |
| Dark | #1F2937 | gray-800 | Dark mode backgrounds |

### Usage Guidelines

**Contrast Requirements:**
- Primary text: 4.5:1 minimum contrast ratio
- Large text (18px+): 3:1 minimum contrast ratio
- Interactive elements: 3:1 minimum contrast ratio

**Color Psychology:**
- Purple: Trust, wisdom, dignity (เหมาะสำหรับคริสตจักร)
- Orange: Energy, warmth, generosity (เหมาะสำหรับ CTA)
- Green: Growth, prosperity (เหมาะสำหรับ financial success)

---

## Typography

### Font Family

**Primary Font:** IBM Plex Sans  
**Google Fonts:** https://fonts.google.com/share?selection?family=IBM+Plex+Sans:wght@300;400;500;600;700

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
```

**Tailwind Config:**
```javascript
fontFamily: {
  sans: ['IBM Plex Sans', 'sans-serif'],
}
```

### Typography Scale

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| H1 | 36px | 700 | 1.2 | Page titles, main headings |
| H2 | 30px | 600 | 1.3 | Section headings |
| H3 | 24px | 600 | 1.4 | Subheadings |
| H4 | 20px | 500 | 1.5 | Card titles |
| Body | 16px | 400 | 1.6 | Body text, content |
| Small | 14px | 400 | 1.5 | Labels, helper text |
| X-Small | 12px | 400 | 1.4 | Captions, footnotes |

### Typography Guidelines

**Do:**
- Use 1.5-1.75 line height for body text
- Limit to 65-75 characters per line
- Use bold (600-700) for headings
- Use regular (400) for body text

**Don't:**
- Don't use font sizes below 16px for body text
- Don't use all-caps for body text
- Don't mix too many font weights
- Don't use italic for emphasis (use bold instead)

---

## Components & Patterns

### Buttons

**Primary Button:**
```tsx
<button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer focus:ring-4 focus:ring-purple-300">
  บันทึก
</button>
```

**Secondary Button:**
```tsx
<button className="bg-purple-100 hover:bg-purple-200 text-purple-900 font-medium py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer focus:ring-4 focus:ring-purple-300">
  ยกเลิก
</button>
```

**CTA Button:**
```tsx
<button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 cursor-pointer focus:ring-4 focus:ring-orange-300 shadow-lg">
  เริ่มต้นใช้งาน
</button>
```

**Destructive Button:**
```tsx
<button className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer focus:ring-4 focus:ring-red-300">
  ลบ
</button>
```

### Form Elements

**Input Field:**
```tsx
<div className="mb-4">
  <label htmlFor="email" className="block text-sm font-medium text-purple-900 mb-2">
    อีเมล
  </label>
  <input
    type="email"
    id="email"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition-colors duration-200"
    placeholder="your@email.com"
  />
</div>
```

**Select Field:**
```tsx
<div className="mb-4">
  <label htmlFor="fund" className="block text-sm font-medium text-purple-900 mb-2">
    กองทุน
  </label>
  <select
    id="fund"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition-colors duration-200 cursor-pointer"
  >
    <option value="">เลือกกองทุน</option>
    <option value="1">กองทุนทั่วไป</option>
    <option value="2">กองทุนคำสั่งสอน</option>
  </select>
</div>
```

### Cards

**Basic Card:**
```tsx
<div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
  <h3 className="text-xl font-semibold text-purple-900 mb-2">หัวข้อ</h3>
  <p className="text-gray-600">เนื้อหา...</p>
</div>
```

**Financial Card:**
```tsx
<div className="bg-purple-50 rounded-lg shadow-md p-6 border border-purple-200">
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-semibold text-purple-900">ยอดเงินรวม</h3>
    <span className="text-2xl font-bold text-purple-600">฿125,000</span>
  </div>
  <p className="text-sm text-gray-600">เดือนกันยายน 2026</p>
</div>
```

### Tables

**Responsive Table:**
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full bg-white rounded-lg shadow-md">
    <thead className="bg-purple-100">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
          วันที่
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
          รายการ
        </th>
        <th className="px-6 py-3 text-right text-xs font-medium text-purple-900 uppercase tracking-wider">
          จำนวนเงิน
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      <tr>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          2026-09-26
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          คำสั่งสอน
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
          ฿5,000
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Accessibility Guidelines

### Critical Accessibility Features

**Focus States:**
- Clear focus rings (3-4px) on all interactive elements
- Use `focus:ring-4 focus:ring-purple-300` pattern
- Focus order matches visual order

**Keyboard Navigation:**
- All functionality accessible via keyboard
- Tab order logical and consistent
- Skip links for navigation

**Screen Reader Support:**
- ARIA labels for icon-only buttons
- Semantic HTML elements
- Alt text for meaningful images
- Landmarks for navigation

**Touch Targets:**
- Minimum 44x44px touch targets
- Adequate spacing between interactive elements
- Prevent accidental touches

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Animation & Transitions

### Timing Guidelines

**Micro-interactions:** 150-300ms
- Button hover states
- Input focus states
- Tooltip appearances

**Transitions:** 200-400ms
- Page transitions
- Modal open/close
- Panel expand/collapse

**Animations:** 300-500ms
- Loading states
- Success/error feedback
- Data refresh animations

### Performance Best Practices

**Use:**
- `transform` and `opacity` for animations
- `will-change` sparingly
- CSS transitions over JavaScript animations

**Avoid:**
- Animating `width`, `height`, `top`, `left`
- Excessive keyframe animations
- Animations that cause layout shift

---

## Dashboard Specific Guidelines

### Financial Dashboard

**Data Display:**
- Use clear, large numbers for financial figures
- Group related metrics together
- Use color coding for status indicators
- Provide context with labels and descriptions

**Charts & Visualizations:**
- Use accessible color palettes
- Provide table alternatives for accessibility
- Include tooltips with detailed information
- Support keyboard navigation

**Tables:**
- Use horizontal scroll on mobile (`overflow-x-auto`)
- Provide card layout alternatives for small screens
- Include bulk actions for efficiency
- Clear headers and sortable columns

**Content Jumping Prevention:**
- Reserve space for async content
- Use `aspect-ratio` for images
- Use skeleton screens for loading states
- Fixed heights for predictable layouts

---

## Form Guidelines

### Input Validation

**Input Types:**
```tsx
<input type="email" />     // Email addresses
<input type="tel" />       // Phone numbers
<input type="number" />    // Numeric input
<input type="date" />      // Date picker
<input type="url" />       // URLs
```

**Labels:**
- Always show visible labels
- Use `<label>` with `for` attribute
- Don't use placeholder as only label
- Place labels above or beside inputs

**Validation Timing:**
- Validate on blur for most fields
- Real-time validation for specific fields (password strength)
- Clear error messages near the problem
- Success feedback after successful submission

---

## Icons & Visual Elements

### Icon Guidelines

**Do:**
- Use SVG icons (Heroicons, Lucide, Simple Icons)
- Consistent icon sizing (24x24 viewBox)
- Fixed dimensions (w-6 h-6)
- Match icon style to design system

**Don't:**
- Don't use emojis as UI icons (🎨 🚀 ⚙️)
- Don't mix different icon sets
- Don't use inconsistent sizes
- Don't guess brand logo paths

### Interactive Elements

**Cursor States:**
- Add `cursor-pointer` to all clickable elements
- Add `cursor-not-allowed` to disabled elements
- Use `cursor-move` for draggable items

**Hover States:**
- Provide visual feedback (color, shadow, border)
- Use smooth transitions (150-300ms)
- Avoid layout shift on hover
- Consider reduced motion preference

---

## Dark Mode Support

### Dark Mode Guidelines

**Contrast Requirements:**
- Light mode text: #0F172A (slate-900) minimum
- Dark mode text: #F8FAFC (slate-50) minimum
- Glass cards light mode: bg-white/80 or higher
- Borders visible in both modes

**Implementation:**
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* Content */}
</div>
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Devices |
|------------|-------|---------|
| Mobile | 375px | Smartphones |
| Tablet | 768px | Tablets |
| Desktop | 1024px | Laptops |
| Large Desktop | 1440px | Large screens |

### Responsive Guidelines

**Mobile (375px):**
- Single column layout
- Stacked navigation
- Touch-friendly touch targets (44x44px minimum)
- Simplified tables (card layout)

**Tablet (768px):**
- Two-column layout
- Horizontal navigation
- Standard tables with horizontal scroll
- Optimized touch targets

**Desktop (1024px+):**
- Multi-column layout
- Full navigation
- Standard tables
- Hover states enabled

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly (bg-purple-600) not var() wrapper

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Light/Dark Mode
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout
- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
- [ ] ARIA labels for icon-only buttons
- [ ] Focus order matches visual order

### Financial Data
- [ ] Large, readable numbers for financial figures
- [ ] Clear labeling for financial metrics
- [ ] Color coding for status indicators
- [ ] Table alternatives for accessibility
- [ ] Proper formatting for currency (฿)

---

## Implementation Notes

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        cta: {
          500: '#F97316',
          600: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
}
```

### Component Structure

**Recommended Component Hierarchy:**
```
Layout
├── Navbar
├── Sidebar (desktop)
├── Main Content
│   ├── Dashboard
│   ├── Offerings
│   ├── Expenses
│   ├── Funds
│   ├── Members
│   └── Reports
└── Footer
```

---

## Anti-Patterns to Avoid

### Visual Issues
- ❌ Outdated design trends
- ❌ Hidden information behind complex interactions
- ❌ Excessive animations
- ❌ Low contrast text
- ❌ Emojis as icons

### UX Issues
- ❌ Tables that overflow on mobile
- ❌ Single-row actions only (no bulk actions)
- ❌ Content jumping when loading
- ❌ Input types not matching data
- ❌ Placeholder as only label
- ❌ Validation only on submit

### Performance Issues
- ❌ Unoptimized images
- ❌ Excessive re-renders
- ❌ Large bundle sizes
- ❌ Missing lazy loading

---

## Next Steps

### Immediate Actions
1. Apply color palette to existing components
2. Implement IBM Plex Sans font
3. Add focus states to all interactive elements
4. Ensure cursor-pointer on clickable elements
5. Test accessibility with keyboard navigation

### Short-term Goals
1. Redesign dashboard with new design system
2. Implement responsive tables
3. Add dark mode support
4. Improve form validation UX
5. Add loading states and skeleton screens

### Long-term Goals
1. Component library documentation
2. Design system maintenance
3. Accessibility audit
4. Performance optimization
5. User testing and feedback

---

## Resources

- **Font:** IBM Plex Sans - https://fonts.google.com/share?selection?family=IBM+Plex+Sans:wght@300;400;500;600;700
- **Icons:** Heroicons - https://heroicons.com/
- **Icons:** Lucide - https://lucide.dev/
- **Accessibility:** WCAG Guidelines - https://www.w3.org/WAI/WCAG21/quickref/
- **Colors:** Coolors Palette Generator - https://coolors.co/
