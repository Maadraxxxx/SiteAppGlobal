import { TagManagerScreen } from '@/components/TagManagerScreen';
import { estilosHooks } from '@/hooks/useCatalogo';

export default function AdminEstilosScreen() {
  return <TagManagerScreen title="Estilos" singular="estilo" hooks={estilosHooks} />;
}
