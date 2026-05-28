import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CopySimple, DownloadSimple, Trash, LinkSimple, Check, SpinnerGap } from 'phosphor-react';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import logoSvg from '../../Imagens/Vetores/Logo.svg';

interface LinkItem {
  id: string;
  originalUrl: ReactNode;
  code: string;
  clicks: number;
  createdAt: string;
}

interface LinksResponse {
  items: LinkItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const CODE_REGEX = /^[a-zA-Z0-9-_]+$/;

function normalizeOptionalCode(code?: string): string | undefined {
  const trimmedCode = code?.trim();

  return trimmedCode ? trimmedCode : undefined;
}

function normalizeErrorMessage(message: string): string {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const linkFormSchema = z.object({
  originalUrl: z
    .string()
    .trim()
    .min(1, 'Insira uma URL válida')
    .transform((url) => {
      if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
      }

      return url;
    })
    .refine((url) => {
      try {
        const parsed = new URL(url);

        const validProtocol =
          parsed.protocol === 'http:' ||
          parsed.protocol === 'https:';

        const validHostname =
          parsed.hostname.includes('.') &&
          parsed.hostname.length > 3;

        return validProtocol && validHostname;
      } catch {
        return false;
      }
    }, {
      message: 'Insira uma URL válida',
    }),

  code: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || CODE_REGEX.test(val), {
      message:
        'Use apenas letras, números, hífens e underlines',
    }),
});

type LinkFormData = z.infer<typeof linkFormSchema>;

export function Home() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3333';
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LinkFormData>({
    resolver: zodResolver(linkFormSchema),
    mode: 'onChange',
  });

  const { data, isLoading, isError } = useQuery<LinksResponse>({
    queryKey: ['links', currentPage],
    queryFn: async () => {
      const res = await fetch(`${backendUrl}/links?page=${currentPage}&limit=5`);
      if (!res.ok) {
        throw new Error('Erro ao carregar links');
      }
      return res.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const createLinkMutation = useMutation({
    mutationFn: async (formData: LinkFormData) => {
      const payload = {
        originalUrl: formData.originalUrl,
        code: normalizeOptionalCode(formData.code),
      };

      const res = await fetch(`${backendUrl}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || 'Erro ao criar link');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      reset();
    },
    onError: (error: any) => {
      const message = error.message || 'Erro ao criar link';
      const normalizedMessage = normalizeErrorMessage(message);

      if (
        normalizedMessage.includes('link encurtado ja existente') ||
        normalizedMessage.includes('url encurtada ja existente')
      ) {
        setError('code', {
          type: 'manual',
          message: 'Link encurtado já existente',
        });
      } else if (
        normalizedMessage.includes('link encurtado invalido') ||
        normalizedMessage.includes('url encurtada invalida')
      ) {
        setError('code', {
          type: 'manual',
          message: 'Use apenas letras, números, hífens e underlines',
        });
      } else if (normalizedMessage.includes('url original invalida')) {
        setError('originalUrl', {
          type: 'manual',
          message: 'Insira uma URL válida',
        });
      } else {
        alert(message);
      }
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${backendUrl}/links/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Erro ao deletar link');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
    onError: (error: any) => {
      alert(error.message);
    },
  });

  const onSubmit = (formData: LinkFormData) => {
    createLinkMutation.mutate(formData);
  };

  const handleCopy = (id: string, code: string) => {
    const fullUrl = `${frontendUrl}/${code}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${backendUrl}/links/export`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Falha ao exportar CSV');
      }

      const result = await res.json();
      window.open(result.url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar arquivo');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 lg:mb-12 flex justify-start select-none text-brand-blue">
          <img
            src={logoSvg}
            alt="brev.ly"
            className="h-10 w-auto"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl bg-brand-card p-6 shadow-sm border border-brand-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary mb-6">Novo link</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="LINK ORIGINAL"
                  type="text"
                  placeholder="www.exemplo.com.br"
                  {...register('originalUrl')}
                  error={errors.originalUrl?.message}
                />

                <Input
                  label="LINK ENCURTADO"
                  type="text"
                  prefix="brev.ly/"
                  placeholder="" 
                  {...register('code')}
                  error={errors.code?.message}
                />

                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="mt-4 w-full"
                  variant="primary"
                  size="md"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap className="animate-spin h-5 w-5 text-white" weight="bold" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar link'
                  )}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-brand-card p-6 shadow-sm border border-brand-gray-200 flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-brand-text-primary">Meus links</h2>
                <Button
                  onClick={handleExportCSV}
                  disabled={exporting || (data?.items.length ?? 0) === 0}
                  className="inline-flex"
                  variant="secondary"
                  size="sm"
                  icon={exporting ? <SpinnerGap className="animate-spin h-3.5 w-3.5" weight="bold" /> : <DownloadSimple className="h-3.5 w-3.5" weight="bold" />}
                  iconPosition="left"
                >
                  {exporting ? 'Processando...' : 'Baixar CSV'}
                </Button>
              </div>

              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between py-4 border-b border-brand-gray-200">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-brand-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-brand-gray-100 rounded w-2/3"></div>
                      </div>
                      <div className="h-6 bg-brand-gray-100 rounded w-16 mx-4"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-brand-gray-100 rounded-lg"></div>
                        <div className="h-8 w-8 bg-brand-gray-100 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-brand-feedback-danger font-medium">Erro ao carregar links. Verifique sua conexão com o servidor.</span>
                </div>
              )}

              {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gray-100 text-brand-text-muted mb-4 border border-brand-gray-200">
                    <LinkSimple className="h-6 w-6" weight="bold" />
                  </div>
                  <span className="text-xs font-semibold text-brand-text-secondary tracking-widest uppercase">
                    AINDA NÃO EXISTEM LINKS CADASTRADOS
                  </span>
                </div>
              )}

              {!isLoading && !isError && (data?.items.length ?? 0) > 0 && (
                <div className="divide-y divide-brand-gray-200">
                  {data?.items.map((link) => (
                    <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <a
                          href={`/${link.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm font-semibold text-brand-blue hover:underline break-all"
                        >
                          brev.ly/{link.code}
                        </a>
                        <span className="block text-xs text-brand-text-secondary mt-1 truncate max-w-sm md:max-w-md">
                          {link.originalUrl}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-xs text-brand-text-secondary whitespace-nowrap bg-brand-gray-100 px-2.5 py-1 rounded-full border border-brand-gray-200">
                          {link.clicks} {link.clicks === 1 ? 'acesso' : 'acessos'}
                        </span>
                        
                        <div className="flex items-center gap-2">
<IconButton
                          onClick={() => handleCopy(link.id, link.code)}
                          label={copiedId === link.id ? 'Link copiado' : 'Copiar link'}
                          icon={copiedId === link.id ? <Check className="h-4 w-4" weight="bold" /> : <CopySimple className="h-4 w-4" weight="bold" />}
                          className={copiedId === link.id ? 'border-green-200 bg-green-50' : ''}
                        />

                          <IconButton
                            onClick={() => {
                              if (confirm('Tem certeza de que deseja deletar este link?')) {
                                deleteLinkMutation.mutate(link.id);
                              }
                            }}
                            title="Deletar link"
                            label="Deletar link"
                            variant="danger"
                            icon={<Trash className="h-4 w-4" weight="bold" />}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isLoading && !isError && data && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-brand-gray-200 pt-4 mt-4">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  variant="secondary"
                  size="sm"
                >
                  Anterior
                </Button>
                <span className="text-xs text-brand-text-secondary font-medium">
                  Página {data.meta.page} de {data.meta.totalPages}
                </span>
                <Button
                  disabled={currentPage === data.meta.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(data.meta.totalPages, prev + 1))}
                  variant="secondary"
                  size="sm"
                >
                  Próximo
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
