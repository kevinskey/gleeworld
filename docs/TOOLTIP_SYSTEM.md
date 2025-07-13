# Tooltip System Documentation

## Overview

The application features a comprehensive tooltip system that provides context-aware help text for buttons, icons, and input elements across the entire application.

## Features

- **Global Toggle**: Users can enable/disable tooltips system-wide via Settings > Accessibility
- **Customizable Delay**: Adjust tooltip appearance delay (0-1000ms)
- **Mobile Support**: Touch-and-hold support for mobile devices (500ms hold)
- **Character Limit**: Automatic truncation at 50 characters with "..." indicator
- **Responsive Design**: Styled with semantic design tokens and dark/light mode support
- **Performance**: Lightweight implementation using Tippy.js

## Components

### Enhanced Tooltip
Primary tooltip component with full customization options:

```tsx
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";

<EnhancedTooltip content="Add new user to system" placement="top">
  <Button>Add User</Button>
</EnhancedTooltip>
```

### Simple Title Tooltip
Lightweight component using native HTML title attribute:

```tsx
import { SimpleTitleTooltip } from "@/components/ui/enhanced-tooltip";

<SimpleTitleTooltip title="Settings menu">
  <Settings className="h-4 w-4" />
</SimpleTitleTooltip>
```

### Higher-Order Component
Wrap any component with tooltip functionality:

```tsx
import { withTooltip } from "@/components/ui/enhanced-tooltip";

const TooltipButton = withTooltip(Button, "Save changes", { placement: "bottom" });
```

## Usage Guidelines

### Content Guidelines
- Keep descriptions under 50 characters
- Use active voice ("Add user" not "Allows adding users")
- Be specific and contextual
- Avoid redundant information

### Placement Guidelines
- **Top**: Default for most elements
- **Bottom**: For elements near top of viewport
- **Left/Right**: For elements with limited vertical space
- **Auto**: Let system choose optimal placement

## Implementation Examples

### System Dashboard
```tsx
// Button with tooltip
<EnhancedTooltip content="Add new user to system">
  <Button onClick={handleAddUser}>
    <UserPlus className="h-4 w-4" />
    Add User
  </Button>
</EnhancedTooltip>

// Icon with tooltip
<EnhancedTooltip content="System administration tools">
  <Calculator className="h-5 w-5" />
</EnhancedTooltip>
```

### Form Inputs
```tsx
<EnhancedTooltip content="Enter user's email address">
  <Input 
    type="email" 
    placeholder="user@example.com"
    {...field}
  />
</EnhancedTooltip>
```

## Settings Management

### User Preferences
- Stored in `user_preferences` table in Supabase
- Automatic creation for new users
- Real-time updates across components

### Context Hook
```tsx
import { useTooltipContext } from "@/contexts/TooltipContext";

const { enabled, delay, toggleTooltips, updateDelay } = useTooltipContext();
```

## Styling

### CSS Classes
Custom tooltip theme using design system tokens:
- Background: `hsl(var(--popover))`
- Text: `hsl(var(--popover-foreground))`
- Border: `hsl(var(--border))`
- Shadow: Subtle elevation with opacity
- Max Width: 250px with word wrap

### Dark Mode
Automatic adaptation to user's theme preference using CSS media queries.

## Performance Considerations

- Tooltips only render when globally enabled
- Lazy initialization of Tippy.js instances
- Efficient context updates with minimal re-renders
- Database preferences cached in memory

## Mobile Optimization

- Touch-and-hold gesture support (500ms)
- Appropriate sizing for touch targets
- Automatic dismissal on scroll
- No hover states on mobile devices

## Accessibility

- ARIA-compliant tooltip implementation
- Keyboard navigation support
- High contrast mode compatibility
- Screen reader friendly content
- User preference respect (disabled state)

## Best Practices

1. **Progressive Enhancement**: Components work without tooltips
2. **Content Quality**: Clear, concise, and helpful descriptions
3. **Performance**: Use SimpleTitleTooltip for basic cases
4. **Consistency**: Follow established patterns across components
5. **Testing**: Verify tooltip behavior on all devices

## Future Enhancements

- Rich content tooltips (HTML support)
- Keyboard shortcuts display
- Multi-language support
- Custom themes per user role
- Analytics tracking for tooltip usage