# UI Style Guide - School Portal (MotherDuck-Inspired)

**Last Updated:** 2025-11-04
**Reference:** https://motherduck.com/
**Tech Stack:** TailwindCSS + Radix UI + Next.js 15 + React 19 + TypeScript

---

## 🎨 Design Philosophy

MotherDuck's design embodies:
- **Minimalism**: Clean, uncluttered interfaces
- **Monospace Typography**: Professional, technical aesthetic
- **Soft Neutrals**: Warm, inviting color palette
- **Subtle Accents**: Strategic use of bright colors for CTAs
- **Generous Spacing**: Breathing room for content
- **Sharp Corners**: Minimal border radius (2px)

---

## 📐 Color Palette

### Primary Colors

```typescript
// tailwind.config.ts
const colors = {
  primary: {
    DEFAULT: '#6FC2FF',  // Light blue - Primary CTA
    50: '#E6F5FF',
    100: '#CCE9FF',
    200: '#99D4FF',
    300: '#6FC2FF',      // Main
    400: '#3CAFFF',
    500: '#0A9CFF',
    600: '#0080D6',
    700: '#0064AD',
    800: '#004884',
    900: '#002C5B'
  },

  neutral: {
    DEFAULT: '#383838',   // Text color
    50: '#F8F8F7',        // Light backgrounds
    100: '#F4EFEA',       // Main background
    200: '#E8E8E8',
    300: '#C8C8C8',
    400: '#A1A1A1',       // Disabled text
    500: '#7A7A7A',
    600: '#5C5C5C',
    700: '#383838',       // Main text
    800: '#252525',
    900: '#121212'
  },

  accent: {
    yellow: '#FFDE00',    // Yellow accent
    green: '#E8F5E9',     // Light green background
  }
}
```

### Usage Guidelines

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary CTA Buttons | `primary.300` | `bg-primary text-neutral-700` |
| Secondary Buttons | `neutral.100` | `bg-neutral-100 text-neutral-700` |
| Body Text | `neutral.700` | `text-neutral-700` |
| Disabled State | `neutral.400` | `text-neutral-400` |
| Page Background | `neutral.100` | `bg-neutral-100` |
| Card Background | `white` | `bg-white` |
| Accent Highlights | `accent.yellow` | `bg-accent-yellow` |

---

## 🔤 Typography

### Font Family

**Primary:** Monospace font (MotherDuck uses "Aeonik Mono")

**Recommendation for School Portal:**
- Use `font-mono` (Tailwind's default monospace stack)
- OR install JetBrains Mono / IBM Plex Mono for similar aesthetic

```typescript
// tailwind.config.ts
fontFamily: {
  mono: [
    'JetBrains Mono',
    'IBM Plex Mono',
    'ui-monospace',
    'SFMono-Regular',
    'monospace'
  ],
}
```

### Type Scale

| Element | Size | Weight | Line Height | Tailwind Classes |
|---------|------|--------|-------------|------------------|
| H1 | 52px | 400 | 1.2 | `text-[52px] font-normal leading-tight` |
| H2 | 24px | 400 | 1.4 | `text-2xl font-normal leading-relaxed` |
| H3 | 18px | 400 | 1.4 | `text-lg font-normal leading-relaxed` |
| Body | 16px | 400 | 1.5 | `text-base font-normal` |
| Small | 14px | 400 | 1.5 | `text-sm font-normal` |

### Typography Examples

```tsx
// Headings
<h1 className="text-[52px] font-mono font-normal leading-tight text-neutral-700">
  MAKING BIG DATA FEEL SMALL
</h1>

<h2 className="text-2xl font-mono font-normal leading-relaxed text-neutral-700">
  WHY IT'S BETTER
</h2>

<h3 className="text-lg font-mono font-normal leading-relaxed text-neutral-700">
  SOFTWARE ENGINEERS
</h3>

// Body text
<p className="text-base font-mono text-neutral-700">
  Your content here
</p>
```

---

## 🔘 Button System

### Primary Button (CTA)

**Visual:** Light blue background, dark text, uppercase, subtle border radius

```tsx
import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    className={`
      bg-primary text-neutral-700
      px-[22px] py-[16.5px]
      rounded-[2px]
      text-base font-mono font-normal uppercase
      hover:bg-primary-400
      transition-colors
      disabled:bg-neutral-50 disabled:text-neutral-400
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);
```

### Secondary Button

**Visual:** Warm background, matches page color

```tsx
export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    className={`
      bg-neutral-100 text-neutral-700
      px-[18px] py-[11.5px]
      rounded-[2px]
      text-base font-mono font-normal uppercase
      hover:bg-neutral-200
      transition-colors
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);
```

### Button Variants Table

| Variant | Background | Text | Padding | Use Case |
|---------|-----------|------|---------|----------|
| Primary | `#6FC2FF` | `#383838` | `16.5px 22px` | Main CTAs (Sign Up, Submit) |
| Secondary | `#F4EFEA` | `#383838` | `11.5px 18px` | Secondary actions (Learn More) |
| Ghost | `transparent` | `#383838` | `11.5px 18px` | Tertiary actions |
| Disabled | `#F8F8F7` | `#A1A1A1` | Same as type | Inactive state |

---

## 🧱 Component Patterns

### Cards

**Style:** White background, subtle shadow, minimal border radius

```tsx
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`
    bg-white
    rounded-[2px]
    p-6
    shadow-sm
    border border-neutral-200
    ${className}
  `}>
    {children}
  </div>
);
```

### Usage in School Portal:
- Class cards
- Assignment cards
- User profile cards
- Stats cards

---

### Data Tables

**Style:** Clean rows, subtle borders, monospace numbers

```tsx
// Using Radix UI Table primitives + Tailwind
import * as Table from '@radix-ui/react-table';

export const DataTable: React.FC = () => (
  <div className="bg-white rounded-[2px] border border-neutral-200">
    <table className="w-full">
      <thead className="bg-neutral-50 border-b border-neutral-200">
        <tr>
          <th className="px-6 py-4 text-left text-sm font-mono font-normal uppercase text-neutral-700">
            Name
          </th>
          <th className="px-6 py-4 text-left text-sm font-mono font-normal uppercase text-neutral-700">
            Email
          </th>
          <th className="px-6 py-4 text-left text-sm font-mono font-normal uppercase text-neutral-700">
            Role
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-200">
        <tr className="hover:bg-neutral-50 transition-colors">
          <td className="px-6 py-4 text-sm font-mono text-neutral-700">
            John Doe
          </td>
          <td className="px-6 py-4 text-sm font-mono text-neutral-700">
            john@example.com
          </td>
          <td className="px-6 py-4 text-sm font-mono text-neutral-700">
            Student
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);
```

---

### Forms & Inputs

**Style:** Clean, bordered inputs with focus states

```tsx
// Using Radix UI Form primitives
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input
    className={`
      w-full
      px-4 py-3
      bg-white
      border border-neutral-300
      rounded-[2px]
      text-base font-mono text-neutral-700
      placeholder:text-neutral-400
      focus:outline-none
      focus:border-primary
      focus:ring-2
      focus:ring-primary/20
      disabled:bg-neutral-50
      disabled:text-neutral-400
      transition-all
      ${className}
    `}
    {...props}
  />
);
```

### Form Layout Example

```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-mono text-neutral-700 mb-2 uppercase">
      Email
    </label>
    <Input type="email" placeholder="your@email.com" />
  </div>

  <div>
    <label className="block text-sm font-mono text-neutral-700 mb-2 uppercase">
      Password
    </label>
    <Input type="password" placeholder="••••••••" />
  </div>

  <PrimaryButton type="submit" className="w-full">
    Sign In
  </PrimaryButton>
</div>
```

---

### Modals/Dialogs

**Using Radix UI Dialog:**

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export const Modal: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, title, children }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        bg-white
        rounded-[2px]
        p-8
        max-w-md w-full
        shadow-xl
        border border-neutral-200
      ">
        <Dialog.Title className="text-2xl font-mono font-normal text-neutral-700 mb-4">
          {title}
        </Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
```

---

## 📏 Spacing System

### Tailwind Spacing Scale

Use Tailwind's default spacing scale with these common patterns:

| Use Case | Spacing | Tailwind Class |
|----------|---------|----------------|
| Component padding | 24px | `p-6` |
| Card padding | 24px | `p-6` |
| Section padding (vertical) | 64px | `py-16` |
| Section padding (horizontal) | 24px | `px-6` |
| Stack spacing (between elements) | 16px | `space-y-4` |
| Grid gap | 24px | `gap-6` |
| Button padding (x) | 18-22px | `px-[18px]` to `px-[22px]` |
| Button padding (y) | 11.5-16.5px | `py-[11.5px]` to `py-[16.5px]` |

---

## 🎯 Layout Patterns

### Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-mono font-normal text-neutral-700">
            SCHOOL PORTAL
          </h1>
          <nav className="flex items-center gap-4">
            {/* Navigation items */}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

### Grid Layout for Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>Class 1</Card>
  <Card>Class 2</Card>
  <Card>Class 3</Card>
</div>
```

---

## ⚙️ TailwindCSS Configuration

### Complete `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6FC2FF',
          50: '#E6F5FF',
          100: '#CCE9FF',
          200: '#99D4FF',
          300: '#6FC2FF',
          400: '#3CAFFF',
          500: '#0A9CFF',
          600: '#0080D6',
          700: '#0064AD',
          800: '#004884',
          900: '#002C5B',
        },
        neutral: {
          DEFAULT: '#383838',
          50: '#F8F8F7',
          100: '#F4EFE A',
          200: '#E8E8E8',
          300: '#C8C8C8',
          400: '#A1A1A1',
          500: '#7A7A7A',
          600: '#5C5C5C',
          700: '#383838',
          800: '#252525',
          900: '#121212',
        },
        accent: {
          yellow: '#FFDE00',
          green: '#E8F5E9',
        },
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '2px',
        'md': '4px',
        'lg': '8px',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 🔄 Radix UI Integration

### Dropdown Menu Example

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const UserMenu: React.FC = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger className="
      flex items-center gap-2
      px-4 py-2
      rounded-[2px]
      bg-neutral-100
      hover:bg-neutral-200
      transition-colors
    ">
      <span className="font-mono text-sm text-neutral-700">
        John Doe
      </span>
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content className="
        min-w-[200px]
        bg-white
        rounded-[2px]
        border border-neutral-200
        shadow-xl
        p-1
      ">
        <DropdownMenu.Item className="
          px-4 py-2
          text-sm font-mono text-neutral-700
          hover:bg-neutral-100
          cursor-pointer
          rounded-[2px]
          outline-none
        ">
          Profile
        </DropdownMenu.Item>
        <DropdownMenu.Item className="
          px-4 py-2
          text-sm font-mono text-neutral-700
          hover:bg-neutral-100
          cursor-pointer
          rounded-[2px]
          outline-none
        ">
          Settings
        </DropdownMenu.Item>
        <DropdownMenu.Separator className="h-px bg-neutral-200 my-1" />
        <DropdownMenu.Item className="
          px-4 py-2
          text-sm font-mono text-neutral-700
          hover:bg-neutral-100
          cursor-pointer
          rounded-[2px]
          outline-none
        ">
          Logout
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Extra large screens |

### Responsive Pattern

```tsx
<div className="
  px-4 sm:px-6 lg:px-8
  py-8 sm:py-12 lg:py-16
">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    {/* Cards */}
  </div>
</div>
```

---

## 🎭 Component Library for School Portal

### Page Header Component

```tsx
export const PageHeader: React.FC<{
  title: string;
  action?: React.ReactNode;
}> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-8">
    <h1 className="text-2xl font-mono font-normal text-neutral-700 uppercase">
      {title}
    </h1>
    {action && <div>{action}</div>}
  </div>
);

// Usage
<PageHeader
  title="User Management"
  action={<PrimaryButton>Create User</PrimaryButton>}
/>
```

### Stats Card Component

```tsx
export const StatsCard: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-mono text-neutral-400 uppercase mb-2">
          {label}
        </p>
        <p className="text-2xl font-mono font-normal text-neutral-700">
          {value}
        </p>
      </div>
      {icon && <div className="text-neutral-400">{icon}</div>}
    </div>
  </Card>
);
```

### Assignment Card Component

```tsx
export const AssignmentCard: React.FC<{
  title: string;
  dueDate: string;
  className: string;
  status: 'pending' | 'submitted' | 'graded';
}> = ({ title, dueDate, className, status }) => (
  <Card>
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-mono font-normal text-neutral-700">
          {title}
        </h3>
        <span className={`
          px-3 py-1
          rounded-[2px]
          text-xs font-mono uppercase
          ${status === 'graded' ? 'bg-accent-green text-neutral-700' : ''}
          ${status === 'submitted' ? 'bg-primary/20 text-neutral-700' : ''}
          ${status === 'pending' ? 'bg-neutral-200 text-neutral-700' : ''}
        `}>
          {status}
        </span>
      </div>
      <p className="text-sm font-mono text-neutral-600">
        {className}
      </p>
      <p className="text-sm font-mono text-neutral-400">
        Due: {dueDate}
      </p>
    </div>
  </Card>
);
```

---

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Install JetBrains Mono or IBM Plex Mono font
- [ ] Configure `tailwind.config.ts` with custom colors and fonts
- [ ] Set up Radix UI primitives
- [ ] Create base component library (Button, Input, Card)

### Phase 2: Typography
- [ ] Apply monospace font globally
- [ ] Test heading hierarchy (H1-H3)
- [ ] Ensure uppercase button text works

### Phase 3: Color System
- [ ] Test primary CTA button color contrast
- [ ] Apply neutral backgrounds throughout
- [ ] Use accent colors sparingly

### Phase 4: Components
- [ ] Build data table component
- [ ] Build modal/dialog component
- [ ] Build form components
- [ ] Build card variants

---

## 🚀 Quick Start Example

### Complete Login Page

```tsx
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v0/auth/oauth/google`;
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-[2px] p-8 max-w-md w-full border border-neutral-200 shadow-sm">
        <h1 className="text-2xl font-mono font-normal text-neutral-700 mb-8 uppercase">
          School Portal Login
        </h1>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-neutral-700 mb-2 uppercase">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-mono text-neutral-700 mb-2 uppercase">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <PrimaryButton type="submit" className="w-full">
            Sign In
          </PrimaryButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white font-mono text-neutral-400 uppercase">
              Or
            </span>
          </div>
        </div>

        <SecondaryButton onClick={handleGoogleLogin} className="w-full">
          Sign in with Google
        </SecondaryButton>
      </div>
    </div>
  );
}
```

---

## 📝 Notes

### Key Differences from MotherDuck
- **We're using a school portal context** instead of data warehouse
- **Radix UI instead of custom components** for accessibility
- **TailwindCSS instead of CSS-in-JS** for styling
- **Next.js 15 App Router** for routing

### What to Keep from MotherDuck
- ✅ Monospace font aesthetic
- ✅ Minimal border radius (2px)
- ✅ Warm neutral color palette
- ✅ Light blue accent for CTAs
- ✅ Clean, spacious layouts
- ✅ Uppercase button text
- ✅ Professional, technical feel

### What to Adapt
- Use education-specific language (Classes, Assignments, Grades)
- Add role-specific color coding (Admin, Teacher, Student)
- Include grade visualizations
- Add assignment status indicators

---

**Last Updated:** 2025-11-04
**Status:** ✅ Complete - Ready for Frontend Implementation
**Reference Screenshots:** `docs/frontend/screenshots/motherduck-homepage.png`
