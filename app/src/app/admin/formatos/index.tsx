import { TagManagerScreen } from '@/components/TagManagerScreen';
import { formatosHooks } from '@/hooks/useCatalogo';

export default function AdminFormatosScreen() {
  return <TagManagerScreen title="Formatos" singular="formato" hooks={formatosHooks} />;
}
