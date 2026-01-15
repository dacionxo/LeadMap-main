# Tailwindadmin-nextjs Complete Structure Mapping

## Overview

**Location**: `Tailwindadmin-nextjs/`  
**Type**: Multi-package monorepo containing multiple standalone Next.js admin dashboard themes  
**Framework**: Next.js 16+ (App Router)  
**Styling**: Tailwind CSS 4.x  
**Total Packages**: 7 variants

---

## Repository Structure

```
Tailwindadmin-nextjs/
├── docs/                    # Documentation (HTML files)
├── figma-file/              # Figma design references
└── packages/                # All Next.js application packages
    ├── main/                # Full-featured admin (most complete)
    ├── starterkit/          # Minimal starter version
    ├── horizontal/         # Horizontal navbar layout variant
    ├── minisidebar/         # Compact sidebar variant
    ├── dark/                # Dark theme variant
    ├── rtl/                 # Right-to-left layout variant
    └── nextauth/            # NextAuth integration variant
```

---

## Package Variants

### 1. `main` Package
**Purpose**: Full-featured admin dashboard with all features and demo pages  
**Best For**: Complete reference implementation, maximum feature set

**Key Features**:
- Complete dashboard layouts (general, ecommerce, music)
- Full app suite (blog, calendar, chat, ecommerce, email, invoices, kanban, notes, tickets)
- Comprehensive UI component demos (Shadcn, Headless UI, Radix UI)
- Chart libraries (ApexCharts, Recharts, Shadcn Charts)
- React Table examples (TanStack Table)
- Widgets and banners
- Frontend pages (landing, about, contact, pricing, portfolio, blog)
- Multiple authentication flows
- Theme customization system

**Dependencies**: Most complete set including:
- `@tanstack/react-table`, `@tiptap/*`, `framer-motion`, `apexcharts`, `recharts`
- `@google/generative-ai`, `@dnd-kit/*`, `@hello-pangea/dnd`
- Full Radix UI component library
- `react-big-calendar`, `react-datepicker`, `swiper`, `react-slick`

---

### 2. `starterkit` Package
**Purpose**: Minimal starter version with core layout and essential components  
**Best For**: Starting new projects, learning the structure

**Key Features**:
- Core dashboard layout (vertical sidebar)
- Basic authentication pages (2 variants: auth1, auth2)
- Shared animated components
- Essential UI components
- Customizer context
- Same CSS structure as main

**Dependencies**: Reduced set, focuses on core functionality

---

### 3. `horizontal` Package
**Purpose**: Same features as `main` but with horizontal navigation bar  
**Best For**: Preferring top navigation over sidebar

**Key Features**:
- Horizontal menu bar instead of vertical sidebar
- All same apps and pages as `main`
- Horizontal-specific layout CSS

---

### 4. `minisidebar` Package
**Purpose**: Compact/mini sidebar variant  
**Best For**: Maximizing content area while keeping navigation accessible

**Key Features**:
- Collapsible mini sidebar
- Same feature set as `main`
- Optimized for smaller screens

---

### 5. `dark` Package
**Purpose**: Dark theme-first variant  
**Best For**: Dark mode preference, dark-themed applications

**Key Features**:
- Dark theme as default
- Dark-optimized color schemes
- Same feature set as `main`

---

### 6. `rtl` Package
**Purpose**: Right-to-left layout support  
**Best For**: Arabic, Hebrew, or other RTL languages

**Key Features**:
- RTL CSS layouts (`css/layouts/rtl.css`)
- RTL-aware sidebar and header
- Mirrored navigation and components
- Same feature set as `main`

---

### 7. `nextauth` Package
**Purpose**: Authentication integration example  
**Best For**: Learning NextAuth integration patterns

**Key Features**:
- NextAuth.js integration
- Firebase authentication
- Supabase integration
- Axios mock adapter for API simulation
- Auth-specific pages and flows

**Unique Dependencies**:
- `next-auth`, `firebase`, `@supabase/supabase-js`
- `axios`, `axios-mock-adapter`

---

## Core Architecture (Using `main` as Reference)

### Root Source Structure

```
packages/main/src/
├── app/                     # Next.js App Router structure
│   ├── (DashboardLayout)/  # Route group for admin pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   ├── components/          # Page-level components
│   ├── context/             # React Context providers
│   ├── css/                 # Global and page-specific CSS
│   ├── frontend-pages/      # Marketing/public pages
│   └── landingpage/         # Landing page variant
├── components/              # Shared React components
│   ├── ThemeProvider.tsx    # Global theme provider
│   └── ui/                  # Shadcn-style UI primitives
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
└── utils/                   # Helper utilities
    ├── i18n.ts              # Internationalization config
    └── languages/           # Locale JSON files
```

---

## App Router Structure (`packages/main/src/app/`)

### Root Layout Files

- **`layout.tsx`**: Root layout (HTML/body wrapper, ThemeProvider, global CSS)
- **`not-found.tsx`**: 404 page

### CSS Architecture (`app/css/`)

```
css/
├── globals.css              # Base Tailwind + global styles
├── layouts/                 # Layout-specific styles
│   ├── container.css        # Container styles
│   ├── header.css           # Header/navbar styles
│   ├── horizontal.css       # Horizontal layout styles
│   ├── rtl.css              # RTL layout styles
│   └── sidebar.css          # Sidebar styles
├── pages/                   # Page-specific styles
│   ├── app.css              # App pages styles
│   ├── auth.css             # Authentication pages styles
│   ├── dashboards.css       # Dashboard pages styles
│   ├── frontend-pages.css   # Marketing pages styles
│   ├── landingpage.css      # Landing page styles
│   └── widgets.css          # Widget components styles
├── theme/                   # Theme definitions
│   ├── default-theme.css    # Light theme tokens
│   └── dark.css             # Dark theme tokens
└── override/
    └── reboot.css           # CSS reset/reboot
```

### Context Providers (`app/context/`)

Each feature has its own React Context for state management:

- **`config.ts`**: Base configuration
- **`customizer-context/`**: Theme/layout customizer
- **`aichat-context/`**: AI chat state
- **`blog-context/`**: Blog management state
- **`chat-context/**: Chat application state
- **`conatact-context/`**: Contact management state
- **`ecommerce-context/`**: E-commerce state
- **`email-context/`**: Email application state
- **`imageai-context/`**: Image AI generation state
- **`invoice-context/`**: Invoice management state
- **`kanban-context/`**: Kanban board state
- **`notes-context/`**: Notes application state
- **`ticket-context/`**: Support ticket state
- **`userdata-context/`**: User data management

---

## Dashboard Layout Route Group (`app/(DashboardLayout)/`)

### Layout Infrastructure (`layout/`)

```
layout/
├── vertical/                # Vertical sidebar layout
│   ├── header/              # Top header components
│   │   ├── Header.tsx       # Main header component
│   │   ├── Search.tsx       # Search functionality
│   │   ├── Profile.tsx      # User profile dropdown
│   │   ├── Messages.tsx     # Messages/notifications
│   │   ├── Cart.tsx          # Shopping cart
│   │   ├── Language.tsx      # Language switcher
│   │   ├── Quicklinks.tsx    # Quick links menu
│   │   ├── AppLinks.tsx      # App shortcuts
│   │   ├── MobileHeaderItems.tsx
│   │   ├── CartItems.tsx
│   │   └── data.ts          # Header data/config
│   └── sidebar/             # Sidebar navigation
│       ├── Sidebar.tsx       # Main sidebar component
│       ├── sidebaritems.ts   # Navigation items definition
│       ├── nav-items/        # Navigation item components
│       └── nav-collapse/     # Collapsible nav groups
├── horizontal/              # Horizontal layout
│   ├── header/
│   │   └── HorizontalMenu.tsx
│   ├── navbar/
│   │   └── Navigation.tsx
│   └── menu-data.ts
└── shared/                   # Shared layout components
    ├── logo/
    │   ├── Logo.tsx          # Logo component
    │   └── FullLogo.tsx      # Full logo variant
    ├── breadcrumb/
    │   └── BreadcrumbComp.tsx
    └── customizer/
        └── Customizer.tsx    # Theme/layout customizer
```

### Dashboard Routes (`dashboards/`)

- **`general/page.tsx`**: General purpose dashboard
- **`ecommerce/page.tsx`**: E-commerce dashboard
- **`music/page.tsx`**: Music/entertainment dashboard

### Application Routes (`apps/`)

#### Blog Management (`apps/blog/`)
- `create/page.tsx` - Create new blog post
- `edit/page.tsx` - Edit blog post
- `manage-blog/page.tsx` - Blog list/management
- `post/page.tsx` - Blog post list
- `detail/[slug]/page.tsx` - Blog post detail view

#### Calendar (`apps/calendar/`)
- `page.tsx` - Full calendar application

#### Chat Applications (`apps/chats/`, `apps/chat-ai/`)
- `chats/page.tsx` - Standard chat interface
- `chat-ai/page.tsx` - AI-powered chat

#### Contacts (`apps/contacts/`)
- `page.tsx` - Contact management

#### E-commerce (`apps/ecommerce/`)
- `list/page.tsx` - Product list
- `shop/page.tsx` - Shop page
- `detail/[id]/page.tsx` - Product detail
- `addproduct/page.tsx` - Add product form
- `editproduct/page.tsx` - Edit product form
- `checkout/page.tsx` - Checkout process

#### Email (`apps/email/`)
- `page.tsx` - Email client interface

#### Image AI (`apps/image-ai/`)
- `page.tsx` - AI image generation

#### Invoices (`apps/invoice/`)
- `create/page.tsx` - Create invoice
- `list/page.tsx` - Invoice list
- `detail/[slug]/page.tsx` - Invoice detail
- `edit/[slug]/page.tsx` - Edit invoice

#### Kanban (`apps/kanban/`)
- `page.tsx` - Kanban board

#### Notes (`apps/notes/`)
- `page.tsx` - Notes application

#### Tickets (`apps/tickets/`)
- `page.tsx` - Ticket list
- `create/page.tsx` - Create ticket

#### User Profile (`apps/user-profile/`)
- `profile/page.tsx` - User profile
- `followers/page.tsx` - Followers list
- `friends/page.tsx` - Friends list
- `gallery/page.tsx` - Photo gallery

### UI Component Demo Routes

#### Shadcn UI (`shadcn-ui/`)
- `accordion/page.tsx`
- `alert/page.tsx`
- `avatar/page.tsx`
- `badge/page.tsx`
- `breadcrumb/page.tsx`
- `buttons/page.tsx`
- `card/page.tsx`
- `carousel/page.tsx`
- `collapsible/page.tsx`
- `combobox/page.tsx`
- `command/page.tsx`
- `datepicker/page.tsx`
- `dialogs/page.tsx`
- `drawer/page.tsx`
- `dropdown/page.tsx`
- `progressbar/page.tsx`
- `skeleton/page.tsx`
- `tab/page.tsx`
- `toast/page.tsx`
- `tooltip/page.tsx`

#### Shadcn Forms (`shadcn-form/`)
- `checkbox/page.tsx`
- `input/page.tsx`
- `radio/page.tsx`
- `select/page.tsx`

#### Shadcn Tables (`shadcn-tables/`)
- `basic/page.tsx`
- `checkbox-table/page.tsx`
- `hover-table/page.tsx`
- `striped-row/page.tsx`

#### Headless UI (`headless-ui/`)
- `dialog/page.tsx`
- `disclosure/page.tsx`
- `dropdown/page.tsx`
- `popover/page.tsx`
- `tabs/page.tsx`
- `transition/page.tsx`

#### Headless Forms (`headless-form/`)
- `buttons/page.tsx`
- `checkbox/page.tsx`
- `combobox/page.tsx`
- `fieldset/page.tsx`
- `input/page.tsx`
- `listbox/page.tsx`
- `radiogroup/page.tsx`
- `select/page.tsx`
- `switch/page.tsx`
- `textarea/page.tsx`

#### Forms (`forms/`)
- `form-autocomplete/page.tsx`
- `form-dropzone/page.tsx`
- `form-horizontal/page.tsx`
- `form-layouts/page.tsx`
- `form-select2/page.tsx`
- `form-validation/page.tsx`
- `form-vertical/page.tsx`

### Chart Routes (`charts/`)

#### ApexCharts (`charts/apex-charts/`)
- `area/page.tsx`
- `candlestick/page.tsx`
- `column/page.tsx`
- `doughnut/page.tsx`
- `gradient/page.tsx`
- `line/page.tsx`
- `radialbar/page.tsx`

#### Shadcn Charts (`charts/shadcn/`)
- `area/page.tsx`
- `bar/page.tsx`
- `line/page.tsx`
- `pie/page.tsx`
- `radar/page.tsx`
- `radial/page.tsx`

### Table Routes (`react-tables/`)

- `basic/page.tsx`
- `columnvisibility/page.tsx`
- `dense/page.tsx`
- `drag-drop/page.tsx`
- `editable/page.tsx`
- `empty/page.tsx`
- `expanding/page.tsx`
- `filtering/page.tsx`
- `order-datatable/page.tsx`
- `pagination/page.tsx`
- `row-selection/page.tsx`
- `sorting/page.tsx`
- `sticky/page.tsx`
- `user-datatable/page.tsx`

### Widget Routes (`widgets/`)

- `banners/page.tsx`
- `cards/page.tsx`
- `charts/page.tsx`

### Theme Pages (`theme-pages/`)

- `account-settings/page.tsx`
- `apikey/page.tsx`
- `casl/page.tsx` - CASL permissions demo
- `faq/page.tsx`
- `inetegration/page.tsx`
- `pricing/page.tsx`

### Icons (`icons/`)

- `iconify/page.tsx` - Icon gallery

### Type Definitions (`types/`)

- `apps/` - TypeScript types for apps (ai-chat, blog, chat, contact, ecommerce, email, invoice, kanban, notes, ticket, userprofile, users)
- `auth/auth.ts` - Authentication types
- `layout/sidebar.ts` - Sidebar navigation types
- `ui-components/raw-imports.d.ts` - UI component import types

---

## Frontend Pages (`app/frontend-pages/`)

Public-facing marketing pages (separate layout from dashboard):

- **`layout.tsx`**: Marketing pages layout
- **`homepage/page.tsx`**: Main landing page
- **`about/page.tsx`**: About page
- **`contact/page.tsx`**: Contact page
- **`pricing/page.tsx`**: Pricing page
- **`portfolio/page.tsx`**: Portfolio showcase
- **`blog/`**: Blog pages
  - `post/page.tsx` - Blog list
  - `detail/[slug]/page.tsx` - Blog post detail
  - `post/page.tsx` - Create post

---

## Authentication Pages (`app/auth/`)

### Starterkit Auth Structure

```
auth/
├── auth1/                   # Auth variant 1
│   ├── login/
│   │   ├── page.tsx
│   │   └── loginAnimation.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── two-steps/page.tsx
│   └── LeftSidebarPart.tsx
├── auth2/                   # Auth variant 2
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── two-steps/page.tsx
├── authforms/               # Shared auth form components
│   ├── AuthLogin.tsx
│   ├── AuthRegister.tsx
│   ├── AuthForgotPassword.tsx
│   ├── AuthTwoSteps.tsx
│   └── SocialButtons.tsx
├── error/
│   ├── page.tsx
│   └── Animations.tsx
└── maintenance/
    ├── page.tsx
    └── MaintenanceAnimation.tsx
```

---

## API Routes (`app/api/`)

Demo API route handlers (TypeScript files) supporting:
- Blog operations
- Ticket management
- E-commerce endpoints
- User management
- Other app-specific APIs

---

## Shared Components (`components/`)

### UI Primitives (`components/ui/`)

Shadcn-style component library:

- `accordion.tsx`
- `alert.tsx`
- `avatar.tsx`
- `badge.tsx`
- `breadcrumb.tsx`
- `button.tsx`
- `calendar.tsx`
- `card.tsx`
- `carousel.tsx`
- `chart.tsx`
- `checkbox.tsx`
- `collapsible.tsx`
- `command.tsx`
- `dialog.tsx`
- `drawer.tsx`
- `dropdown-menu.tsx`
- `form.tsx`
- `input.tsx`
- `input-otp.tsx`
- `label.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `popover.tsx`
- `progress.tsx`
- `radio-group.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `skeleton.tsx`
- `slider.tsx`
- `spinner.tsx`
- `switch.tsx`
- `table.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `toast.tsx`
- `toaster.tsx`
- `tooltip.tsx`

### Theme Provider (`components/ThemeProvider.tsx`)

Global theme management wrapper

### Animated Components (`app/components/animated-components/`)

- `AnimatedInputPlaceholder.tsx`
- `AnimatedSlider.tsx`
- `AnimatedTable.tsx`
- `AnimatedTooltip.tsx`
- `CountUp.tsx`
- `FileUploadMotion.tsx`
- `ListAnimation.tsx`

### Shared Components (`app/components/shared/`)

- `CardBox.tsx`
- `OutlineCard.tsx`
- `RatingStars.tsx`
- `TitleBorderCard.tsx`
- `TitleIconCard.tsx`

---

## Hooks (`hooks/`)

- **`use-mobile.ts`**: Mobile/responsive detection hook
- **`use-toast.ts`**: Toast notification hook

---

## Utilities (`lib/`, `utils/`)

- **`lib/utils.ts`**: Shared utility functions (cn, class merging, etc.)
- **`utils/i18n.ts`**: Internationalization configuration
- **`utils/languages/`**: Locale JSON files
  - `en.json` - English
  - `ar.json` - Arabic
  - `ch.json` - Chinese
  - `fr.json` - French

---

## Key Dependencies (Main Package)

### Core Framework
- `next`: ^16.0.10
- `react`: 19.2.0
- `react-dom`: 19.2.0
- `typescript`: 5

### UI Component Libraries
- `@radix-ui/*`: Complete Radix UI component suite
- `@headlessui/react`: ^2.2.4
- `@tabler/icons-react`: 3.5.0
- `lucide-react`: ^0.511.0
- `@iconify/react`: 4.1.1

### Styling
- `tailwindcss`: ^4.1.6
- `@tailwindcss/postcss`: ^4.1.6
- `tailwind-merge`: ^3.3.0
- `next-themes`: ^0.4.6

### Forms & Validation
- `react-hook-form`: ^7.54.2
- `@hookform/resolvers`: ^3.10.0
- `zod`: ^3.24.1
- `class-variance-authority`: ^0.7.1

### Data Tables
- `@tanstack/react-table`: ^8.21.3

### Charts
- `apexcharts`: 3.49.1
- `react-apexcharts`: ^1.7.0
- `recharts`: ^2.15.4

### Rich Text Editor
- `@tiptap/*`: Complete Tiptap editor suite

### Drag & Drop
- `@dnd-kit/core`: ^6.3.1
- `@dnd-kit/sortable`: ^10.0.0
- `@hello-pangea/dnd`: ^18.0.1

### Animation
- `framer-motion`: ^12.12.1
- `aos`: ^2.3.4
- `lottie-react`: ^2.4.1

### Date/Time
- `date-fns`: ^4.1.0
- `moment`: 2.29.4
- `react-datepicker`: ^8.3.0
- `react-day-picker`: ^8.10.1

### Calendar
- `react-big-calendar`: ^1.18.0

### Carousels/Sliders
- `swiper`: ^11.2.7
- `embla-carousel-react`: ^8.6.0
- `react-slick`: ^0.30.3

### AI/ML
- `@google/generative-ai`: ^0.24.1
- `@google/genai`: ^1.13.0

### Permissions
- `@casl/ability`: 6.3.3
- `@casl/react`: 3.1.0

### Internationalization
- `i18next`: ^23.12.2
- `react-i18next`: ^15.0.0

### Utilities
- `lodash`: ^4.17.21
- `chance`: 1.1.11
- `uuid`: ^13.0.0
- `clsx`: ^2.1.1
- `cmdk`: ^1.1.1

### File Handling
- `react-dropzone`: ^14.3.8
- `html-to-image`: ^1.11.13
- `jspdf`: ^3.0.3
- `react-to-print`: ^3.1.1

### Other
- `simplebar-react`: 3.2.5 (custom scrollbars)
- `swr`: ^2.3.3 (data fetching)
- `react-toastify`: ^11.0.5
- `dompurify`: ^3.2.6
- `marked`: ^16.1.2
- `react-syntax-highlighter`: ^15.6.1
- `vaul`: ^1.1.2 (drawer component)
- `nextjs-toploader`: ^3.7.15

---

## How to Use

### Running a Package

1. Navigate to the package directory:
   ```bash
   cd Tailwindadmin-nextjs/packages/main
   # or packages/starterkit, packages/horizontal, etc.
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open browser:
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
npm run build
npm start
```

### Integrating into Your Project

#### Option 1: Use Layout Shell Only

1. Copy `app/(DashboardLayout)/layout/` to your project
2. Copy `app/css/` structure
3. Copy `components/ui/` components you need
4. Copy `components/ThemeProvider.tsx`
5. Adapt `layout.tsx` to your needs

#### Option 2: Use Specific Features

1. Copy specific app routes (e.g., `apps/blog/`)
2. Copy corresponding context (e.g., `context/blog-context/`)
3. Copy required components from `app/components/`
4. Install necessary dependencies

#### Option 3: Full Integration

1. Copy entire `packages/main/src/` structure
2. Install all dependencies
3. Customize to your needs
4. Remove unused demo pages

---

## Package Comparison Matrix

| Feature | main | starterkit | horizontal | minisidebar | dark | rtl | nextauth |
|---------|------|------------|------------|-------------|------|-----|----------|
| Dashboard Layouts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full App Suite | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| UI Component Demos | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chart Libraries | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Frontend Pages | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Horizontal Nav | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mini Sidebar | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Dark Theme Default | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| RTL Support | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| NextAuth Integration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Firebase Auth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Supabase Integration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## File Count Summary

- **Total Files**: ~7,600+ files across all packages
- **TypeScript/TSX Files**: ~5,100+ component files
- **SVG Files**: ~730+ icons/assets
- **Image Files**: ~670+ images
- **CSS Files**: ~45+ stylesheet files
- **Package Count**: 7 standalone applications

---

## Notes

1. **Each package is standalone** - Can be used independently
2. **Shared design system** - All packages use same Tailwind config and design tokens
3. **Modular structure** - Easy to extract specific features
4. **TypeScript throughout** - Full type safety
5. **App Router only** - Uses Next.js 13+ App Router (no Pages Router)
6. **Server Components** - Leverages React Server Components where appropriate
7. **Client Components** - Interactive components marked with `'use client'`

---

## Integration Recommendations

### For LeadMap Project Integration

1. **Start with `starterkit`** - Minimal overhead, core layout
2. **Extract layout components**:
   - `(DashboardLayout)/layout/vertical/sidebar/`
   - `(DashboardLayout)/layout/vertical/header/`
   - `(DashboardLayout)/layout/shared/`
3. **Copy UI components** from `components/ui/` as needed
4. **Adapt CSS** from `app/css/` to match your brand
5. **Use contexts** from `app/context/` for state management patterns

### Key Files to Review First

1. `packages/starterkit/src/app/(DashboardLayout)/layout.tsx` - Main layout wrapper
2. `packages/starterkit/src/app/(DashboardLayout)/layout/vertical/Sidebar.tsx` - Sidebar component
3. `packages/starterkit/src/app/(DashboardLayout)/layout/vertical/header/Header.tsx` - Header component
4. `packages/starterkit/src/app/css/globals.css` - Global styles
5. `packages/starterkit/src/components/ThemeProvider.tsx` - Theme management

---

## Version Information

- **Package Version**: 1.2.1
- **Next.js Version**: ^16.0.10
- **React Version**: 19.2.0
- **Tailwind CSS**: ^4.1.6
- **TypeScript**: 5

---

*Last Updated: Based on repository structure analysis*
