
import { notFound } from 'next/navigation';
import { getStyleById } from '@/lib/styles-sqlite';
import { DesignerWorkspace } from '@/components/designer/designer-workspace';

export const dynamic = 'force-dynamic';

export default async function StyleWorkspacePage({ params }: { params: { id: string } }) {
  if (params.id === 'new') {
    return <DesignerWorkspace isNew={true} />;
  }

  const style = await getStyleById(params.id);
  
  if (!style) {
    notFound();
  }

  return <DesignerWorkspace style={style} />;
}
