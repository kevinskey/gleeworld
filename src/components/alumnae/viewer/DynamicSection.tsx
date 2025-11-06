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
    return (
      <div className="grid grid-cols-12 gap-6">
        {activeItems.map((item: any) => {
          const span = Math.max(1, Math.min(12, Math.round(((item.width_percentage || 100) / 100) * 12)));
          return (
            <div key={item.id} style={{ gridColumn: `span ${span} / span ${span}` }}>
              <DynamicItem item={item} />
            </div>
          );
        })}
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
