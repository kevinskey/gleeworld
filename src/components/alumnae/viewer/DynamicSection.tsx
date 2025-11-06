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

  const getGridClass = () => {
    switch (section.layout_type) {
      case 'two-column':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 'three-column':
        return 'grid grid-cols-1 md:grid-cols-3 gap-6';
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
      default:
        return 'flex flex-col gap-6';
    }
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
        <div className={getGridClass()}>
          {activeItems.map((item: any) => (
            <DynamicItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};
