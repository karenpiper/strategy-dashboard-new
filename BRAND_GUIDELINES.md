# Team Dashboard Brand Guidelines

Version 1.0 | Last Updated: November 2024

## Table of Contents
1. [Brand Philosophy](#brand-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Layout & Grid System](#layout--grid-system)
5. [Component Design](#component-design)
6. [Animations & Interactions](#animations--interactions)
7. [Iconography](#iconography)
8. [Accessibility](#accessibility)
9. [Usage Examples](#usage-examples)

---

## Brand Philosophy

### Core Principles
- **Bold & Energetic**: Everything should feel alive, confident, and dynamic
- **Highly Readable**: Ultra-bold typography ensures legibility at any size
- **Color-Coded Organization**: Each section has distinct color themes for instant recognition
- **Playful Professionalism**: Serious work doesn't require serious design
- **No Subtle**: If it can be bigger, bolder, or brighter—it should be

### Design Inspiration
Our design draws from modern digital product design with influences from sports branding, music festivals, and contemporary web aesthetics. Think Nike meets Spotify meets a really good conference.

---

## Color System

### Primary Brand Colors

#### Core Colors
\`\`\`css
Navy:           #0A2540 (primary brand color)
Purple:         #6B1B7E (recognition & culture)
Turquoise:      #00D9FF (global/team features)
Electric Blue:  #0091FF (weather, video)
Electric Orange:#FF5722 (high-energy actions)
Coral:          #FF6B6B (wins, celebrations)
Green:          #00E5A0 (work/pipeline)
Yellow:         #FFD600 (primary accent)
Black:          #0D0D0D (backgrounds, text)
Beige:          #EAE4D6 (light backgrounds)
White:          #FFFFFF (cards, contrast)
\`\`\`

#### Extended Palette
\`\`\`css
Navy Light:     #1E4D6B
Navy Alt:       #14324A
Purple Light:   #8B2DAE
Turquoise Alt:  #33E3FF
Orange Alt:     #FF6035
Orange Secondary:#FF7849
Coral Light:    #FF8585
Yellow Neon:    #FFEB00
Yellow Soft:    #FFF176
Indigo:         #4F46E5
Violet:         #7C3AED
\`\`\`

### Color Pairings by Section

Each section of the dashboard uses intentional color pairings:

| Section | Primary Color | Accent Color | Background |
|---------|--------------|--------------|------------|
| Hero/Ready | Yellow | Orange/Coral | Gradient |
| Quick Actions | Purple | Yellow | Solid |
| Horoscope | Purple (#4A0E5A) | Yellow/Green | Gradient |
| Weather | Electric Blue | Turquoise | Gradient |
| Time Zones | Black | Turquoise | Solid + Border |
| Events | Black | Green | Solid + Border |
| Pipeline | Green | Black | Solid |
| Who Needs What | Yellow | Black | Solid |
| Playlist | Orange | Black | Solid |
| Friday Drop | Turquoise | Black | Solid |
| Featured | Coral/Pink | Black | Gradient |
| Stats | White | Black | Solid |
| Snaps | Black | Purple/Yellow | Solid + Border |
| Beast Babe | Coral | Yellow | Gradient |
| Wins Wall | White | Orange | Solid |
| Must Reads | Pink (#E56DB1) | Black | Gradient |
| Ask the Hive | Violet (#9B7EDE) | Black | Gradient |
| Team Pulse | White | Yellow/Orange | Solid |
| Loom/Watch | Electric Blue | Yellow | Gradient |
| Inspiration War | Yellow | Black | Solid |
| Categories | White | Multi-color | Solid |
| Search | Black | Yellow | Solid + Border |

### Color Usage Rules

**DO:**
- Use high contrast combinations (black on yellow, white on black)
- Apply gradients for hero sections and featured cards
- Use borders to separate content (typically 4px thick)
- Apply section colors consistently across related features
- Use semi-transparent overlays for depth (e.g., `bg-black/30`)

**DON'T:**
- Mix too many colors in a single card (max 3)
- Use low-contrast combinations
- Apply gradients everywhere (reserve for key sections)
- Deviate from established section color schemes
- Use colors at less than 20% opacity for functional elements

---

## Typography

### Font Family
\`\`\`css
Primary: 'Raleway'
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: 'Geist Mono' (code/technical content)
\`\`\`

### Type Scale

#### Display (Hero Headlines)
\`\`\`css
Font Size: clamp(3rem, 8vw + 1rem, 10rem)
Font Weight: 900 (Black)
Line Height: 0.85
Letter Spacing: -0.02em
Use Case: Main hero headlines, "READY!" text
\`\`\`

#### Headline (Section Titles)
\`\`\`css
Font Size: clamp(2rem, 5vw + 0.5rem, 6rem)
Font Weight: 900 (Black)
Line Height: 0.85
Letter Spacing: -0.01em
Use Case: Card titles, main navigation
\`\`\`

#### Subheadline (Card Headers)
\`\`\`css
Font Size: clamp(1.75rem, 4vw, 3rem)
Font Weight: 900 (Black)
Line Height: 0.9
Letter Spacing: 0
Use Case: Card headers, secondary sections
\`\`\`

#### Body Large
\`\`\`css
Font Size: clamp(1.25rem, 3vw + 0.5rem, 2.5rem)
Font Weight: 700 (Bold)
Line Height: 1.2
Use Case: Subtitles, supporting hero text
\`\`\`

#### Body Regular
\`\`\`css
Font Size: 1rem (16px)
Font Weight: 500 (Medium)
Line Height: 1.5
Use Case: Card content, descriptions
\`\`\`

#### Label/Small
\`\`\`css
Font Size: 0.75rem (12px)
Font Weight: 900 (Black)
Line Height: 1.2
Letter Spacing: 0.2em
Text Transform: Uppercase
Use Case: Badges, labels, tags
\`\`\`

### Typography Rules

**DO:**
- Use all caps for labels, badges, and section headers
- Apply ultra-bold weights (900) for all headlines
- Use tight line-height (0.85-0.9) for large text
- Scale typography responsively with clamp()
- Break long headlines across multiple lines

**DON'T:**
- Use font weights below 500 for any UI text
- Apply sentence case to labels or badges
- Exceed 2 lines for card headers
- Use decorative fonts
- Scale linearly without clamp()

---

## Layout & Grid System

### Container System
\`\`\`css
Max Width: 2000px
Horizontal Padding: 
  - Mobile: 1rem (16px)
  - Tablet: 1.5rem (24px)
  - Desktop: 2rem (32px)
\`\`\`

### Grid Layouts

#### Main Dashboard Grid
\`\`\`css
Mobile: 1 column
Tablet: 2 columns
Desktop: 3-4 columns
Gap: 1.5rem (24px) mobile, 2rem (32px) desktop
\`\`\`

#### Common Grid Patterns
- **Full Width**: 1 column span (e.g., Hero)
- **Two-Thirds**: 2 of 3 columns (e.g., Snaps, Loom)
- **Half**: 2 of 4 columns (e.g., Featured, Pipeline)
- **Third**: 1 of 3 columns (all standard cards)
- **Quarter**: 1 of 4 columns (compact items)

### Spacing Scale
\`\`\`css
--space-1: 0.25rem  (4px)   - Tight elements
--space-2: 0.5rem   (8px)   - Icon spacing
--space-3: 0.75rem  (12px)  - Small gaps
--space-4: 1rem     (16px)  - Standard padding
--space-5: 1.5rem   (24px)  - Card padding (mobile)
--space-6: 2rem     (32px)  - Card padding (desktop)
--space-8: 2.5rem   (40px)  - Large padding
--space-10: 3rem    (48px)  - Section spacing
--space-12: 4rem    (64px)  - Major section breaks
\`\`\`

### Border Radius
\`\`\`css
Small:   0.75rem  (12px)  - Small buttons
Medium:  1rem     (16px)  - Standard buttons
Large:   1.5rem   (24px)  - Small cards
XL:      2rem     (32px)  - Standard elements
2XL:     2.5rem   (40px)  - Large cards
Full:    9999px           - Pills/badges
\`\`\`

### Border Widths
\`\`\`css
Thin:    2px  - Subtle borders
Medium:  3px  - Standard borders  
Thick:   4px  - Primary card borders
Bold:    6px  - Emphasis borders
\`\`\`

---

## Component Design

### Card Anatomy

#### Standard Card Structure
\`\`\`
┌─────────────────────────────────┐
│ [Icon] Label (12px, UPPERCASE)  │  <- Badge/Label
│                                  │
│ CARD TITLE                       │  <- Headline (responsive)
│                                  │
│ ┌─────────────────────────────┐ │
│ │ Content Area                 │ │  <- Main content
│ │                              │ │
│ └─────────────────────────────┘ │
│                                  │
│ [CTA Button]                     │  <- Optional action
└─────────────────────────────────┘
\`\`\`

#### Card Variants

**Solid Color Card**
- Single background color
- White or black text for contrast
- Optional thick border (4px)
- Rounded corners (40px)

**Gradient Card**
- 2-3 color gradient (brand colors)
- Always black text on light gradients
- Always white text on dark gradients
- No border (gradient is the feature)

**Bordered Card**
- Black background
- Thick colored border (4px)
- Matches section accent color
- Used for emphasis

### Buttons

#### Primary Button
\`\`\`css
Background: Black
Text Color: Brand Yellow (#FFD600)
Padding: 1rem 2rem
Font Weight: 900
Text Transform: Uppercase
Border Radius: 9999px (full pill)
Hover: scale(1.05)
\`\`\`

#### Secondary Button
\`\`\`css
Background: Section accent color
Text Color: White or Black (contrast dependent)
Padding: 1rem 2rem
Font Weight: 900
Text Transform: Uppercase
Border Radius: 9999px
Hover: scale(1.05)
\`\`\`

#### Ghost Button
\`\`\`css
Background: Transparent
Border: 2px solid current color
Text Color: Inherits
Padding: 0.75rem 1.5rem
Font Weight: 700
Hover: Background fills with color
\`\`\`

### Badges & Labels
\`\`\`css
Display: inline-block
Background: Black or section color
Padding: 0.5rem 1rem
Border Radius: 9999px
Font Size: 0.75rem
Font Weight: 900
Text Transform: Uppercase
Letter Spacing: 0.2em
\`\`\`

### Input Fields
\`\`\`css
Height: 3rem (48px) standard, 4rem (64px) hero
Background: White/10 with backdrop blur
Border: 2px solid White/20
Border Radius: 9999px (full pill)
Padding: 0 1.5rem
Font Weight: 700
Color: White
Placeholder: White/40
\`\`\`

---

## Animations & Interactions

### Keyframe Animations

#### Slide Up (Entry)
\`\`\`css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

Duration: 0.6s
Easing: ease-out
Use: Card entry animations
\`\`\`

#### Pulse Glow (Attention)
\`\`\`css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 214, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 214, 0, 0.6);
  }
}

Duration: 2s
Easing: ease-in-out
Loop: infinite
Use: Important elements, Beast Babe trophy
\`\`\`

#### Float (Playful)
\`\`\`css
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

Duration: 3s
Easing: ease-in-out
Loop: infinite
Use: Icons, decorative elements
\`\`\`

### Hover States

#### Cards
\`\`\`css
Transform: scale(1.05)
Transition: all 0.3s ease
Shadow: May increase glow
\`\`\`

#### Buttons
\`\`\`css
Transform: scale(1.05) or scale(1.1)
Transition: all 0.2s ease
Brightness: May increase 110%
Shadow: May add glow effect
\`\`\`

#### Links/Navigation
\`\`\`css
Color: Transition to accent (brand-yellow)
Transition: color 0.2s ease
Border: May animate underline
\`\`\`

### Transition Guidelines

**Fast (100-200ms)**: Button clicks, toggles
**Medium (200-300ms)**: Hover states, color changes
**Slow (300-600ms)**: Card entries, layout shifts

**Easing Functions**:
- `ease-out`: Element entry, scale up
- `ease-in`: Element exit, scale down  
- `ease-in-out`: Continuous animations (float, pulse)
- `ease`: General purpose

---

## Iconography

### Icon System
**Library**: Lucide React
**Sizes**: 16px, 20px, 24px (standard), 32px, 48px (hero)
**Stroke Width**: 2px (default)
**Style**: Outlined, consistent weight

### Common Icons by Context
- **Calendar/Time**: `Calendar`, `Clock`
- **Communication**: `MessageCircle`, `Users`
- **Media**: `Music`, `Video`, `Play`
- **Actions**: `Zap`, `ArrowRight`, `ChevronRight`
- **Recognition**: `Trophy`, `Star`, `Sparkles`
- **Work**: `FileText`, `CheckCircle`, `TrendingUp`
- **Search**: `Search`, `Lightbulb`

### Icon Usage Rules

**DO:**
- Use icons at 20px or 24px for cards
- Pair icons with labels for clarity
- Color icons to match section theme
- Contain icons in rounded squares (1rem radius)
- Keep icons consistent in a group

**DON'T:**
- Use emoji as primary icons
- Mix icon styles/libraries
- Use decorative icons without purpose
- Scale icons non-proportionally
- Use icons smaller than 16px

---

## Accessibility

### Color Contrast
All color combinations meet WCAG AA standards (4.5:1 for text):

**High Contrast Pairings**:
- Black text on Yellow (#FFD600) ✓
- White text on Black (#0D0D0D) ✓
- White text on Navy (#0A2540) ✓
- White text on Purple (#6B1B7E) ✓
- Black text on White (#FFFFFF) ✓
- Black text on Turquoise (#00D9FF) ✓
- Black text on Pink (#E56DB1) ✓

### Typography Accessibility
- Minimum font size: 14px (0.875rem) for body text
- Line height: 1.5 minimum for readability
- Letter spacing: Proper tracking for all-caps text
- Responsive scaling: All text scales with viewport

### Interactive Elements
- Minimum touch target: 44x44px (mobile)
- Clear focus states on all interactive elements
- Keyboard navigation support
- Screen reader friendly labels

### Motion
- Respect `prefers-reduced-motion` for animations
- Provide static alternatives for critical content
- Keep animations under 600ms for entry/exit

---

## Usage Examples

### Building a New Card

\`\`\`tsx
// Standard section card with all brand elements
<div className="bg-brand-electric-orange p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
  {/* Badge/Label */}
  <div className="flex items-center gap-3 mb-4">
    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
      <Icon className="w-6 h-6 text-brand-electric-orange" />
    </div>
    <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">
      Label Text
    </span>
  </div>
  
  {/* Card Title */}
  <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">
    CARD<br/>TITLE
  </h3>
  
  {/* Content Area */}
  <div className="space-y-4 mb-6">
    {/* Your content here */}
  </div>
  
  {/* CTA Button */}
  <button className="w-full bg-black text-brand-electric-orange py-4 rounded-full text-base font-black hover:scale-105 transition-all uppercase">
    Action Text →
  </button>
</div>
\`\`\`

### Color Section Header

\`\`\`tsx
// Gradient line separator with section title
<section>
  <div className="flex items-center gap-4 mb-8">
    <div className="h-2 bg-gradient-to-r from-brand-green via-brand-orange to-brand-yellow rounded-full flex-1"></div>
  </div>
  <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">
    Section Name
  </h2>
  
  {/* Section content */}
</section>
\`\`\`

### Responsive Grid

\`\`\`tsx
// Standard 3-4 column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
  {/* Cards */}
</div>

// With spanning elements
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
  <div className="lg:col-span-2">
    {/* 2-column card */}
  </div>
  <div>
    {/* 1-column card */}
  </div>
</div>
\`\`\`

---

## Quick Reference

### Most Used Classes
\`\`\`css
/* Card Base */
.card-base: rounded-[40px] p-8 md:p-10 hover:scale-105 transition-all duration-300

/* Typography */
.display: text-[clamp(3rem,8vw+1rem,10rem)] leading-[0.85] font-black
.headline: text-[clamp(2rem,5vw+0.5rem,6rem)] leading-[0.85] font-black
.subheadline: text-[clamp(1.75rem,4vw,3rem)] leading-[0.9] font-black

/* Buttons */
.btn-primary: bg-black text-brand-yellow py-4 px-8 rounded-full font-black uppercase
.btn-secondary: bg-{section-color} text-white py-4 px-8 rounded-full font-black uppercase

/* Badges */
.badge: bg-black px-4 py-2 rounded-full text-xs font-black tracking-[0.2em] uppercase
\`\`\`

### Color Variables (Tailwind)
\`\`\`
bg-brand-navy
bg-brand-purple
bg-brand-turquoise
bg-brand-electric-blue
bg-brand-electric-orange
bg-brand-coral
bg-brand-green
bg-brand-yellow
bg-brand-black
bg-brand-white
\`\`\`

---

## Version History

**v1.0** - November 2024
- Initial brand guidelines
- Complete color system with section pairings
- Responsive typography scale
- Animation and interaction patterns
- Component specifications
- Accessibility standards

---

## Contact & Support

For questions about these brand guidelines or design system usage:
- Review the codebase in `app/globals.css` for all design tokens
- Check `app/page.tsx` for implementation examples
- All color variables are defined in CSS custom properties

**Remember**: When in doubt, make it bolder. 💪
