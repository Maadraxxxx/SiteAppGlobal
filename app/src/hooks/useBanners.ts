import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bannersApi } from '@/api/banners';

export function useBanners() {
  return useQuery({ queryKey: ['banners'], queryFn: () => bannersApi.list() });
}

export function useAdminBanners() {
  return useQuery({ queryKey: ['admin-banners'], queryFn: () => bannersApi.adminList() });
}

function useInvalidateBanners() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['banners'] });
    qc.invalidateQueries({ queryKey: ['admin-banners'] });
  };
}

export function useCreateBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: (imagemUrl: string) => bannersApi.create(imagemUrl),
    onSuccess: invalidate,
  });
}

export function useRemoveBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: (id: string) => bannersApi.remove(id),
    onSuccess: invalidate,
  });
}
