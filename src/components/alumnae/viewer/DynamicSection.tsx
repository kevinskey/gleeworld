import { DynamicItem } from './DynamicItem';

interface DynamicSectionProps {
  section: any;
}

export const DynamicSection = ({ section }: DynamicSectionProps) => {
  const bgStyle: React.CSSProperties = {
    backgroundColor: section.background_color || 'transparent',
    backgroundImage: section.background_image ? `url(${section.background_image})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: section.row_height || 'auto',
  };

  const renderItems = () => {
    // Group items by column_position
    const itemsByColumn: { [key: number]: any[] } = {};
    activeItems.forEach((item: any) => {
      const col = item.column_position || 1;
      if (!itemsByColumn[col]) itemsByColumn[col] = [];
      itemsByColumn[col].push(item);
    });

    // Render items in a flex container respecting width_percentage
    return (
      <div className="flex flex-wrap gap-6">
        {activeItems.map((item: any) => (
          <div key={item.id} style={{ width: `${item.width_percentage || 100}%`, minWidth: '300px' }}>
            <DynamicItem item={item} />
          </div>
        ))}
      </div>
    );
  };

  const items = section.alumnae_section_items || [];
  const activeItems = items.filter((item: any) => item.is_active);

  return (
    <section style={bgStyle} className="w-full py-12 px-4">
      <div className="container mx-auto">
        {section.title && (
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            {section.title}
          </h2>
        )}
        {renderItems()}
      </div>
    </section>
  );
};
