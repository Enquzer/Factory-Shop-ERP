# Responsive Design Guide for Carement ERP

This guide explains how the responsive design system works in the Carement ERP application and how to use the responsive components.

## Device Detection

The application uses a comprehensive device detection system that categorizes devices into:

- Mobile (≤ 480px)
- Tablet (481px - 768px)
- Desktop (769px - 1024px)
- Large Desktop (> 1024px)

## Responsive Components

### 1. Responsive Context

The responsive context provides device information throughout the application:

```tsx
import { useResponsive } from '@/contexts/responsive-context';

function MyComponent() {
  const { 
    isMobile, 
    isTablet, 
    isDesktop, 
    isLargeDesktop,
    deviceType 
  } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileContent />}
      {isTablet && <TabletContent />}
      {isDesktop && <DesktopContent />}
    </div>
  );
}
```

### 2. Responsive Utility Components

#### Conditional Rendering
```tsx
import { MobileOnly, TabletOnly, DesktopOnly } from '@/components/responsive';

function MyComponent() {
  return (
    <div>
      <MobileOnly>
        <MobileSpecificContent />
      </MobileOnly>
      
      <TabletOnly>
        <TabletSpecificContent />
      </TabletOnly>
      
      <DesktopOnly>
        <DesktopSpecificContent />
      </DesktopOnly>
    </div>
  );
}
```

#### Hide on Specific Devices
```tsx
import { HideOnMobile, HideOnTablet } from '@/components/responsive';

function MyComponent() {
  return (
    <div>
      <HideOnMobile>
        <ContentHiddenOnMobile />
      </HideOnMobile>
      
      <HideOnTablet>
        <ContentHiddenOnTablet />
      </HideOnTablet>
    </div>
  );
}
```

### 3. Responsive Grid

The responsive grid automatically adjusts columns based on device size:

```tsx
import { ResponsiveGrid, ResponsiveGridItem } from '@/components/responsive-grid';

function MyComponent() {
  return (
    <ResponsiveGrid 
      mobileCols={1} 
      tabletCols={2} 
      desktopCols={3}
      gap={4}
    >
      <ResponsiveGridItem>
        <Card>Content 1</Card>
      </ResponsiveGridItem>
      <ResponsiveGridItem>
        <Card>Content 2</Card>
      </ResponsiveGridItem>
      <ResponsiveGridItem>
        <Card>Content 3</Card>
      </ResponsiveGridItem>
    </ResponsiveGrid>
  );
}
```

### 4. Responsive Table

The responsive table automatically switches to a mobile-friendly stacked layout on smaller screens:

```tsx
import { ResponsiveTable } from '@/components/responsive-table';

function MyComponent() {
  const headers = [
    { key: 'name', title: 'Product Name', mobileTitle: 'Name' },
    { key: 'price', title: 'Price (ETB)', mobileTitle: 'Price' },
    { key: 'stock', title: 'Stock Level', mobileTitle: 'Stock' }
  ];

  const data = [
    { id: 1, name: 'Product A', price: 100, stock: 50 },
    { id: 2, name: 'Product B', price: 200, stock: 30 }
  ];

  return (
    <ResponsiveTable 
      headers={headers}
      data={data}
      collapsible={true}
    />
  );
}
```

### 5. Responsive Form

The responsive form automatically adjusts layout based on device:

```tsx
import { ResponsiveForm, ResponsiveFormItem, ResponsiveFormGrid } from '@/components/responsive-form';

function MyComponent() {
  return (
    <ResponsiveForm>
      <ResponsiveFormItem label="Product Name">
        <Input placeholder="Enter product name" />
      </ResponsiveFormItem>
      
      <ResponsiveFormGrid columns={2}>
        <ResponsiveFormItem label="Price">
          <Input type="number" placeholder="Enter price" />
        </ResponsiveFormItem>
        <ResponsiveFormItem label="Stock">
          <Input type="number" placeholder="Enter stock level" />
        </ResponsiveFormItem>
      </ResponsiveFormGrid>
    </ResponsiveForm>
  );
}
```

### 6. Responsive Card

The responsive card adjusts padding and typography for different devices:

```tsx
import { ResponsiveCard, ResponsiveCardGrid } from '@/components/responsive-card';

function MyComponent() {
  return (
    <ResponsiveCardGrid columns={3}>
      <ResponsiveCard 
        title="Dashboard Metrics"
        description="Key performance indicators"
      >
        <div>Card content here</div>
      </ResponsiveCard>
      
      <ResponsiveCard 
        title="Recent Orders"
        description="Latest customer orders"
      >
        <div>Card content here</div>
      </ResponsiveCard>
    </ResponsiveCardGrid>
  );
}
```

## Best Practices

1. **Use semantic breakpoints**: Always use the predefined breakpoints rather than custom ones
2. **Test on real devices**: Use browser dev tools to test on various screen sizes
3. **Prioritize content**: Important content should be visible on all devices
4. **Touch-friendly controls**: Ensure buttons and interactive elements are large enough for touch
5. **Performance**: Avoid heavy components on mobile devices

## Implementation Checklist

When creating new components, ensure they are responsive by:

- [ ] Using the responsive context for device detection
- [ ] Implementing different layouts for mobile and desktop
- [ ] Testing on various screen sizes
- [ ] Ensuring touch targets are appropriately sized
- [ ] Optimizing images and assets for different devices
- [ ] Using responsive utility components where appropriate

## Common Patterns

### Mobile-First Approach
Always design for mobile first, then enhance for larger screens:

```tsx
// Good: Mobile-first approach
function MyComponent() {
  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-1/3">Sidebar</div>
      <div className="w-full md:w-2/3">Main Content</div>
    </div>
  );
}
```

### Conditional Class Names
Use the `cn` utility for conditional styling:

```tsx
import { cn } from '@/lib/utils';
import { useResponsive } from '@/contexts/responsive-context';

function MyComponent() {
  const { isMobile } = useResponsive();
  
  return (
    <div className={cn(
      "p-4",
      isMobile && "p-2 text-sm",
      !isMobile && "p-6 text-lg"
    )}>
      Responsive content
    </div>
  );
}
```